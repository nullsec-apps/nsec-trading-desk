import { AnimatePresence, motion } from 'framer-motion';
import { Layers, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { WatchlistItem, UseWatchlistResult } from '../hooks/useWatchlist';
import { LivePrice } from '../hooks/useLivePrices';
import { WatchlistRow } from './WatchlistRow';
import { AddTokenInput } from './AddTokenInput';
import { WatchlistEmptyState } from './WatchlistEmptyState';

export interface WatchlistRailProps {
  watchlist: UseWatchlistResult;
  prices: Record<string, LivePrice>;
  selectedPair: string | null;
  feedLive?: boolean;
  lastSessionTs?: number | null;
  onSelect: (item: WatchlistItem) => void;
}

/**
 * Fixed left rail: token search/add, hairline-divided live rows, empty/loading/
 * error states. Selecting a row drives the chart + metrics column.
 */
export function WatchlistRail({
  watchlist,
  prices,
  selectedPair,
  feedLive = true,
  lastSessionTs,
  onSelect,
}: WatchlistRailProps) {
  const { items, loading, error, pairs, add, remove, reload } = watchlist;

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-[#1F2A27]">
        <Layers size={13} strokeWidth={2} className="text-[#1FE07A]" />
        <span className="font-display text-[11px] tracking-[0.18em] uppercase text-[#D6E4DF]">
          watchlist
        </span>
        {items.length > 0 ? (
          <span className="font-sans text-[10px] tabular text-[#5C6B66] ml-auto">
            {items.length} tracked
          </span>
        ) : null}
      </div>

      {/* add input */}
      <div className="shrink-0 p-2.5 border-b border-[#1F2A27]">
        <AddTokenInput onAdd={add} existingPairs={pairs} />
      </div>

      {/* error banner */}
      {error ? (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[#FF4D5E]/30 bg-[#FF4D5E]/5">
          <AlertTriangle size={12} strokeWidth={2} className="text-[#FF4D5E] shrink-0" />
          <span className="font-sans text-[11px] text-[#FF4D5E] truncate flex-1">{error}</span>
          <button
            type="button"
            onClick={reload}
            className="text-[#FF4D5E] hover:opacity-70 transition-opacity duration-150"
            aria-label="retry"
          >
            <RefreshCw size={12} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      {/* body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {loading && items.length === 0 ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#1F2A27] animate-pulse"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F2A27]" />
                <div className="flex flex-col gap-1">
                  <span className="w-12 h-3 bg-[#1F2A27]" />
                  <span className="w-16 h-2 bg-[#1F2A27]" />
                </div>
                <span className="ml-auto w-14 h-3 bg-[#1F2A27]" />
              </div>
            ))}
            <div className="flex items-center justify-center gap-1.5 py-3 font-display text-[10px] tracking-[0.16em] uppercase text-[#5C6B66]">
              <Loader2 size={11} className="animate-spin text-[#1FE07A]" strokeWidth={2} />
              loading watchlist…
            </div>
          </div>
        ) : items.length === 0 ? (
          <WatchlistEmptyState onAdd={add} lastSessionTs={lastSessionTs} />
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <WatchlistRow
                  item={item}
                  live={prices[item.binance_pair.toLowerCase()]}
                  selected={
                    !!selectedPair &&
                    item.binance_pair.toUpperCase() === selectedPair.toUpperCase()
                  }
                  feedLive={feedLive}
                  onSelect={onSelect}
                  onRemove={remove}
                  index={i}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default WatchlistRail;
