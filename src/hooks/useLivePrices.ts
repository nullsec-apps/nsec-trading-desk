import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetch24hBatch } from '../lib/binance';
import { ConnectionStatus, STATUS } from '../lib/constants';
import { tickDirection } from '../lib/format';

export interface LivePrice {
  pair: string; // lowercase
  price: number;
  prevPrice: number | null;
  direction: 'up' | 'down' | 'flat';
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  flashId: number;
  spark: number[];
  eventTime: number;
}

export interface SocketState {
  status: ConnectionStatus;
  latencyMs: number | null;
  lastTick: number | null;
  streamCount: number;
}

const SPARK_LEN = 40;
const POLL_MS = 4000;

export interface UseLivePricesResult {
  prices: Record<string, LivePrice>;
  socket: SocketState;
  getPrice: (pair: string) => LivePrice | undefined;
}

/**
 * Binance public WebSocket streams are geo-blocked (451) on many deployment
 * hosts, so instead of a single WS we poll the geo-friendly Binance REST
 * mirrors (data-api.binance.vision / api.binance.us) on a short interval and
 * synthesize tick direction + flash + rolling sparkline exactly like a live
 * tape. Every number is still real, fetched data — no fakes.
 */
export function useLivePrices(pairs: string[]): UseLivePricesResult {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [status, setStatus] = useState<ConnectionStatus>(STATUS.OFFLINE);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastTick, setLastTick] = useState<number | null>(null);
  const flashCounter = useRef(0);

  const normalized = Array.from(
    new Set(pairs.filter(Boolean).map((p) => p.toUpperCase()))
  ).sort();
  const pairsKey = normalized.join(',');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const activePairs = pairsKey ? pairsKey.split(',') : [];
    if (activePairs.length === 0) {
      setStatus(STATUS.OFFLINE);
      return;
    }

    setStatus((s) => (s === STATUS.CONNECTED ? STATUS.CONNECTED : STATUS.CONNECTING));

    const poll = async () => {
      const t0 = Date.now();
      try {
        const batch = await fetch24hBatch(activePairs);
        if (cancelled) return;
        const keys = Object.keys(batch);
        if (keys.length === 0) {
          setStatus(STATUS.RECONNECTING);
        } else {
          const now = Date.now();
          setLatencyMs(now - t0);
          setLastTick(now);
          setStatus(STATUS.CONNECTED);
          setPrices((prev) => {
            const next: Record<string, LivePrice> = { ...prev };
            for (const key of keys) {
              const t = batch[key];
              const lower = key.toLowerCase();
              const existing = prev[lower];
              const prevPrice = existing ? existing.price : null;
              const direction = tickDirection(prevPrice, t.lastPrice);
              const baseSpark = existing ? existing.spark : [];
              const spark = [...baseSpark, t.lastPrice];
              if (spark.length > SPARK_LEN) spark.splice(0, spark.length - SPARK_LEN);
              flashCounter.current += 1;
              next[lower] = {
                pair: lower,
                price: t.lastPrice,
                prevPrice,
                direction,
                changePercent24h: t.priceChangePercent,
                high24h: t.highPrice,
                low24h: t.lowPrice,
                volume24h: t.volume,
                quoteVolume24h: t.quoteVolume,
                flashId: flashCounter.current,
                spark,
                eventTime: now,
              };
            }
            return next;
          });
        }
      } catch {
        if (!cancelled) setStatus(STATUS.RECONNECTING);
      } finally {
        if (!cancelled) {
          timer = setTimeout(poll, POLL_MS);
        }
      }
    };

    poll();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (timer) clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pairsKey]);

  const getPrice = useCallback(
    (pair: string) => prices[pair.toLowerCase()],
    [prices]
  );

  const socket: SocketState = useMemo(
    () => ({ status, latencyMs, lastTick, streamCount: normalized.length }),
    [status, latencyMs, lastTick, normalized.length]
  );

  return useMemo(
    () => ({ prices, socket, getPrice }),
    [prices, socket, getPrice]
  );
}
