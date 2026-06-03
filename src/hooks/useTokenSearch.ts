import { useEffect, useRef, useState, useCallback } from 'react';
import { searchCoins, CoinListEntry } from '../lib/coingecko';
import { validatePair } from '../lib/binance';

export interface TokenSuggestion {
  symbol: string; // e.g. BTC
  displayName: string; // e.g. Bitcoin
  binancePair: string; // e.g. BTCUSDT
  coingeckoId: string;
  tradable: boolean; // exists + trading on Binance (USDT pair)
}

export interface UseTokenSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: TokenSuggestion[];
  loading: boolean;
  error: string | null;
  clear: () => void;
}

const DEBOUNCE_MS = 220;

/**
 * Debounced search against CoinGecko coin list, resolving each candidate to a
 * Binance USDT pair and validating it is actually tradable.
 */
export function useTokenSearch(): UseTokenSearchResult {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<TokenSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 1) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const coins: CoinListEntry[] = await searchCoins(q, 8);
        if (myReq !== reqIdRef.current) return;

        if (coins.length === 0) {
          setResults([]);
          setLoading(false);
          return;
        }

        // resolve candidate USDT pairs and validate against Binance
        const checked = await Promise.all(
          coins.map(async (c) => {
            const pair = `${c.symbol.toUpperCase()}USDT`;
            let tradable = false;
            try {
              tradable = await validatePair(pair);
            } catch {
              tradable = false;
            }
            return {
              symbol: c.symbol.toUpperCase(),
              displayName: c.name,
              binancePair: pair,
              coingeckoId: c.id,
              tradable,
            } as TokenSuggestion;
          })
        );
        if (myReq !== reqIdRef.current) return;

        // tradable first, dedupe by binancePair
        const seen = new Set<string>();
        const sorted = checked
          .sort((a, b) => Number(b.tradable) - Number(a.tradable))
          .filter((s) => {
            if (seen.has(s.binancePair)) return false;
            seen.add(s.binancePair);
            return true;
          });

        setResults(sorted);
        setLoading(false);
      } catch (e: any) {
        if (myReq !== reqIdRef.current) return;
        setError(e?.message || 'search failed');
        setResults([]);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { query, setQuery, results, loading, error, clear };
}
