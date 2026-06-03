import { PROXY_URL, TimeframeKey, getTimeframe } from './constants';

export interface Candle {
  time: number; // unix seconds (lightweight-charts UTCTimestamp)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MiniTicker {
  pair: string; // lowercase symbol e.g. btcusdt
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number; // base asset volume
  quoteVolume: number; // quote asset (USDT) volume
  eventTime: number; // ms
}

/** Parse a combined-stream WS message into a MiniTicker, or null if not a miniTicker. */
export function parseMiniTicker(raw: any): MiniTicker | null {
  const data = raw && raw.data ? raw.data : raw;
  if (!data || data.e !== '24hrMiniTicker') return null;
  const close = parseFloat(data.c);
  if (!isFinite(close)) return null;
  return {
    pair: String(data.s || '').toLowerCase(),
    close,
    open: parseFloat(data.o),
    high: parseFloat(data.h),
    low: parseFloat(data.l),
    volume: parseFloat(data.v),
    quoteVolume: parseFloat(data.q),
    eventTime: Number(data.E) || Date.now(),
  };
}

async function proxyGet(url: string): Promise<any> {
  const appId =
    typeof window !== 'undefined' && (window as any).__NULLSEC__
      ? (window as any).__NULLSEC__.projectId
      : 'local';
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, method: 'GET', appId }),
  });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const trimmed = text.trim();
    return JSON.parse(trimmed);
  }
}

/**
 * Binance REST + WS are geo-blocked (451) on many hosts. Use US-region
 * mirrors (api.binance.us / data-api.binance.vision) which are CORS-friendly
 * and not geo-blocked, with the proxy as a final fallback.
 */
const REST_HOSTS = [
  'https://data-api.binance.vision',
  'https://api.binance.us',
  'https://api.binance.com',
];

async function fetchJsonPath(path: string): Promise<any> {
  let lastErr: any = null;
  for (const host of REST_HOSTS) {
    const url = host + path;
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      lastErr = new Error(`${host} ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  // last resort: proxy the canonical host
  try {
    return await proxyGet('https://data-api.binance.vision' + path);
  } catch (e) {
    throw lastErr || e;
  }
}

/** Fetch OHLCV klines for a pair + timeframe, normalized for lightweight-charts. */
export async function fetchKlines(
  pair: string,
  timeframe: TimeframeKey
): Promise<Candle[]> {
  const tf = getTimeframe(timeframe);
  const path = `/api/v3/klines?symbol=${pair.toUpperCase()}&interval=${tf.binanceInterval}&limit=${tf.limit}`;
  const data = await fetchJsonPath(path);
  if (!Array.isArray(data)) throw new Error('invalid klines response');
  const candles: Candle[] = data
    .map((row: any[]) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
    }))
    .filter(
      (c: Candle) =>
        isFinite(c.time) && isFinite(c.open) && isFinite(c.close) && isFinite(c.high) && isFinite(c.low)
    );
  const seen = new Set<number>();
  return candles.filter((c) => {
    if (seen.has(c.time)) return false;
    seen.add(c.time);
    return true;
  });
}

let exchangeInfoCache: Set<string> | null = null;
let exchangeInfoPromise: Promise<Set<string>> | null = null;

/** Load the set of valid Binance trading pairs (USDT-quoted prioritized). */
export async function loadExchangePairs(): Promise<Set<string>> {
  if (exchangeInfoCache) return exchangeInfoCache;
  if (exchangeInfoPromise) return exchangeInfoPromise;
  exchangeInfoPromise = (async () => {
    try {
      const data = await fetchJsonPath('/api/v3/exchangeInfo');
      const set = new Set<string>();
      if (data && Array.isArray(data.symbols)) {
        for (const s of data.symbols) {
          if (s.status === 'TRADING') set.add(String(s.symbol).toUpperCase());
        }
      }
      exchangeInfoCache = set;
      return set;
    } catch {
      exchangeInfoPromise = null;
      return new Set<string>();
    }
  })();
  return exchangeInfoPromise;
}

/** Validate that a pair exists and is trading on Binance. */
export async function validatePair(pair: string): Promise<boolean> {
  const up = pair.toUpperCase();
  const set = await loadExchangePairs();
  if (set.size === 0) {
    try {
      const data = await fetchJsonPath(`/api/v3/ticker/price?symbol=${up}`);
      return data && data.price != null;
    } catch {
      return false;
    }
  }
  return set.has(up);
}

export interface Ticker24h {
  pair: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  volume: number;
}

/** Fetch 24h ticker stats for a single pair. */
export async function fetch24h(pair: string): Promise<Ticker24h | null> {
  try {
    const data = await fetchJsonPath(`/api/v3/ticker/24hr?symbol=${pair.toUpperCase()}`);
    if (!data || data.lastPrice == null) return null;
    return {
      pair: String(data.symbol).toUpperCase(),
      lastPrice: parseFloat(data.lastPrice),
      priceChangePercent: parseFloat(data.priceChangePercent),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      quoteVolume: parseFloat(data.quoteVolume),
      volume: parseFloat(data.volume),
    };
  } catch {
    return null;
  }
}

/** Batch fetch 24h stats for many pairs in a single request. */
export async function fetch24hBatch(pairs: string[]): Promise<Record<string, Ticker24h>> {
  if (pairs.length === 0) return {};
  try {
    const symbolsParam = JSON.stringify(pairs.map((p) => p.toUpperCase()));
    const path = `/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
    const data = await fetchJsonPath(path);
    const out: Record<string, Ticker24h> = {};
    if (Array.isArray(data)) {
      for (const d of data) {
        if (d && d.lastPrice != null) {
          const key = String(d.symbol).toUpperCase();
          out[key] = {
            pair: key,
            lastPrice: parseFloat(d.lastPrice),
            priceChangePercent: parseFloat(d.priceChangePercent),
            highPrice: parseFloat(d.highPrice),
            lowPrice: parseFloat(d.lowPrice),
            quoteVolume: parseFloat(d.quoteVolume),
            volume: parseFloat(d.volume),
          };
        }
      }
    }
    return out;
  } catch {
    const out: Record<string, Ticker24h> = {};
    await Promise.all(
      pairs.map(async (p) => {
        const t = await fetch24h(p);
        if (t) out[t.pair] = t;
      })
    );
    return out;
  }
}
