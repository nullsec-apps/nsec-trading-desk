import { useEffect, useRef, useState } from 'react';

export interface LiveDotProps {
  /** tick direction — colors the dot green (up) / red (down) / muted (flat) */
  direction: 'up' | 'down' | 'flat' | null;
  /** increments on each new tick to retrigger the tick pulse */
  flashId?: number;
  /** whether the feed is live; when false the dot dims and stops pulsing */
  live?: boolean;
  /** dot diameter in px */
  size?: number;
  /** optional label rendered to the right, e.g. 'LIVE' */
  label?: string;
}

function colorFor(direction: LiveDotProps['direction'], live: boolean): string {
  if (!live) return '#5C6B66';
  if (direction === 'up') return '#1FE07A';
  if (direction === 'down') return '#FF4D5E';
  return '#1FE07A';
}

/**
 * Signature element: a blinking LIVE indicator placed beside every price.
 * Pulses softly while live and snaps a brighter tick-pulse on each update,
 * coloring green on up-ticks and red on down-ticks.
 */
export function LiveDot({
  direction,
  flashId,
  live = true,
  size = 7,
  label,
}: LiveDotProps) {
  const [ticking, setTicking] = useState(false);
  const prevFlash = useRef<number | undefined>(flashId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (flashId == null) return;
    if (prevFlash.current === flashId) return;
    prevFlash.current = flashId;
    setTicking(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTicking(false), 210);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flashId]);

  const color = colorFor(direction, live);

  return (
    <span className="inline-flex items-center gap-1.5 select-none">
      <span
        className={[
          'inline-block rounded-full transition-colors duration-150',
          live ? 'live-pulse' : 'opacity-40',
          ticking ? 'live-tick' : '',
        ].join(' ')}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: live ? `0 0 6px ${color}99` : 'none',
        }}
        aria-hidden
      />
      {label ? (
        <span
          className="font-display text-[9px] tracking-[0.18em] uppercase tabular"
          style={{ color: live ? color : '#5C6B66' }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

export default LiveDot;
