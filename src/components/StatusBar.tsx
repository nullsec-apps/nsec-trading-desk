import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Radio, WifiOff, RefreshCw } from 'lucide-react';
import { ConnectionStatus, STATUS } from '../lib/constants';
import { formatLatency, formatTickTime } from '../lib/format';

export interface StatusBarProps {
  status: ConnectionStatus;
  latencyMs: number | null;
  lastTick: number | null;
  streamCount: number;
}

function statusMeta(status: ConnectionStatus): {
  color: string;
  label: string;
  Icon: typeof Activity;
  pulse: boolean;
} {
  switch (status) {
    case STATUS.CONNECTED:
      return { color: '#1FE07A', label: 'CONNECTED', Icon: Radio, pulse: true };
    case STATUS.CONNECTING:
      return { color: '#D6E4DF', label: 'CONNECTING', Icon: Activity, pulse: true };
    case STATUS.RECONNECTING:
      return { color: '#FF4D5E', label: 'RECONNECTING', Icon: RefreshCw, pulse: true };
    default:
      return { color: '#5C6B66', label: 'OFFLINE', Icon: WifiOff, pulse: false };
  }
}

/**
 * Persistent thin bottom status bar — WS state, latency, last-tick, stream count.
 * Makes the realness of the data part of the UI.
 */
export function StatusBar({ status, latencyMs, lastTick, streamCount }: StatusBarProps) {
  const meta = useMemo(() => statusMeta(status), [status]);
  const { color, label, Icon, pulse } = meta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full h-8 shrink-0 border-t border-[#1F2A27] bg-[#0A0E0D] flex items-center px-2 sm:px-3 gap-3 sm:gap-4 overflow-x-auto no-scrollbar select-none"
    >
      {/* connection state */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={[
            'inline-block w-[7px] h-[7px] rounded-full transition-colors duration-150',
            pulse ? 'live-pulse' : 'opacity-50',
          ].join(' ')}
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}99` }}
          aria-hidden
        />
        <Icon size={13} strokeWidth={1.75} style={{ color }} className="hidden sm:block" />
        <span
          className="font-display text-[10px] tracking-[0.18em] uppercase tabular whitespace-nowrap"
          style={{ color }}
        >
          {label}
        </span>
      </div>

      <span className="w-px h-3.5 bg-[#1F2A27] shrink-0" aria-hidden />

      {/* latency */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-sans text-[10px] uppercase tracking-wider text-[#5C6B66]">
          lat
        </span>
        <span
          className="font-display text-[11px] tabular transition-colors duration-150"
          style={{
            color:
              latencyMs == null
                ? '#5C6B66'
                : latencyMs < 250
                ? '#1FE07A'
                : latencyMs < 800
                ? '#D6E4DF'
                : '#FF4D5E',
          }}
        >
          {formatLatency(latencyMs)}
        </span>
      </div>

      <span className="w-px h-3.5 bg-[#1F2A27] shrink-0" aria-hidden />

      {/* last tick */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-sans text-[10px] uppercase tracking-wider text-[#5C6B66]">
          tick
        </span>
        <span className="font-display text-[11px] tabular text-[#D6E4DF]">
          {formatTickTime(lastTick)}
        </span>
      </div>

      <span className="w-px h-3.5 bg-[#1F2A27] shrink-0 hidden sm:block" aria-hidden />

      {/* stream count */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <span className="font-sans text-[10px] uppercase tracking-wider text-[#5C6B66]">
          streams
        </span>
        <span className="font-display text-[11px] tabular text-[#D6E4DF]">
          {streamCount}
        </span>
      </div>

      <div className="flex-1" />

      <span className="hidden md:inline font-sans text-[10px] tracking-[0.16em] uppercase text-[#5C6B66] shrink-0">
        NSECDESK // binance ws
      </span>
    </motion.div>
  );
}

export default StatusBar;
