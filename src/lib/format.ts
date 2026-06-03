/**
 * Tabular number + time formatting for the trading desk.
 * All formatters are defensive against null/NaN so cells never render 'undefined'.
 */

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  const abs = Math.abs(value);
  let decimals: number;
  if (abs >= 1000) decimals = 2;
  else if (abs >= 1) decimals = 2;
  else if (abs >= 0.01) decimals = 4;
  else if (abs >= 0.0001) decimals = 6;
  else decimals = 8;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPriceUsd(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  return '$' + formatPrice(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function percentColor(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return 'text-[#5C6B66]';
  if (value > 0) return 'text-[#1FE07A]';
  if (value < 0) return 'text-[#FF4D5E]';
  return 'text-[#D6E4DF]';
}

export function tickColor(direction: 'up' | 'down' | 'flat' | null): string {
  if (direction === 'up') return 'text-[#1FE07A]';
  if (direction === 'down') return 'text-[#FF4D5E]';
  return 'text-[#D6E4DF]';
}

export function flashClass(direction: 'up' | 'down' | 'flat' | null): string {
  if (direction === 'up') return 'flash-up';
  if (direction === 'down') return 'flash-down';
  return '';
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  return value.toFixed(2);
}

export function formatVolumeUsd(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '—';
  return '$' + formatCompact(value);
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null || !isFinite(ms) || ms < 0) return '—';
  return `${Math.round(ms)}ms`;
}

export function formatTickTime(ts: number | null | undefined): string {
  if (ts == null || !isFinite(ts)) return '--:--:--';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatSessionStamp(ts: number | null | undefined): string {
  if (ts == null || !isFinite(ts)) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Derive base/quote display from a binance pair e.g. BTCUSDT -> BTC / USDT */
export function splitPair(pair: string): { base: string; quote: string } {
  const QUOTES = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB', 'TUSD', 'FDUSD'];
  const up = pair.toUpperCase();
  for (const q of QUOTES) {
    if (up.endsWith(q) && up.length > q.length) {
      return { base: up.slice(0, up.length - q.length), quote: q };
    }
  }
  return { base: up, quote: '' };
}

export function tickDirection(prev: number | null, next: number): 'up' | 'down' | 'flat' {
  if (prev == null || !isFinite(prev)) return 'flat';
  if (next > prev) return 'up';
  if (next < prev) return 'down';
  return 'flat';
}
