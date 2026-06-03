import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TICKER_PAIRS, STATUS } from '../lib/constants';
import { useLivePrices } from '../hooks/useLivePrices';
import { LiveDot } from './LiveDot';
import { Sparkline } from './Sparkline';
import {
  formatPrice,
  formatPercent,
  percentColor,
  splitPair,
} from '../lib/format';

/**
 * Always-live pre-auth proof module: streams BTC/ETH/SOL straight from the
 * Binance WebSocket so the desk is alive before login.
 */
export function PreAuthTicker() {
  const pairs = useMemo(() => TICKER_PAIRS, []);
  const { prices, socket } = useLivePrices(pairs);
  const live = socket.status === STATUS.CONNECTED;

  return (
    <div className="w-full border-b border-[#1F2A27] bg-[#0A0E0D]/95 backdrop-blur-sm">
      <div className="flex items-stretch overflow-x-auto no-scrollbar">
        <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 border-r border-[#1F2A27] select-none">
          <LiveDot direction="flat" live={live} size={6} label={live ? 'live' : 'wait'} />
        </div>

        {pairs.map((pair, i) => {
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
              transition={{ duration: 0.3, delay: 0.05 * i, ease: 'easeOut' }}
              className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2 border-r border-[#1F2A27] min-w-[180px]"
            >
              <LiveDot
                direction={lp?.direction ?? 'flat'}
                flashId={lp?.flashId}
                live={live && !!lp}
                size={6}
              />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-display text-[11px] tracking-[0.06em] uppercase tabular text-[#D6E4DF]">
                  {base}
                  <span className="text-[#5C6B66]">/{quote}</span>
                </span>
                <span className="font-display text-[13px] tabular text-[#D6E4DF]">
                  {price != null ? formatPrice(price) : '—'}
                </span>
              </div>
              <div className="hidden sm:block">
                {spark.length > 1 ? (
                  <Sparkline data={spark} width={56} height={20} />
                ) : (
                  <div className="w-[56px] h-[20px]" aria-hidden />
                )}
              </div>
              <span
                className={[
                  'font-sans text-[11px] tabular leading-none ml-auto',
                  percentColor(change),
                ].join(' ')}
              >
                {change != null ? formatPercent(change) : '—'}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default PreAuthTicker;
