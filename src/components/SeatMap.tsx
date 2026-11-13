import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { HallLayout, Seat } from '../lib/seats';
import type { SeatCategory } from '../data/halls';
import { CATEGORY_LABEL } from '../data/halls';
import { taka } from '../lib/money';

export type ViewStatus = 'available' | 'selected' | 'sold' | 'held' | 'mine';

const CAT_VAR: Record<SeatCategory, string> = {
  regular: 'var(--color-seat-regular)',
  premium: 'var(--color-seat-premium)',
  couple: 'var(--color-seat-couple)',
  vip: 'var(--color-seat-vip)',
};

const STATUS_TEXT: Record<ViewStatus, string> = {
  available: 'available',
  selected: 'selected',
  sold: 'sold',
  held: 'being booked by someone else',
  mine: 'already booked by you',
};

type Props = {
  layout: HallLayout;
  statusOf: (id: string) => ViewStatus;
  prices?: Partial<Record<SeatCategory, number>>;
  mode?: 'full' | 'mini' | 'plan';
  onSeat?: (seat: Seat) => void;
  povSeatId?: string | null;
  highlight?: SeatCategory | null;
  className?: string;
  label?: string;
};

function SeatMapImpl({
  layout,
  statusOf,
  prices,
  mode = 'full',
  onSeat,
  povSeatId,
  highlight,
  className = '',
  label = 'Seat map',
}: Props) {
  const { bounds, rows, seats } = layout;
  const interactive = mode !== 'plan' && !!onSeat;
  const padX = mode === 'full' ? 2.2 : 0.8;
  const screenGap = mode === 'full' ? 3.4 : 2.4;
  const vb = {
    x: bounds.minX - padX,
    y: bounds.minY - screenGap,
    w: bounds.maxX - bounds.minX + padX * 2,
    h: bounds.maxY - bounds.minY + screenGap + 1.4,
  };

  const [focusId, setFocusId] = useState<string | null>(null);
  const [hover, setHover] = useState<Seat | null>(null);
  const rootRef = useRef<SVGSVGElement>(null);

  const firstAvailable = useMemo(
    () => seats.find((s) => statusOf(s.id) === 'available' || statusOf(s.id) === 'selected')?.id ?? seats[0]?.id,
    [seats, statusOf],
  );
  const tabStop = focusId ?? firstAvailable;

  const move = useCallback(
    (from: Seat, dx: number, dy: number): Seat | undefined => {
      if (dx) {
        const row = rows[from.rowIndex].seats;
        return row[row.indexOf(from) + dx];
      }
      const target = rows[from.rowIndex + dy];
      if (!target) return undefined;
      return target.seats.reduce((best, s) => (Math.abs(s.x2d - from.x2d) < Math.abs(best.x2d - from.x2d) ? s : best));
    },
    [rows],
  );

  const onKey = (e: KeyboardEvent, seat: Seat) => {
    const keys: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (keys[e.key]) {
      e.preventDefault();
      const next = move(seat, ...keys[e.key]);
      if (next) {
        setFocusId(next.id);
        (rootRef.current?.querySelector(`[data-seat="${CSS.escape(next.id)}"]`) as SVGElement | null)?.focus();
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSeat?.(seat);
    }
  };

  const gapFor = (s: Seat) => (s.kind === 'couple' ? 0.08 : mode === 'full' ? 0.2 : 0.24);
  const size = 0.8;

  // curved screen at the top of the plan
  const sy = bounds.minY - screenGap + (mode === 'full' ? 1.1 : 0.7);
  const sx0 = bounds.minX + (bounds.maxX - bounds.minX) * 0.1;
  const sx1 = bounds.maxX - (bounds.maxX - bounds.minX) * 0.1;
  const mid = (sx0 + sx1) / 2;

  return (
    <div
      className={`relative ${className}`}
      // full map: never taller than ~60% of the viewport, whatever the hall's shape
      style={mode === 'full' ? { maxWidth: `min(100%, calc(60svh * ${(vb.w / vb.h).toFixed(3)}))` } : undefined}
    >
      <svg
        ref={rootRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="block h-auto w-full"
        role={interactive ? 'group' : 'img'}
        aria-label={label}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="screen-glow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-champagne)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--color-champagne)" stopOpacity="0" />
          </linearGradient>
          <pattern id="hatch" width="0.3" height="0.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="0.3" stroke="var(--color-line-strong)" strokeWidth="0.08" />
          </pattern>
        </defs>

        {/* screen */}
        <path
          d={`M ${sx0} ${sy + 0.5} Q ${mid} ${sy - 0.7} ${sx1} ${sy + 0.5} L ${sx1} ${sy + 2.2} Q ${mid} ${sy + 0.9} ${sx0} ${sy + 2.2} Z`}
          fill="url(#screen-glow)"
        />
        <path
          d={`M ${sx0} ${sy + 0.5} Q ${mid} ${sy - 0.7} ${sx1} ${sy + 0.5}`}
          fill="none"
          stroke="var(--color-champagne)"
          strokeWidth={mode === 'full' ? 0.14 : 0.2}
          strokeLinecap="round"
        />
        {mode === 'full' && (
          <text
            x={mid}
            y={sy + 1.35}
            textAnchor="middle"
            fontSize="0.55"
            letterSpacing="0.12"
            fill="var(--color-ink-3)"
            fontFamily="var(--font-sans)"
          >
            Screen
          </text>
        )}

        {/* row labels on both sides */}
        {mode === 'full' &&
          rows.map((r) => {
            const first = r.seats[0];
            const last = r.seats[r.seats.length - 1];
            return (
              <g key={r.label} fontSize="0.62" fill="var(--color-ink-3)" fontFamily="var(--font-sans)" fontWeight={600}>
                <text x={first.x2d - first.w2d / 2 - 0.9} y={first.y2d + 0.22} textAnchor="middle">
                  {r.label}
                </text>
                <text x={last.x2d + last.w2d / 2 + 0.9} y={last.y2d + 0.22} textAnchor="middle">
                  {r.label}
                </text>
              </g>
            );
          })}

        {seats.map((s) => {
          const st = statusOf(s.id);
          const cat = CAT_VAR[s.category];
          const g = gapFor(s);
          // loveseats: no gap on the inner edge so the pair reads as one sofa
          const pairLeft = s.pairId && s.number % 2 === 1;
          const pairRight = s.pairId && s.number % 2 === 0;
          const x = s.x2d - s.w2d / 2 + (pairRight ? 0 : g / 2);
          const w = s.w2d - (s.pairId ? g / 2 : g);
          const y = s.y2d - size / 2;
          const dim = highlight && highlight !== s.category ? 0.22 : 1;
          const clickable = interactive && (st === 'available' || st === 'selected');
          const canPreview = interactive && mode === 'mini';
          const price = prices?.[s.category];
          const isPov = povSeatId === s.id;

          let fill = 'transparent';
          let stroke = cat;
          let fillOpacity = 1;
          if (st === 'available') {
            fill = cat;
            fillOpacity = mode === 'plan' ? 0.55 : 0.14;
          } else if (st === 'selected') {
            fill = 'var(--color-garnet-hover)';
            stroke = 'var(--color-ink-1)';
          } else if (st === 'sold') {
            fill = 'var(--color-seat-sold)';
            stroke = 'var(--color-line)';
          } else if (st === 'held') {
            fill = 'var(--color-seat-locked)';
            stroke = 'var(--color-line-strong)';
          } else if (st === 'mine') {
            fill = 'var(--color-champagne-deep)';
            stroke = 'var(--color-champagne)';
            fillOpacity = 0.45;
          }

          const aria = `Row ${s.row}, seat ${s.number}, ${CATEGORY_LABEL[s.category]}${
            price ? `, ${price} taka` : ''
          }${s.wheelchair ? ', wheelchair space' : ''}${s.pairId ? ', loveseat for two' : ''}, ${STATUS_TEXT[st]}`;

          return (
            <g
              key={s.id}
              data-seat={s.id}
              opacity={dim}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? (s.id === tabStop ? 0 : -1) : undefined}
              aria-label={interactive ? aria : undefined}
              aria-pressed={interactive ? st === 'selected' : undefined}
              aria-disabled={interactive && !clickable && !canPreview ? true : undefined}
              onClick={interactive && (clickable || canPreview) ? () => onSeat?.(s) : undefined}
              onKeyDown={interactive ? (e) => onKey(e, s) : undefined}
              onFocus={interactive ? () => setFocusId(s.id) : undefined}
              onPointerEnter={mode === 'full' ? () => setHover(s) : undefined}
              className={`outline-none ${clickable || canPreview ? 'cursor-pointer' : interactive ? 'cursor-not-allowed' : ''} [&:focus-visible>rect.ring]:opacity-100`}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={size}
                rx={pairLeft ? 0.22 : pairRight ? 0.22 : 0.2}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeWidth={mode === 'full' ? 0.07 : 0.1}
              />
              {/* bigger, invisible hit area */}
              {interactive && <rect x={x - g / 2} y={y - 0.12} width={w + g} height={size + 0.24} fill="transparent" />}
              {st === 'selected' && mode !== 'plan' && (
                <path
                  d={`M ${s.x2d - 0.2} ${s.y2d + 0.01} l 0.14 0.15 l 0.28 -0.3`}
                  fill="none"
                  stroke="var(--color-ink-1)"
                  strokeWidth="0.09"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {st === 'held' && mode !== 'plan' && (
                <g stroke="var(--color-ink-3)" strokeWidth="0.06" fill="none" strokeLinecap="round">
                  <circle cx={s.x2d} cy={s.y2d} r="0.2" />
                  <path d={`M ${s.x2d} ${s.y2d - 0.11} V ${s.y2d} H ${s.x2d + 0.09}`} />
                </g>
              )}
              {s.wheelchair && st !== 'selected' && mode !== 'plan' && (
                <g stroke={st === 'available' ? cat : 'var(--color-ink-3)'} strokeWidth="0.06" fill="none" strokeLinecap="round">
                  <circle cx={s.x2d - 0.04} cy={s.y2d - 0.2} r="0.05" fill={st === 'available' ? cat : 'var(--color-ink-3)'} />
                  <path d={`M ${s.x2d - 0.06} ${s.y2d - 0.1} v 0.16 h 0.18 l 0.08 0.16`} />
                  <path d={`M ${s.x2d - 0.14} ${s.y2d + 0.02} a 0.17 0.17 0 1 0 0.24 0.2`} />
                </g>
              )}
              {interactive && (
                <rect
                  className="ring opacity-0 transition-opacity"
                  x={x - 0.12}
                  y={y - 0.12}
                  width={w + 0.24}
                  height={size + 0.24}
                  rx="0.3"
                  fill="none"
                  stroke="var(--color-focus)"
                  strokeWidth="0.08"
                />
              )}
              {isPov && (
                <rect
                  className="animate-pulse-ring"
                  x={x - 0.2}
                  y={y - 0.2}
                  width={w + 0.4}
                  height={size + 0.4}
                  rx="0.36"
                  fill="none"
                  stroke="var(--color-focus)"
                  strokeWidth={mode === 'mini' ? 0.16 : 0.1}
                />
              )}
            </g>
          );
        })}
      </svg>

      {mode === 'full' && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-sm border border-line-strong bg-bg-0/95 px-3 py-2 text-xs whitespace-nowrap shadow-(--shadow-e2)"
          style={{
            left: `${((hover.x2d - vb.x) / vb.w) * 100}%`,
            top: `${((hover.y2d - size / 2 - vb.y) / vb.h) * 100}%`,
          }}
          aria-hidden
        >
          <span className="font-semibold text-ink-1">
            {hover.row}
            {hover.number}
          </span>
          <span className="text-ink-2"> · {CATEGORY_LABEL[hover.category]}</span>
          {prices?.[hover.category] != null && (
            <span className="tabular text-champagne"> · {taka(prices[hover.category]!)}</span>
          )}
          {statusOf(hover.id) !== 'available' && statusOf(hover.id) !== 'selected' && (
            <span className="block text-ink-3 capitalize">{STATUS_TEXT[statusOf(hover.id)]}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const SeatMap = memo(SeatMapImpl);
