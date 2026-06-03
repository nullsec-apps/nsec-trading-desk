import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { LiveDot } from './LiveDot';
import { Sparkline } from './Sparkline';
import { LivePrice } from '../hooks/useLivePrices';
import { WatchlistItem } from '../hooks/useWatchlist';
import { formatPrice, formatPercent, percentColor } from '../lib/format';

export interface WatchlistRowProps {
  item: WatchlistItem;
  live?: LivePrice;
  selected: boolean;
  feedLive?: boolean;
  onSelect: (item: WatchlistItem) => void;
  onRemove: (id: string) => void;
  index?: number;
}

/**
 * Single watchlist row: symbol, tabular price, 24h%, blinking LIVE dot,
 * hover remove. Price cell flashes green/red 200ms on each tick.
 */
export function WatchlistRow({
  item,
  live,
  selected,
  feedLive = true,
  onSelect,
  onRemove,
  index = 0,
}: WatchlistRowProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevFlash = useRef<number | undefined>(live?.flashId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = live?.flashId;
    if (id == null) return;
    if (prevFlash.current === id) return;
    prevFlash.current = id;
    const dir = live?.direction;
    if (dir === 'up' || dir === 'down') {
      setFlash(dir);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(null), 200);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [live?.flashId, live?.direction]);

  const flashBg =
    flash === 'up'
      ? 'rgba(31,224,122,0.16)'
      : flash === 'down'
      ? 'rgba(255,77,94,0.16)'
      : 'transparent';

  const price = live?.price ?? null;
  const change = live?.changePercent24h ?? null;
  const spark = live?.spark ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: 0.02 * index, ease: 'easeOut' }}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={[
        'group relative flex items-stretch border-b border-[#1F2A27] cursor-pointer outline-none transition-colors duration-150',
        selected ? 'bg-[#1F2A27]/40' : 'hover:bg-[#1F2A27]/25',
      ].join(' ')}
    >
      {/* left accent hairline on hover/selected */}
      <span
        className={[
          'absolute left-0 top-0 bottom-0 w-[2px] transition-colors duration-150',
          selected
            ? 'bg-[#1FE07A]'
            : 'bg-transparent group-hover:bg-[#1FE07A]/60',
        ].join(' ')}
        aria-hidden
      />

      {/* flash overlay */}
      <span
        className="absolute inset-0 pointer-events-none transition-colors duration-[200ms] ease-out"
        style={{ backgroundColor: flashBg }}
        aria-hidden
      />

      <div className="relative z-[1] flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-2 py-2.5">
        <LiveDot
          direction={live?.direction ?? 'flat'}
          flashId={live?.flashId}
          live={feedLive && !!live}
          size={6}
        />

        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="font-display text-[13px] tracking-[0.04em] uppercase tabular text-[#D6E4DF] truncate leading-none">
            {item.symbol}
          </span>
          <span className="font-sans text-[9px] uppercase tracking-wider text-[#5C6B66] truncate leading-none">
            {item.display_name || item.symbol}
          </span>
        </div>

        <div className="ml-auto hidden xl:block shrink-0">
          {spark.length > 1 ? (
            <Sparkline
              data={spark}
              width={48}
              height={20}
              direction={live?.direction === 'down' ? 'down' : 'up'}
            />
          ) : (
            <div className="w-[48px] h-[20px]" aria-hidden />
          )}
        </div>

        <div className="flex flex-col items-end shrink-0 gap-0.5 ml-2 xl:ml-3">
          <span className="font-display text-[13px] tabular text-[#D6E4DF] leading-none">
            {price != null ? formatPrice(price) : '—'}
          </span>
          <span
            className={['font-sans text-[10px] tabular leading-none', percentColor(change)].join(
              ' '
            )}
          >
            {change != null ? formatPercent(change) : '—'}
          </span>
        </div>
      </div>

      {/* remove */}
      <button
        type="button"
        aria-label={`remove ${item.symbol}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="relative z-[1] w-7 shrink-0 flex items-center justify-center text-[#5C6B66] opacity-0 group-hover:opacity-100 hover:text-[#FF4D5E] focus:opacity-100 focus:text-[#FF4D5E] transition-all duration-150 outline-none"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </motion.div>
  );
}

export default WatchlistRow;
