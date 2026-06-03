import { useEffect, useRef, useState, useCallback } from 'react';
import { Candle, fetchKlines } from '../lib/binance';
import { TimeframeKey, getTimeframe } from '../lib/constants';

export interface UseCandlesResult {
  candles: Candle[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  reload: () => void;
  liveCandle: Candle | null;
}

/**
 * Fetches OHLCV klines for a pair/timeframe via Binance REST mirrors, then
 * polls the latest candle on a short interval to keep the forming candle live
 * (the public kline WebSocket is geo-blocked on many hosts with a 451).
 */
export function useCandles(
  pair: string | null | undefined,
  timeframe: TimeframeKey
): UseCandlesResult {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCandle, setLiveCandle] = useState<Candle | null>(null);

  const reqIdRef = useRef(0);
  const tfDef = getTimeframe(timeframe);
  const tfKey = tfDef.key;

  const load = useCallback(async () => {
    if (!pair) {
      setCandles([]);
      setLiveCandle(null);
      setError(null);
      setLoading(false);
      return;
    }
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKlines(pair, tfKey);
      if (myReq !== reqIdRef.current) return;
      setCandles(data);
      setLiveCandle(data.length ? data[data.length - 1] : null);
    } catch (e: any) {
      if (myReq !== reqIdRef.current) return;
      setError(e?.message || 'failed to load frame');
      setCandles([]);
      setLiveCandle(null);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [pair, tfKey]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, tfKey]);

  // poll latest candle to keep forming candle live
  useEffect(() => {
    if (!pair) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const data = await fetchKlines(pair, tfKey);
        if (cancelled || data.length === 0) return;
        const latest = data[data.length - 1];
        setCandles((prev) => {
          if (prev.length === 0) return data;
          const last = prev[prev.length - 1];
          if (latest.time === last.time) {
            const copy = prev.slice();
            copy[copy.length - 1] = latest;
            return copy;
          }
          if (latest.time > last.time) {
            const copy = prev.slice();
            copy.push(latest);
            if (copy.length > tfDef.limit + 5) {
              copy.splice(0, copy.length - (tfDef.limit + 5));
            }
            return copy;
          }
          return prev;
        });
        setLiveCandle(latest);
      } catch {
        /* keep prior candles on transient failure */
      } finally {
        if (!cancelled) timer = setTimeout(tick, 6000);
      }
    };

    timer = setTimeout(tick, 6000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (timer) clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, tfKey]);

  return {
    candles,
    loading,
    error,
    isEmpty: !loading && !error && candles.length === 0,
    reload: load,
    liveCandle,
  };
}
