import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { LivePrice } from '../hooks/useLivePrices';
import { WatchlistItem } from '../hooks/useWatchlist';
import { PriceCard } from './PriceCard';
import { LiveDot } from './LiveDot';
import {
  formatPriceUsd,
  formatPercent,
  percentColor,
  formatVolumeUsd,
  splitPair,
} from '../lib/format';

export interface PriceCardsColumnProps {
  item: WatchlistItem | null;
  live?: LivePrice;
  feedLive?: boolean;
}

/**
 * Right-side detail column for the selected token: last price, 24h change,
 * 24h high/low, and 24h volume — all real-time off the WebSocket tape.
 */
export function PriceCardsColumn({ item, live, feedLive = true }: PriceCardsColumnProps) {
  const meta = useMemo(() => (item ? splitPair(item.binance_pair) : null), [item]);

  if (!item) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1F2A27]">
          <Activity size={13} strokeWidth={2} className="text-[#5C6B66]" />
          <span className="font-display text-[11px] tracking-[0.18em] uppercase text-[#5C6B66]">
            metrics
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="font-sans text-xs text-[#5C6B66] text-center leading-relaxed">
            select a token from the rail to read its live
            <br /> price, 24h range, and volume.
          </p>
        </div>
      </div>
    );
  }

  const price = live?.price ?? null;
  const change = live?.changePercent24h ?? null;
  const high = live?.high24h ?? null;
  const low = live?.low24h ?? null;
  const quoteVol = live?.quoteVolume24h ?? null;
  const dir = live?.direction ?? 'flat';
  const flashId = live?.flashId;
  const loading = !live;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[#1F2A27]">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={13} strokeWidth={2} className="text-[#1FE07A]" />
          <span className="font-display text-[12px] tracking-[0.08em] uppercase tabular text-[#D6E4DF] truncate">
            {item.symbol}
            {meta ? <span className="text-[#5C6B66]">/{meta.quote}</span> : null}
          </span>
        </div>
        <LiveDot direction={dir} flashId={flashId} live={feedLive && !!live} size={6} label="live" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex-1 p-2.5 grid grid-cols-2 gap-2 content-start"
      >
        <div className="col-span-2">
          <PriceCard
            label="last price"
            value={price != null ? formatPriceUsd(price) : '—'}
            valueColor={dir === 'up' ? '#1FE07A' : dir === 'down' ? '#FF4D5E' : '#D6E4DF'}
            direction={dir}
            flashId={flashId}
            showDot
            live={feedLive && !!live}
            sub={item.display_name || undefined}
            loading={loading}
            index={0}
          />
        </div>

        <div className="col-span-2">
          <PriceCard
            label="24h change"
            value={change != null ? formatPercent(change) : '—'}
            valueColor={
              change == null
                ? '#5C6B66'
                : change > 0
                ? '#1FE07A'
                : change < 0
                ? '#FF4D5E'
                : '#D6E4DF'
            }
            direction={dir}
            flashId={flashId}
            loading={loading}
            index={1}
          />
        </div>

        <PriceCard
          label="24h high"
          value={high != null ? formatPriceUsd(high) : '—'}
          loading={loading}
          index={2}
        />
        <PriceCard
          label="24h low"
          value={low != null ? formatPriceUsd(low) : '—'}
          loading={loading}
          index={3}
        />

        <div className="col-span-2">
          <PriceCard
            label="24h volume"
            value={quoteVol != null ? formatVolumeUsd(quoteVol) : '—'}
            sub={meta ? `${meta.quote} notional` : undefined}
            loading={loading}
            index={4}
          />
        </div>
      </motion.div>
    </div>
  );
}

export default PriceCardsColumn;
