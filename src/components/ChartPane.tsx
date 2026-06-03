import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Loader2, BarChart3 } from 'lucide-react';
import { useCandles } from '../hooks/useCandles';
import { TimeframeKey } from '../lib/constants';
import { TimeframePills } from './TimeframePills';
import { LiveDot } from './LiveDot';
import { LivePrice } from '../hooks/useLivePrices';
import { WatchlistItem } from '../hooks/useWatchlist';
import {
  formatPrice,
  formatCompact,
  splitPair,
  percentColor,
  formatPercent,
} from '../lib/format';

export interface ChartPaneProps {
  item: WatchlistItem | null;
  timeframe: TimeframeKey;
  onTimeframeChange: (tf: TimeframeKey) => void;
  live?: LivePrice;
  feedLive?: boolean;
}

interface Crosshair {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export function ChartPane({
  item,
  timeframe,
  onTimeframeChange,
  live,
  feedLive = true,
}: ChartPaneProps) {
  const pair = item?.binance_pair ?? null;
  const { candles, loading, error, isEmpty, reload } = useCandles(pair, timeframe);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [crosshair, setCrosshair] = useState<Crosshair | null>(null);

  const meta = useMemo(() => (item ? splitPair(item.binance_pair) : null), [item]);

  // build chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        backgroundColor: '#0A0E0D',
        textColor: '#5C6B66',
        fontFamily: 'JetBrains Mono, IBM Plex Mono, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(31,42,39,0.5)' },
        horzLines: { color: 'rgba(31,42,39,0.5)' },
      },
      rightPriceScale: { borderColor: '#1F2A27' },
      timeScale: { borderColor: '#1F2A27', timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: '#5C6B66', width: 1, style: 3, labelBackgroundColor: '#111817' },
        horzLine: { color: '#5C6B66', width: 1, style: 3, labelBackgroundColor: '#111817' },
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#1FE07A',
      downColor: '#FF4D5E',
      borderUpColor: '#1FE07A',
      borderDownColor: '#FF4D5E',
      wickUpColor: '#1FE07A',
      wickDownColor: '#FF4D5E',
      priceLineColor: '#1FE07A',
    });
    candleSeriesRef.current = candleSeries;

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: '#1F2A27',
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !candleSeriesRef.current) {
        setCrosshair(null);
        return;
      }
      const cd: any = param.seriesData.get(candleSeriesRef.current);
      const vd: any = volSeriesRef.current
        ? param.seriesData.get(volSeriesRef.current)
        : null;
      if (cd) {
        setCrosshair({
          o: cd.open,
          h: cd.high,
          l: cd.low,
          c: cd.close,
          v: vd ? vd.value : 0,
        });
      } else {
        setCrosshair(null);
      }
    });

    const ro = new ResizeObserver(() => {
      if (chartRef.current && el) {
        chartRef.current.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, []);

  // push candle data
  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current) return;
    if (!candles.length) {
      candleSeriesRef.current.setData([]);
      volSeriesRef.current.setData([]);
      return;
    }
    const cData = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const vData = candles.map((c) => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(31,224,122,0.35)' : 'rgba(255,77,94,0.35)',
    }));
    candleSeriesRef.current.setData(cData);
    volSeriesRef.current.setData(vData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const lastCandle = candles.length ? candles[candles.length - 1] : null;
  const change = live?.changePercent24h ?? null;

  return (
    <div className="h-full flex flex-col min-w-0">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-3 py-2.5 border-b border-[#1F2A27]">
        <div className="flex items-center gap-2.5 min-w-0">
          <BarChart3 size={15} strokeWidth={2} className="text-[#1FE07A] shrink-0" />
          {item ? (
            <>
              <LiveDot
                direction={live?.direction ?? 'flat'}
                flashId={live?.flashId}
                live={feedLive && !!live}
                size={6}
              />
              <span className="font-display text-sm tracking-[0.06em] uppercase tabular text-[#D6E4DF] truncate">
                {item.symbol}
                {meta ? <span className="text-[#5C6B66]">/{meta.quote}</span> : null}
              </span>
              {live?.price != null ? (
                <span className="font-display text-sm tabular text-[#D6E4DF]">
                  {formatPrice(live.price)}
                </span>
              ) : null}
              {change != null ? (
                <span className={['font-sans text-[11px] tabular', percentColor(change)].join(' ')}>
                  {formatPercent(change)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="font-display text-sm tracking-[0.12em] uppercase text-[#5C6B66]">
              no symbol selected
            </span>
          )}
        </div>
        <div className="sm:ml-auto">
          <TimeframePills
            value={timeframe}
            onChange={onTimeframeChange}
            loading={loading && candles.length > 0}
            sticky
          />
        </div>
      </div>

      {/* chart body */}
      <div className="relative flex-1 min-h-[260px]">
        <div ref={containerRef} className="absolute inset-0" />

        {/* crosshair OHLCV tooltip */}
        <AnimatePresence>
          {crosshair && item ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute top-2 left-2 z-10 border border-[#1F2A27] bg-[#111817]/95 backdrop-blur-sm px-2.5 py-2 pointer-events-none"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-display text-[10px] tabular">
                {[
                  ['O', crosshair.o],
                  ['H', crosshair.h],
                  ['L', crosshair.l],
                  ['C', crosshair.c],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-center gap-1.5">
                    <span className="text-[#5C6B66]">{k}</span>
                    <span
                      style={{
                        color:
                          crosshair.c >= crosshair.o ? '#1FE07A' : '#FF4D5E',
                      }}
                    >
                      {formatPrice(v as number)}
                    </span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-1.5 pt-0.5 mt-0.5 border-t border-[#1F2A27]">
                  <span className="text-[#5C6B66]">VOL</span>
                  <span className="text-[#D6E4DF]">{formatCompact(crosshair.v)}</span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* loading overlay */}
        {loading && candles.length === 0 ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0E0D]">
            <div className="flex items-center gap-2 font-display text-xs tracking-[0.16em] uppercase text-[#5C6B66]">
              <Loader2 size={15} className="animate-spin text-[#1FE07A]" strokeWidth={2} />
              loading frame…
            </div>
          </div>
        ) : null}

        {/* error overlay */}
        {error ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0E0D] px-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle size={22} className="text-[#FF4D5E]" strokeWidth={1.5} />
              <p className="font-sans text-xs text-[#FF4D5E] max-w-xs break-words">{error}</p>
              <button
                type="button"
                onClick={reload}
                className="group inline-flex items-center gap-1.5 h-9 px-3 border border-[#1F2A27] bg-[#111817] font-display text-[11px] tracking-[0.12em] uppercase text-[#D6E4DF] hover:border-[#1FE07A] hover:text-[#1FE07A] transition-colors duration-150"
              >
                <RefreshCw size={12} strokeWidth={2} className="group-hover:rotate-90 transition-transform duration-200" />
                retry frame
              </button>
            </div>
          </div>
        ) : null}

        {/* empty / no-symbol */}
        {!loading && !error && (!item || isEmpty) ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0A0E0D] px-4">
            <p className="font-sans text-xs text-[#5C6B66] text-center leading-relaxed max-w-xs">
              {!item
                ? 'add or select a token from the rail to open its candlestick frame.'
                : 'no candle data for this frame.'}
            </p>
          </div>
        ) : null}
      </div>

      {/* footer hint */}
      {item && lastCandle ? (
        <div className="shrink-0 px-3 py-1.5 border-t border-[#1F2A27] flex items-center gap-3 overflow-x-auto no-scrollbar">
          <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-[#5C6B66] whitespace-nowrap">
            {timeframe} · {candles.length} candles
          </span>
          <span className="font-sans text-[10px] text-[#5C6B66] whitespace-nowrap">
            last close{' '}
            <span
              className="tabular"
              style={{ color: lastCandle.close >= lastCandle.open ? '#1FE07A' : '#FF4D5E' }}
            >
              {formatPrice(lastCandle.close)}
            </span>
          </span>
          <span className="font-sans text-[10px] text-[#5C6B66] whitespace-nowrap">
            vol <span className="tabular text-[#D6E4DF]">{formatCompact(lastCandle.volume)}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default ChartPane;
