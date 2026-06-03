import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { SUGGESTED_TICKERS } from '../lib/constants';
import { formatSessionStamp } from '../lib/format';
import { AddTokenInput as AddTokenPayload } from '../hooks/useWatchlist';

export interface WatchlistEmptyStateProps {
  onAdd: (token: AddTokenPayload) => Promise<boolean>;
  /** faint last-session timestamp so the desk reads as awaiting input */
  lastSessionTs?: number | null;
}

/**
 * Empty-watchlist prompt — mono command line + one-click BTC/ETH/SOL chips.
 * Reads as awaiting input, never broken.
 */
export function WatchlistEmptyState({ onAdd, lastSessionTs }: WatchlistEmptyStateProps) {
  const [adding, setAdding] = useState<string | null>(null);

  const handleAdd = async (t: (typeof SUGGESTED_TICKERS)[number]) => {
    if (adding) return;
    setAdding(t.binancePair);
    try {
      await onAdd({
        symbol: t.symbol,
        displayName: t.displayName,
        binancePair: t.binancePair,
        coingeckoId: t.coingeckoId,
      });
    } finally {
      setAdding(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="px-3 py-6 sm:py-8 flex flex-col gap-5"
    >
      <div className="flex items-start gap-2 font-display text-[12px] sm:text-[13px] text-[#5C6B66] tabular leading-relaxed">
        <span className="text-[#1FE07A] live-pulse-text">&gt;</span>
        <span className="text-[#D6E4DF]">
          add a token to begin tracking
          <span className="inline-block w-[7px] h-[14px] ml-0.5 bg-[#1FE07A] align-middle blink-caret" aria-hidden />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#5C6B66]">
          suggested
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TICKERS.map((t, i) => {
            const isAdding = adding === t.binancePair;
            return (
              <motion.button
                key={t.symbol}
                type="button"
                onClick={() => handleAdd(t)}
                disabled={!!adding}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 * i, ease: 'easeOut' }}
                className="group inline-flex items-center gap-1.5 h-9 px-3 border border-[#1F2A27] bg-[#111817] font-display text-[11px] tracking-[0.08em] uppercase tabular text-[#D6E4DF] hover:border-[#1FE07A] hover:text-[#1FE07A] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? (
                  <Loader2 size={13} className="animate-spin" strokeWidth={2} />
                ) : (
                  <Plus
                    size={13}
                    strokeWidth={2}
                    className="text-[#5C6B66] group-hover:text-[#1FE07A] transition-colors duration-150"
                  />
                )}
                {t.symbol}
              </motion.button>
            );
          })}
        </div>
      </div>

      {lastSessionTs ? (
        <span className="font-sans text-[10px] text-[#5C6B66]/70 tabular pt-1">
          last session // {formatSessionStamp(lastSessionTs)}
        </span>
      ) : null}
    </motion.div>
  );
}

export default WatchlistEmptyState;
