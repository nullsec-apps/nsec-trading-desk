import { PROXY_URL } from './constants';

const CG_BASE = 'https://api.coingecko.com/api/v3';

async function cgFetch(path: string): Promise<any> {
  const url = `${CG_BASE}${path}`;
  // try direct first
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
    throw new Error(`direct ${res.status}`);
  } catch {
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
      return JSON.parse(text.trim());
    }
  }
}

export interface CoinMeta {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  priceChange24h?: number;
  marketCap?: number;
  currentPrice?: number;
}

/** Fetch market data (24h change, market cap, image) for given coingecko ids. */
export async function fetchMarkets(ids: string[]): Promise<Record<string, CoinMeta>> {
  const valid = ids.filter(Boolean);
  if (valid.length === 0) return {};
  try {
    const data = await cgFetch(
      `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
        valid.join(',')
      )}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`
    );
    const out: Record<string, CoinMeta> = {};
    if (Array.isArray(data)) {
      for (const c of data) {
        out[c.id] = {
          id: c.id,
          symbol: String(c.symbol || '').toUpperCase(),
          name: c.name,
          image: c.image,
          priceChange24h: c.price_change_percentage_24h,
          marketCap: c.market_cap,
          currentPrice: c.current_price,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export interface CoinListEntry {
  id: string;
  symbol: string;
  name: string;
}

let coinListCache: CoinListEntry[] | null = null;
let coinListPromise: Promise<CoinListEntry[]> | null = null;

/** Load + cache the full CoinGecko coin list for token search. */
export async function loadCoinList(): Promise<CoinListEntry[]> {
  if (coinListCache) return coinListCache;
  if (coinListPromise) return coinListPromise;
  coinListPromise = (async () => {
    try {
      const data = await cgFetch('/coins/list');
      if (Array.isArray(data)) {
        coinListCache = data.map((c: any) => ({
          id: c.id,
          symbol: String(c.symbol || '').toUpperCase(),
          name: c.name,
        }));
        return coinListCache;
      }
      return [];
    } catch {
      coinListPromise = null;
      return [];
    }
  })();
  return coinListPromise;
}

/** Find best coingecko id match for a symbol/name query. */
export async function searchCoins(query: string, limit = 8): Promise<CoinListEntry[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const list = await loadCoinList();
  if (list.length === 0) return [];
  const symMatches: CoinListEntry[] = [];
  const nameMatches: CoinListEntry[] = [];
  for (const c of list) {
    const sym = c.symbol.toLowerCase();
    const name = c.name.toLowerCase();
    if (sym === q) symMatches.unshift(c);
    else if (sym.startsWith(q)) symMatches.push(c);
    else if (name.startsWith(q) || name.includes(q)) nameMatches.push(c);
    if (symMatches.length + nameMatches.length > limit * 4) break;
  }
  return [...symMatches, ...nameMatches].slice(0, limit);
}

/** Resolve a symbol to its likely coingecko id (best-effort). */
export async function resolveCoingeckoId(symbol: string): Promise<string | undefined> {
  const matches = await searchCoins(symbol, 1);
  return matches[0]?.id;
}
