import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Loader2, Check, AlertTriangle } from 'lucide-react';
import { useTokenSearch, TokenSuggestion } from '../hooks/useTokenSearch';
import { AddTokenInput as AddTokenPayload } from '../hooks/useWatchlist';

export interface AddTokenInputProps {
  onAdd: (token: AddTokenPayload) => Promise<boolean>;
  existingPairs?: string[]; // uppercase
}

/**
 * Mono command-style token search/add input ('> add a token…') with debounced
 * autocomplete against CoinGecko + Binance pair validation. Inserts the chosen
 * token into the user's watchlist.
 */
export function AddTokenInput({ onAdd, existingPairs = [] }: AddTokenInputProps) {
  const { query, setQuery, results, loading, error, clear } = useTokenSearch();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const existing = new Set(existingPairs.map((p) => p.toUpperCase()));

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleAdd = async (s: TokenSuggestion) => {
    if (!s.tradable) return;
    if (existing.has(s.binancePair.toUpperCase())) return;
    setAdding(s.binancePair);
    const ok = await onAdd({
      symbol: s.symbol,
      displayName: s.displayName,
      binancePair: s.binancePair,
      coingeckoId: s.coingeckoId,
    });
    setAdding(null);
    if (ok) {
      clear();
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const list = results.filter((r) => r.tradable);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = list[activeIdx];
      if (s) handleAdd(s);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && (query.trim().length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={[
          'flex items-center gap-2 px-2.5 h-11 border bg-[#0A0E0D] transition-colors duration-200',
          open ? 'border-[#1FE07A]' : 'border-[#1F2A27] hover:border-[#2a3a36]',
        ].join(' ')}
      >
        <span className="text-[#1FE07A] font-display text-sm select-none">&gt;</span>
        <Search size={14} className="text-[#5C6B66]" strokeWidth={2} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="add a token…"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none text-[#D6E4DF] placeholder:text-[#5C6B66] text-sm font-sans tabular"
          style={{ fontSize: 14 }}
        />
        {loading ? (
          <Loader2 size={14} className="text-[#5C6B66] animate-spin" />
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute z-30 left-0 right-0 mt-1 border border-[#1F2A27] bg-[#111817] shadow-2xl shadow-black/60 max-h-72 overflow-y-auto fade-in-up">
          {error ? (
            <div className="flex items-center gap-2 px-3 py-3 text-[#FF4D5E] text-xs font-sans">
              <AlertTriangle size={13} strokeWidth={2} />
              search failed — {error}
            </div>
          ) : loading && results.length === 0 ? (
            <div className="px-3 py-3 text-[#5C6B66] text-xs font-sans blink-caret">
              resolving pairs
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-[#5C6B66] text-xs font-sans">
              no tradable match for &quot;{query.trim()}&quot;
            </div>
          ) : (
            <ul className="divide-y divide-[#1F2A27]">
              {results.map((s, i) => {
                const already = existing.has(s.binancePair.toUpperCase());
                const tradableIdx = results
                  .filter((r) => r.tradable)
                  .indexOf(s);
                const isActive = s.tradable && tradableIdx === activeIdx;
                const isAdding = adding === s.binancePair;
                return (
                  <li key={`${s.binancePair}-${i}`}>
                    <button
                      type="button"
                      disabled={!s.tradable || already || !!adding}
                      onMouseEnter={() => {
                        if (s.tradable && tradableIdx >= 0) setActiveIdx(tradableIdx);
                      }}
                      onClick={() => handleAdd(s)}
                      className={[
                        'group w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150',
                        isActive ? 'bg-[#0A0E0D]' : 'bg-transparent',
                        s.tradable && !already
                          ? 'hover:bg-[#0A0E0D] cursor-pointer'
                          : 'opacity-45 cursor-not-allowed',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'w-0.5 self-stretch -my-2.5 transition-colors duration-150',
                          isActive ? 'bg-[#1FE07A]' : 'bg-transparent',
                        ].join(' ')}
                      />
                      <span className="font-display text-sm text-[#D6E4DF] tabular min-w-[52px]">
                        {s.symbol}
                      </span>
                      <span className="flex-1 truncate text-xs text-[#5C6B66] font-sans">
                        {s.displayName}
                      </span>
                      {!s.tradable ? (
                        <span className="text-[10px] text-[#5C6B66] font-sans uppercase tracking-wider">
                          no pair
                        </span>
                      ) : already ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#5C6B66] font-sans uppercase tracking-wider">
                          <Check size={11} strokeWidth={2} /> tracked
                        </span>
                      ) : isAdding ? (
                        <Loader2 size={13} className="text-[#1FE07A] animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[#1FE07A] font-display uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <Plus size={11} strokeWidth={2.5} /> add
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-3 py-1.5 border-t border-[#1F2A27] text-[9px] text-[#5C6B66] font-sans tracking-wider uppercase flex items-center justify-between">
            <span>↑↓ navigate · ↵ add · esc close</span>
            <span className="text-[#1FE07A]">binance · usdt</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AddTokenInput;
