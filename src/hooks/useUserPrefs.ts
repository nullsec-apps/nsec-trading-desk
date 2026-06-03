import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES, DEFAULT_TIMEFRAME, TimeframeKey, TIMEFRAMES } from '../lib/constants';

export interface UserPrefs {
  defaultTimeframe: TimeframeKey;
  lastSymbol: string | null;
}

export interface UseUserPrefsResult {
  prefs: UserPrefs;
  loading: boolean;
  ready: boolean;
  setTimeframe: (tf: TimeframeKey) => void;
  setLastSymbol: (symbol: string | null) => void;
}

function isValidTimeframe(v: any): v is TimeframeKey {
  return TIMEFRAMES.some((t) => t.key === v);
}

/**
 * Reads/writes per-user desk preferences (default timeframe + last symbol),
 * restoring state on login and debouncing writes back to Supabase.
 */
export function useUserPrefs(userId: string | null | undefined): UseUserPrefsResult {
  const [prefs, setPrefs] = useState<UserPrefs>({
    defaultTimeframe: DEFAULT_TIMEFRAME,
    lastSymbol: null,
  });
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const rowIdRef = useRef<string | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null | undefined>(userId);
  userIdRef.current = userId;

  // load prefs on user change
  useEffect(() => {
    let cancelled = false;
    rowIdRef.current = null;
    setReady(false);

    if (!userId) {
      setPrefs({ defaultTimeframe: DEFAULT_TIMEFRAME, lastSymbol: null });
      setReady(true);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(TABLES.userPrefs)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          const row = data[0];
          rowIdRef.current = row.id;
          setPrefs({
            defaultTimeframe: isValidTimeframe(row.default_timeframe)
              ? row.default_timeframe
              : DEFAULT_TIMEFRAME,
            lastSymbol: row.last_symbol || null,
          });
        } else {
          setPrefs({ defaultTimeframe: DEFAULT_TIMEFRAME, lastSymbol: null });
        }
      } catch {
        if (!cancelled)
          setPrefs({ defaultTimeframe: DEFAULT_TIMEFRAME, lastSymbol: null });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback((next: UserPrefs) => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(async () => {
      try {
        if (rowIdRef.current) {
          await supabase
            .from(TABLES.userPrefs)
            .update({
              default_timeframe: next.defaultTimeframe,
              last_symbol: next.lastSymbol,
            })
            .eq('id', rowIdRef.current);
        } else {
          const { data, error } = await supabase
            .from(TABLES.userPrefs)
            .insert({
              user_id: uid,
              default_timeframe: next.defaultTimeframe,
              last_symbol: next.lastSymbol,
            })
            .select('id')
            .single();
          if (!error && data) rowIdRef.current = data.id;
        }
      } catch {
        /* prefs persistence is best-effort */
      }
    }, 500);
  }, []);

  const setTimeframe = useCallback(
    (tf: TimeframeKey) => {
      setPrefs((prev) => {
        if (prev.defaultTimeframe === tf) return prev;
        const next = { ...prev, defaultTimeframe: tf };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setLastSymbol = useCallback(
    (symbol: string | null) => {
      setPrefs((prev) => {
        if (prev.lastSymbol === symbol) return prev;
        const next = { ...prev, lastSymbol: symbol };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  useEffect(() => {
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, []);

  return { prefs, loading, ready, setTimeframe, setLastSymbol };
}
