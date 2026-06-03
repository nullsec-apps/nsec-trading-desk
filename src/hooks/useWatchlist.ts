import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, subscribeToTable } from '../lib/supabase';
import { TABLES } from '../lib/constants';

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  display_name: string | null;
  binance_pair: string; // e.g. BTCUSDT
  coingecko_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface AddTokenInput {
  symbol: string;
  displayName?: string;
  binancePair: string;
  coingeckoId?: string;
}

export interface UseWatchlistResult {
  items: WatchlistItem[];
  loading: boolean;
  error: string | null;
  pairs: string[]; // uppercase binance pairs
  add: (token: AddTokenInput) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  reload: () => void;
}

function sortItems(a: WatchlistItem, b: WatchlistItem): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/**
 * Per-user watchlist CRUD over Supabase with optimistic updates and a realtime
 * channel (INSERT/UPDATE/DELETE) bound via the platform helper.
 */
export function useWatchlist(userId: string | null | undefined): UseWatchlistResult {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userIdRef = useRef<string | null | undefined>(userId);
  userIdRef.current = userId;

  const load = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from(TABLES.watchlist)
        .select('*')
        .eq('user_id', uid)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (err) throw err;
      setItems((data || []).map((r: any) => ({ ...r })).sort(sortItems));
    } catch (e: any) {
      setError(e?.message || 'failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // realtime sync scoped to this user
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToTable(
      'watchlist',
      (payload: any) => {
        const evt = payload.eventType || payload.type;
        if (evt === 'INSERT') {
          const row = payload.new as WatchlistItem;
          if (!row || row.user_id !== userIdRef.current) return;
          setItems((prev) => {
            if (prev.some((i) => i.id === row.id)) return prev;
            return [...prev, row].sort(sortItems);
          });
        } else if (evt === 'UPDATE') {
          const row = payload.new as WatchlistItem;
          if (!row || row.user_id !== userIdRef.current) return;
          setItems((prev) =>
            prev.map((i) => (i.id === row.id ? { ...i, ...row } : i)).sort(sortItems)
          );
        } else if (evt === 'DELETE') {
          const old = payload.old as { id?: string };
          if (!old || !old.id) return;
          setItems((prev) => prev.filter((i) => i.id !== old.id));
        }
      },
      { event: '*' }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const add = useCallback(
    async (token: AddTokenInput): Promise<boolean> => {
      const uid = userIdRef.current;
      if (!uid) return false;
      const pair = token.binancePair.toUpperCase();
      const symbol = token.symbol.toUpperCase();

      // dedupe by pair
      let already = false;
      setItems((prev) => {
        already = prev.some((i) => i.binance_pair.toUpperCase() === pair);
        return prev;
      });
      if (already) return false;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order), 0);
      const optimistic: WatchlistItem = {
        id: tempId,
        user_id: uid,
        symbol,
        display_name: token.displayName || symbol,
        binance_pair: pair,
        coingecko_id: token.coingeckoId || null,
        sort_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, optimistic].sort(sortItems));

      try {
        const { data, error: err } = await supabase
          .from(TABLES.watchlist)
          .insert({
            user_id: uid,
            symbol,
            display_name: token.displayName || symbol,
            binance_pair: pair,
            coingecko_id: token.coingeckoId || null,
            sort_order: maxOrder + 1,
          })
          .select('*')
          .single();
        if (err) throw err;
        setItems((prev) =>
          prev
            .map((i) => (i.id === tempId ? (data as WatchlistItem) : i))
            // drop any realtime dup of the inserted row
            .filter(
              (i, idx, arr) =>
                arr.findIndex((x) => x.id === i.id) === idx
            )
            .sort(sortItems)
        );
        return true;
      } catch (e: any) {
        // rollback optimistic insert
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        setError(e?.message || 'failed to add token');
        return false;
      }
    },
    [items]
  );

  const remove = useCallback(async (id: string) => {
    let removed: WatchlistItem | undefined;
    setItems((prev) => {
      removed = prev.find((i) => i.id === id);
      return prev.filter((i) => i.id !== id);
    });
    if (!id.startsWith('temp-')) {
      try {
        const { error: err } = await supabase
          .from(TABLES.watchlist)
          .delete()
          .eq('id', id);
        if (err) throw err;
      } catch (e: any) {
        // rollback on failure
        if (removed) {
          const r = removed;
          setItems((prev) => [...prev, r].sort(sortItems));
        }
        setError(e?.message || 'failed to remove token');
      }
    }
  }, []);

  const pairs = items.map((i) => i.binance_pair.toUpperCase());

  return { items, loading, error, pairs, add, remove, reload: load };
}
