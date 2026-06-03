export const PALETTE = {
  bg: '#0A0E0D',
  surface: '#111817',
  text: '#D6E4DF',
  muted: '#5C6B66',
  accent: '#1FE07A',
  accent2: '#FF4D5E',
  hairline: '#1F2A27',
} as const;

export type TimeframeKey = '15m' | '1H' | '4H' | '1D';

export interface TimeframeDef {
  key: TimeframeKey;
  label: string;
  binanceInterval: string;
  /** approximate seconds per candle, used for live-candle bucketing */
  seconds: number;
  /** number of candles to fetch */
  limit: number;
}

export const TIMEFRAMES: TimeframeDef[] = [
  { key: '15m', label: '15m', binanceInterval: '15m', seconds: 900, limit: 200 },
  { key: '1H', label: '1H', binanceInterval: '1h', seconds: 3600, limit: 200 },
  { key: '4H', label: '4H', binanceInterval: '4h', seconds: 14400, limit: 200 },
  { key: '1D', label: '1D', binanceInterval: '1d', seconds: 86400, limit: 200 },
];

export const DEFAULT_TIMEFRAME: TimeframeKey = '1H';

export function getTimeframe(key: TimeframeKey): TimeframeDef {
  return TIMEFRAMES.find((t) => t.key === key) ?? TIMEFRAMES[1];
}

export interface SuggestedTicker {
  symbol: string;
  displayName: string;
  binancePair: string;
  coingeckoId: string;
}

export const SUGGESTED_TICKERS: SuggestedTicker[] = [
  { symbol: 'BTC', displayName: 'Bitcoin', binancePair: 'BTCUSDT', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', displayName: 'Ethereum', binancePair: 'ETHUSDT', coingeckoId: 'ethereum' },
  { symbol: 'SOL', displayName: 'Solana', binancePair: 'SOLUSDT', coingeckoId: 'solana' },
];

/** Symbols always streamed in the pre-auth + top ticker strip */
export const TICKER_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

/** Resolve dynamic table names using the runtime projectId */
function projectId(): string {
  if (typeof window !== 'undefined') {
    const ns = (window as any).__NULLSEC__;
    if (ns && ns.projectId) return ns.projectId as string;
  }
  return 'local';
}

export const TABLES = {
  get watchlist() {
    return `app_${projectId()}_watchlist`;
  },
  get userPrefs() {
    return `app_${projectId()}_user_prefs`;
  },
};

export const PROXY_URL = 'https://api.nullsec.studio/proxy';
export const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/stream?streams=';

export const STATUS = {
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  RECONNECTING: 'RECONNECTING',
  OFFLINE: 'OFFLINE',
} as const;

export type ConnectionStatus = (typeof STATUS)[keyof typeof STATUS];
