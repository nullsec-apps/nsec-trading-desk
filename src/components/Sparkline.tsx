import { useMemo } from 'react';

export interface SparklineProps {
  /** rolling close buffer */
  data: number[];
  width?: number;
  height?: number;
  /** force a color; otherwise derived from net direction */
  color?: string;
  className?: string;
}

/**
 * Tiny inline SVG sparkline drawn from the recent tick buffer, colored
 * green/red by net direction. Flat, hairline, terminal-grade — no axes.
 */
export function Sparkline({
  data,
  width = 64,
  height = 20,
  color,
  className,
}: SparklineProps) {
  const { path, fillPath, stroke, empty } = useMemo(() => {
    const pts = (data || []).filter((n) => isFinite(n));
    if (pts.length < 2) {
      return { path: '', fillPath: '', stroke: '#5C6B66', empty: true };
    }
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const n = pts.length;
    const stepX = width / (n - 1);
    const pad = 1.5;
    const usableH = height - pad * 2;

    const coords = pts.map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - (v - min) / range) * usableH;
      return [x, y] as const;
    });

    const d = coords
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(' ');

    const last = pts[pts.length - 1];
    const first = pts[0];
    const derived =
      color || (last >= first ? '#1FE07A' : '#FF4D5E');

    const fill =
      d +
      ` L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

    return { path: d, fillPath: fill, stroke: derived, empty: false };
  }, [data, width, height, color]);

  if (empty) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#1F2A27"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const gradId = `spark-${stroke.replace('#', '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} stroke="none" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Sparkline;
