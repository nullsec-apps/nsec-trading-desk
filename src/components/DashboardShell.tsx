import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Terminal, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWatchlist, WatchlistItem } from '../hooks/useWatchlist';
import { useUserPrefs } from '../hooks/useUserPrefs';
import { useLivePrices } from '../hooks/useLivePrices';
import { TICKER_PAIRS, STATUS, TimeframeKey } from '../lib/constants';
import { WatchlistRail } from './WatchlistRail';
import { ChartPane } from './ChartPane';
import { PriceCardsColumn } from './PriceCardsColumn';
import { StatusBar } from './StatusBar';
import { LiveDot } from './LiveDot';
import { Sparkline } from './Sparkline';
import {
  formatPrice,
  formatPercent,
  percentColor,
  splitPair,
} from '../lib/format';

export interface DashboardShellProps {
  userId: string;
  userEmail: string | null;
}

/**
 * Authenticated multi-pane terminal: top ticker strip, left watchlist rail,
 * dominant chart pane, right metrics column, persistent bottom status bar.
 * Live prices for the watchlist + the always-on BTC/ETH/SOL strip share one
 * websocket via a merged pair set.
 */
export function DashboardShell({ userId, userEmail }: DashboardShellProps) {
  const watchlist = useWatchlist(userId);
  const prefs = useUserPrefs(userId);

  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // merge ticker strip pairs + watchlist pairs into one stream
  const allPairs = useMemo(() => {
    const set = new Set<string>(TICKER_PAIRS.map((p) => p.toUpperCase()));
    watchlist.pairs.forEach((p) => set.add(p.toUpperCase()));
    return Array.from(set);
  }, [watchlist.pairs]);

  const { prices, socket } = useLivePrices(allPairs);
  const feedLive = socket.status === STATUS.CONNECTED;

  // restore last symbol from prefs once watchlist + prefs are ready
  useEffect(() => {
    if (!prefs.ready || watchlist.loading) return;
    if (selectedPair) {
      const stillExists = watchlist.items.some(
        (i) => i.binance_pair.toUpperCase() === selectedPair.toUpperCase()
      );
      if (stillExists) return;
    }
    if (prefs.prefs.lastSymbol) {
      const match = watchlist.items.find(
        (i) =>
          i.binance_pair.toUpperCase() ===
            prefs.prefs.lastSymbol!.toUpperCase() ||
          i.symbol.toUpperCase() === prefs.prefs.lastSymbol!.toUpperCase()
      );
      if (match) {
        setSelectedPair(match.binance_pair.toUpperCase());
        return;
      }
    }
    if (watchlist.items.length > 0) {
      setSelectedPair(watchlist.items[0].binance_pair.toUpperCase());
    } else {
      setSelectedPair(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.ready, watchlist.loading, watchlist.items, prefs.prefs.lastSymbol]);

  const selectedItem: WatchlistItem | null = useMemo(() => {
    if (!selectedPair) return null;
    return (
      watchlist.items.find(
        (i) => i.binance_pair.toUpperCase() === selectedPair.toUpperCase()
      ) ?? null
    );
  }, [selectedPair, watchlist.items]);

  const selectedLive = selectedItem
    ? prices[selectedItem.binance_pair.toLowerCase()]
    : undefined;

  const handleSelect = useCallback(
    (item: WatchlistItem) => {
      setSelectedPair(item.binance_pair.toUpperCase());
      prefs.setLastSymbol(item.binance_pair.toUpperCase());
      setRailOpen(false);
    },
    [prefs]
  );

  const handleTimeframe = useCallback(
    (tf: TimeframeKey) => {
      prefs.setTimeframe(tf);
    },
    [prefs]
  );

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      setSigningOut(false);
    }
  }, []);

  const lastSessionTs = useMemo(() => {
    if (watchlist.items.length === 0) return null;
    const latest = watchlist.items.reduce((max, i) => {
      const t = new Date(i.created_at).getTime();
      return t > max ? t : max;
    }, 0);
    return latest || null;
  }, [watchlist.items]);

  return (
    <div className="h-screen w-full bg-[#0A0E0D] text-[#D6E4DF] flex flex-col overflow-hidden">
      {/* ===== top ticker strip ===== */}
      <div className="shrink-0 w-full border-b border-[#1F2A27] bg-[#0A0E0D]/95 backdrop-blur-sm">
        <div className="flex items-stretch overflow-x-auto no-scrollbar">
          {/* brand cell */}
          <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 border-r border-[#1F2A27] select-none">
            <Terminal
              size={15}
              strokeWidth={2}
              className="text-[#1FE07A] shrink-0"
            />
            <span className="font-display text-[11px] tracking-[0.22em] uppercase text-[#D6E4DF] whitespace-nowrap">
              nsec<span className="text-[#1FE07A]">desk</span>
            </span>
          </div>

          {/* mobile rail toggle */}
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)
            }
            className="lg:hidden shrink-0 flex items-center justify-center px-3 border-r border-[#1F2A27] text-[#5C6B66] hover:text-[#1FE07A] transition-colors duration-150"
            aria-label="toggle watchlist"
          >
            {railOpen ? <X size={15} strokeWidth={2} /> : <Menu size={15} strokeWidth={2} />}
          </button>

          {TICKER_PAIRS.map((pair, i) => {
            const lp = prices[pair.toLowerCase()];
            const { base, quote } = splitPair(pair);
            const price = lp?.price ?? null;
            const change = lp?.changePercent24h ?? null;
            const spark = lp?.spark ?? [];
            return (
              <motion.div
                key={pair}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * i, ease: 'easeOut' }}
                className="shrink-0 flex items-center gap-2.5 px-3 sm:px-4 py-2 border-r border-[#1F2A27] min-w-[170px]"
              >
                <LiveDot
                  direction={lp?.direction ?? 'flat'}
                  flashId={lp?.flashId}
                  live={feedLive && !!lp}
                  size={6}
                />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-display text-[10px] tracking-[0.06em] uppercase tabular text-[#D6E4DF]">
                    {base}
                    <span className="text-[#5C6B66]">/{quote}</span>
                  </span>
                  <span className="font-display text-[12px] tabular text-[#D6E4DF]">
                    {price != null ? formatPrice(price) : '—'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  {spark.length > 1 ? (
                    <Sparkline data={spark} width={48} height={18} />
                  ) : (
                    <div className="w-[48px] h-[18px]" aria-hidden />
                  )}
                </div>
                <span
                  className={[
                    'font-sans text-[10px] tabular leading-none ml-auto',
                    percentColor(change),
                  ].join(' ')}
                >
                  {change != null ? formatPercent(change) : '—'}
                </span>
              </motion.div>
            );
          })}

          <div className="flex-1 min-w-2" />

          {/* user / sign out */}
          <div className="shrink-0 flex items-center gap-2.5 px-3 sm:px-4 border-l border-[#1F2A27]">
            <span className="hidden md:inline font-sans text-[10px] tracking-[0.1em] uppercase text-[#5C6B66] truncate max-w-[160px]">
              {userEmail || 'desk user'}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="group inline-flex items-center gap-1.5 h-7 px-2.5 border border-[#1F2A27] bg-[#111817] font-display text-[10px] tracking-[0.14em] uppercase text-[#5C6B66] hover:border-[#FF4D5E] hover:text-[#FF4D5E] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut
                size={11}
                strokeWidth={2}
                className="group-hover:translate-x-0.5 transition-transform duration-150"
              />
              <span className="hidden sm:inline">{signingOut ? 'out…' : 'out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== main grid ===== */}
      <div className="flex-1 min-h-0 flex relative">
        {/* left rail — desktop fixed, mobile drawer */}
        <aside className="hidden lg:flex w-[280px] shrink-0 border-r border-[#1F2A27] bg-[#0A0E0D] flex-col min-h-0">
          <WatchlistRail
            watchlist={watchlist}
            prices={prices}
            selectedPair={selectedPair}
            feedLive={feedLive}
            lastSessionTs={lastSessionTs}
            onSelect={handleSelect}
          />
        </aside>

        {/* mobile drawer */}
        {railOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/60"
              onClick={() => setRailOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-40 w-[85vw] max-w-[300px] border-r border-[#1F2A27] bg-[#0A0E0D] flex flex-col min-h-0"
            >
              <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-[#1F2A27]">
                <span className="font-display text-[11px] tracking-[0.2em] uppercase text-[#D6E4DF]">
                  watchlist
                </span>
                <button
                  type="button"
                  onClick={() => setRailOpen(false)}
                  className="text-[#5C6B66] hover:text-[#FF4D5E] transition-colors duration-150"
                  aria-label="close"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <WatchlistRail
                  watchlist={watchlist}
                  prices={prices}
                  selectedPair={selectedPair}
                  feedLive={feedLive}
                  lastSessionTs={lastSessionTs}
                  onSelect={handleSelect}
                />
              </div>
            </motion.aside>
          </>
        ) : null}

        {/* center chart pane */}
        <main className="flex-1 min-w-0 flex flex-col border-r-0 lg:border-r border-[#1F2A27]">
          <ChartPane
            item={selectedItem}
            timeframe={prefs.prefs.defaultTimeframe}
            onTimeframeChange={handleTimeframe}
            live={selectedLive}
            feedLive={feedLive}
          />
        </main>

        {/* right metrics column — hidden on small, shown on xl */}
        <section className="hidden xl:flex w-[260px] shrink-0 bg-[#0A0E0D] flex-col min-h-0">
          <PriceCardsColumn
            item={selectedItem}
            live={selectedLive}
            feedLive={feedLive}
          />
        </section>
      </div>

      {/* metrics row on md/lg (below chart, above status) when right column hidden */}
      {selectedItem ? (
        <div className="xl:hidden shrink-0 border-t border-[#1F2A27] bg-[#0A0E0D] max-h-[40vh] overflow-y-auto no-scrollbar">
          <PriceCardsColumn
            item={selectedItem}
            live={selectedLive}
            feedLive={feedLive}
          />
        </div>
      ) : null}

      {/* ===== status bar ===== */}
      <StatusBar
        status={socket.status}
        latencyMs={socket.latencyMs}
        lastTick={socket.lastTick}
        streamCount={allPairs.length}
      />
    </div>
  );
}

export default DashboardShell;
