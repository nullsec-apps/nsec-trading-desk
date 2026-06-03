import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LiveDot } from './LiveDot';

export interface PriceCardProps {
  label: string;
  value: string;
  /** semantic coloring of the value — green/red/neutral only */
  valueColor?: string;
  /** tick direction drives the flash + optional dot */
  direction?: 'up' | 'down' | 'flat' | null;
  /** increments on each update to retrigger the 200ms flash */
  flashId?: number;
  /** render a live dot beside the value */
  showDot?: boolean;
  live?: boolean;
  /** optional sub line under the value */
  sub?: string;
  loading?: boolean;
  /** entrance stagger index */
  index?: number;
}

/**
 * Single hairline-bordered flat metric card. Background flashes green/red for
 * 200ms on update then fades. No rounded chrome, tabular value.
 */
export function PriceCard({
  label,
  value,
  valueColor = '#D6E4DF',
  direction = null,
  flashId,
  showDot = false,
  live = true,
  sub,
  loading = false,
  index = 0,
}: PriceCardProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevFlash = useRef<number | undefined>(flashId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (flashId == null) return;
    if (prevFlash.current === flashId) return;
    prevFlash.current = flashId;
    if (direction === 'up' || direction === 'down') {
      setFlash(direction);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(null), 200);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flashId, direction]);

  const flashBg =
    flash === 'up'
      ? 'rgba(31,224,122,0.14)'
      : flash === 'down'
      ? 'rgba(255,77,94,0.14)'
      : 'transparent';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.04 * index, ease: 'easeOut' }}
      className="relative border border-[#1F2A27] bg-[#111817] px-3 py-2.5 overflow-hidden transition-colors duration-150 hover:border-[#2a3a36]"
    >
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-[200ms] ease-out"
        style={{ backgroundColor: flashBg }}
        aria-hidden
      />
      <div className="relative z-[1] flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-[#5C6B66] truncate">
            {label}
          </span>
          {showDot ? <LiveDot direction={direction} flashId={flashId} live={live} size={6} /> : null}
        </div>

        {loading ? (
          <div className="h-5 w-20 bg-[#1F2A27] animate-pulse" aria-hidden />
        ) : (
          <span
            className="font-display text-base sm:text-lg tabular leading-none transition-colors duration-150"
            style={{ color: valueColor }}
          >
            {value}
          </span>
        )}

        {sub ? (
          <span className="font-sans text-[10px] tabular text-[#5C6B66] truncate">{sub}</span>
        ) : null}
      </div>
    </motion.div>
  );
}

export default PriceCard;
