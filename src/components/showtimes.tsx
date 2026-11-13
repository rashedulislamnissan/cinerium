import { Link } from 'react-router-dom';
import { availability, isBookable, minPrice, showContext, type Show } from '../data/schedule';
import { useBooking } from '../store/booking';
import { dayParts, formatTime, relativeDayLabel, type DayPart } from '../lib/time';
import { taka } from '../lib/money';
import { AvailabilityBar } from './ui';
import { HALLS } from '../data/halls';

export function DateStrip({
  dates,
  value,
  onChange,
  disabledBefore,
}: {
  dates: string[];
  value: string;
  onChange: (d: string) => void;
  disabledBefore?: string;
}) {
  return (
    <div role="tablist" aria-label="Choose a date" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
      {dates.map((d) => {
        const p = dayParts(d);
        const active = d === value;
        const disabled = !!disabledBefore && d < disabledBefore;
        return (
          <button
            key={d}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(d)}
            className={`flex w-[4.25rem] shrink-0 flex-col items-center rounded-sm border py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
              active
                ? 'border-champagne bg-bg-3 text-ink-1'
                : 'border-line text-ink-2 hover:border-line-strong hover:text-ink-1'
            }`}
          >
            <span className="text-xs">{relativeDayLabel(d)}</span>
            <span className="tabular font-display text-2xl leading-tight font-semibold">{p.day}</span>
            <span className="text-xs text-ink-3">{p.month}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ShowtimeChip({ show }: { show: Show }) {
  const mineCount = useBooking((s) =>
    s.bookings.filter((b) => b.showId === show.id).reduce((n, b) => n + b.seatIds.length, 0),
  );
  const { hall } = showContext(show);
  const a = availability(show, mineCount);
  const open = isBookable(show) && a.free > 0;
  const inner = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="tabular text-[1.0625rem] leading-none font-semibold text-ink-1">{formatTime(show.start)}</span>
        <span className="text-[0.75rem] text-ink-2">{hall.short}</span>
      </span>
      <span className="mt-2 block text-[0.75rem] text-ink-3">
        from <span className="tabular text-champagne">{taka(minPrice(show))}</span>
      </span>
      <span className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">
        {open && <AvailabilityBar ratio={a.ratio} label={a.label} />}
        <span aria-hidden>{!isBookable(show) ? 'Sales closed' : a.label}</span>
      </span>
    </>
  );
  if (!open) {
    return (
      <span className="block w-[9.5rem] cursor-not-allowed rounded-sm border border-line/60 px-3 py-2.5 opacity-45" aria-disabled>
        {inner}
      </span>
    );
  }
  return (
    <Link
      to={`/book/${show.id}`}
      aria-label={`${formatTime(show.start)} in ${hall.name}, from ${minPrice(show)} taka, ${a.label}`}
      className="block w-[9.5rem] rounded-sm border border-line bg-bg-2 px-3 py-2.5 transition-colors hover:border-champagne-deep hover:bg-bg-3"
    >
      {inner}
    </Link>
  );
}

export type ShowFilters = { hall: string; part: DayPart | 'any'; price: number };

export const PRICE_CAPS = [
  { value: 0, label: 'Any price' },
  { value: 450, label: 'Under ৳450' },
  { value: 600, label: 'Under ৳600' },
  { value: 900, label: 'Under ৳900' },
];

export const DAY_PARTS: { value: ShowFilters['part']; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Late night' },
];

function Seg<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 rounded-xs border px-3 text-sm transition-colors ${
            value === o.value ? 'border-champagne bg-bg-3 text-ink-1' : 'border-line text-ink-2 hover:text-ink-1'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ShowFilterBar({ value, onChange }: { value: ShowFilters; onChange: (v: ShowFilters) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div>
        <p className="mb-2 text-xs text-ink-3">Hall</p>
        <Seg
          label="Hall"
          value={value.hall}
          onChange={(hall) => onChange({ ...value, hall })}
          options={[{ value: 'all', label: 'All halls' }, ...HALLS.map((h) => ({ value: h.slug, label: h.short }))]}
        />
      </div>
      <div>
        <p className="mb-2 text-xs text-ink-3">Time</p>
        <Seg label="Time of day" value={value.part} onChange={(part) => onChange({ ...value, part })} options={DAY_PARTS} />
      </div>
      <div>
        <p className="mb-2 text-xs text-ink-3">Price per seat</p>
        <Seg label="Price per seat" value={value.price} onChange={(price) => onChange({ ...value, price })} options={PRICE_CAPS} />
      </div>
    </div>
  );
}

export function matchesFilters(show: Show, f: ShowFilters, dayPartOf: (t: string) => DayPart) {
  const hall = showContext(show).hall;
  if (f.hall !== 'all' && hall.slug !== f.hall) return false;
  if (f.part !== 'any' && dayPartOf(show.time) !== f.part) return false;
  if (f.price && minPrice(show) >= f.price) return false;
  return true;
}
