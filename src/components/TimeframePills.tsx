import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { TIMEFRAMES, TimeframeKey } from '../lib/constants';

export interface TimeframePillsProps {
  value: TimeframeKey;
  onChange: (tf: TimeframeKey) => void;
  loading?: boolean;
  /** sticky segmented control on mobile */
  sticky?: boolean;
}

/**
 * Segmented mono control for 15m / 1H / 4H / 1D. Switching shows a brief
 * 'loading frame…' mono line. No bouncy motion — everything snaps.
 */
export function TimeframePills({
  value,
  onChange,
  loading = false,
  sticky = false,
}: TimeframePillsProps) {
  return (
    <div
      className={[
        'flex items-center gap-3 flex-wrap',
        sticky ? 'sticky top-0 z-10 bg-[#0A0E0D]/95 backdrop-blur-sm py-1' : '',
      ].join(' ')}
    >
      <div
        role="tablist"
        aria-label="chart timeframe"
        className="inline-flex items-stretch border border-[#1F2A27] bg-[#111817]"
      >
        {TIMEFRAMES.map((tf, i) => {
          const active = tf.key === value;
          return (
            <button
              key={tf.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(tf.key)}
              className={[
                'relative font-display text-[11px] sm:text-xs tracking-[0.12em] uppercase tabular px-3 sm:px-3.5 h-9 min-w-[44px] transition-colors duration-150 outline-none',
                i > 0 ? 'border-l border-[#1F2A27]' : '',
                active
                  ? 'text-[#0A0E0D]'
                  : 'text-[#5C6B66] hover:text-[#D6E4DF] hover:bg-[#1F2A27]/40',
              ].join(' ')}
            >
              {active && (
                <motion.span
                  layoutId="tf-active"
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute inset-0 bg-[#1FE07A]"
                  aria-hidden
                />
              )}
              <span className="relative z-[1]">{tf.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <span className="flex items-center gap-1.5 font-sans text-[11px] text-[#5C6B66] tabular">
          <Loader2 size={12} className="animate-spin" strokeWidth={2} />
          loading frame…
        </span>
      ) : null}
    </div>
  );
}

export default TimeframePills;
