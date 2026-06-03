import { useEffect, useRef, useState, useCallback } from 'react';
import { buildStreamUrl, parseMiniTicker, MiniTicker } from '../lib/binance';
import { ConnectionStatus, STATUS } from '../lib/constants';

export interface SocketState {
  status: ConnectionStatus;
  latencyMs: number | null;
  lastTick: number | null;
  streamCount: number;
}

type TickHandler = (t: MiniTicker) => void;

/**
 * Manages the multiplexed Binance miniTicker WebSocket.
 * Dynamically (re)connects when the set of pairs changes, with backoff reconnect,
 * connection state, latency measurement, and last-tick timestamp.
 */
export function useBinanceSocket(pairs: string[], onTick?: TickHandler): SocketState {
  const [status, setStatus] = useState<ConnectionStatus>(STATUS.OFFLINE);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastTick, setLastTick] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const onTickRef = useRef<TickHandler | undefined>(onTick);
  const pairsKeyRef = useRef('');
  const closedByUsRef = useRef(false);

  onTickRef.current = onTick;

  const normalized = Array.from(
    new Set(pairs.filter(Boolean).map((p) => p.toLowerCase()))
  ).sort();
  const pairsKey = normalized.join(',');

  const clearReconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (activePairs: string[]) => {
      if (activePairs.length === 0) {
        if (wsRef.current) {
          closedByUsRef.current = true;
          try {
            wsRef.current.close();
          } catch {
            /* noop */
          }
          wsRef.current = null;
        }
        setStatus(STATUS.OFFLINE);
        return;
      }

      // tear down any existing socket first
      if (wsRef.current) {
        closedByUsRef.current = true;
        try {
          wsRef.current.close();
        } catch {
          /* noop */
        }
        wsRef.current = null;
      }

      const url = buildStreamUrl(activePairs);
      setStatus(attemptRef.current > 0 ? STATUS.RECONNECTING : STATUS.CONNECTING);

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect(activePairs);
        return;
      }
      wsRef.current = ws;
      closedByUsRef.current = false;

      // register handlers BEFORE the connection settles
      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus(STATUS.CONNECTED);
      };

      ws.onmessage = (ev) => {
        let raw: any;
        try {
          raw = JSON.parse(ev.data);
        } catch {
          return;
        }
        const tick = parseMiniTicker(raw);
        if (!tick) return;
        const now = Date.now();
        // latency = receive time - exchange event time, clamped to a sane window
        const lat = now - tick.eventTime;
        if (isFinite(lat) && lat >= 0 && lat < 60000) {
          setLatencyMs(lat);
        }
        setLastTick(now);
        if (onTickRef.current) onTickRef.current(tick);
      };

      ws.onerror = () => {
        // let onclose drive reconnect
      };

      ws.onclose = () => {
        if (closedByUsRef.current) {
          closedByUsRef.current = false;
          return;
        }
        scheduleReconnect(activePairs);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const scheduleReconnect = useCallback(
    (activePairs: string[]) => {
      clearReconnect();
      setStatus(STATUS.RECONNECTING);
      attemptRef.current = Math.min(attemptRef.current + 1, 6);
      const delay = Math.min(1000 * 2 ** (attemptRef.current - 1), 15000);
      reconnectRef.current = setTimeout(() => {
        connect(activePairs);
      }, delay);
    },
    [clearReconnect, connect]
  );

  useEffect(() => {
    pairsKeyRef.current = pairsKey;
    attemptRef.current = 0;
    connect(normalized);

    return () => {
      clearReconnect();
      if (wsRef.current) {
        closedByUsRef.current = true;
        try {
          wsRef.current.close();
        } catch {
          /* noop */
        }
        wsRef.current = null;
      }
    };
    // reconnect only when the set of pairs changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey]);

  // reconnect if the tab returns from background and socket is dead
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const ws = wsRef.current;
        if (
          normalized.length > 0 &&
          (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING)
        ) {
          attemptRef.current = 0;
          connect(normalized);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey]);

  return {
    status,
    latencyMs,
    lastTick,
    streamCount: normalized.length,
  };
}
