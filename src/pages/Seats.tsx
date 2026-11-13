import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Eye, Grid2x2, Info, Trash2 } from 'lucide-react';
import { getShow, isBookable, PRICE_RULE_LABEL, showContext, showsFor, demoOccupancy, availability } from '../data/schedule';
import { buildLayout, type Seat } from '../lib/seats';
import { SeatMap, type ViewStatus } from '../components/SeatMap';
import { CATEGORY_LABEL, type SeatCategory } from '../data/halls';
import { MAX_SEATS, useBooking } from '../store/booking';
import { CONVENIENCE_FEE, taka } from '../lib/money';
import { formatDay, formatTime } from '../lib/time';
import { buttonClass, ButtonLink, Certificate, Poster } from '../components/ui';
import { formatRuntime, posterLqip } from '../data/movies';

const Theatre3D = lazy(() => import('../three/Theatre3D'));

const LEGEND: { status: ViewStatus; label: string }[] = [
  { status: 'available', label: 'Available' },
  { status: 'selected', label: 'Your pick' },
  { status: 'held', label: 'Being booked' },
  { status: 'sold', label: 'Sold' },
];

function LegendSwatch({ status }: { status: ViewStatus }) {
  const cls: Record<ViewStatus, string> = {
    available: 'border-seat-regular bg-seat-regular/15',
    selected: 'border-ink-1 bg-garnet-hover',
    held: 'border-line-strong bg-seat-locked',
    sold: 'border-line bg-seat-sold',
    mine: 'border-champagne bg-champagne-deep/45',
  };
  return <span className={`inline-block h-4 w-4 rounded-[4px] border ${cls[status]}`} aria-hidden />;
}

const CAT_SWATCH: Record<SeatCategory, string> = {
  regular: 'border-seat-regular bg-seat-regular/20',
  premium: 'border-seat-premium bg-seat-premium/20',
  couple: 'border-seat-couple bg-seat-couple/20',
  vip: 'border-seat-vip bg-seat-vip/20',
};

export default function SeatsPage() {
  const { showId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const show = getShow(showId);
  const { selected, setShow, toggleSeat, removeSeats, clearSelection, startHold, bookings, notice, setNotice } =
    useBooking();
  const [pov, setPov] = useState<string | null>(params.get('seat'));
  const [highlight, setHighlight] = useState<SeatCategory | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const view = params.get('view') === '3d' ? '3d' : '2d';

  useEffect(() => {
    if (show) setShow(show.id);
  }, [show, setShow]);

  // opening 3D: bring the whole stage into view so the mini-map and controls aren't below the fold
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === '3d') stageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [view]);

  const ctx = show ? showContext(show) : null;
  const layout = useMemo(() => (ctx ? buildLayout(ctx.hall) : null), [ctx]);
  const occupancy = useMemo(() => (show ? demoOccupancy(show) : null), [show]);
  const mine = useMemo(
    () => new Set(bookings.filter((b) => b.showId === showId).flatMap((b) => b.seatIds)),
    [bookings, showId],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const statusOf = useCallback(
    (id: string): ViewStatus => {
      if (selectedSet.has(id)) return 'selected';
      if (mine.has(id)) return 'mine';
      const s = occupancy?.get(id);
      return s === 'sold' ? 'sold' : s === 'held' ? 'held' : 'available';
    },
    [selectedSet, mine, occupancy],
  );

  const setView = useCallback(
    (v: '2d' | '3d', seat?: string | null) => {
      const next = new URLSearchParams(params);
      if (v === '3d') next.set('view', '3d');
      else next.delete('view');
      if (seat) next.set('seat', seat);
      else next.delete('seat');
      setParams(next, { replace: true });
      if (seat !== undefined) setPov(seat);
    },
    [params, setParams],
  );

  const exit3d = useCallback(
    (reason?: string) => {
      setView('2d', null);
      if (reason) setToast(reason);
    },
    [setView],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!show || !ctx || !layout || !occupancy) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-40 text-center">
        <h1 className="font-display text-4xl">We couldn’t find that show</h1>
        <p className="mt-3 text-ink-2">It may have finished, or the link is from an older programme.</p>
        <ButtonLink to="/showtimes" className="mt-8">
          See today’s showtimes
        </ButtonLink>
      </div>
    );
  }

  const { movie, hall } = ctx;
  const bookable = isBookable(show);
  const selSeats = selected.map((id) => layout.byId.get(id)).filter(Boolean) as Seat[];
  const subtotal = selSeats.reduce((sum, s) => sum + (show.prices[s.category] ?? 0), 0);
  const fees = selSeats.length * CONVENIENCE_FEE;
  const sameDay = showsFor(movie.id, show.date).filter((s) => s.id !== show.id && isBookable(s));
  const avail = availability(show, mine.size);

  const onSeat = (seat: Seat) => {
    if (!bookable) return;
    const st = statusOf(seat.id);
    if (st !== 'available' && st !== 'selected') return;
    toggleSeat(seat, layout.byId);
  };

  const proceed = () => {
    startHold();
    navigate('/checkout');
  };

  const categories = Object.keys(show.prices) as SeatCategory[];

  return (
    <div className="relative">
      {/* film-tinted header */}
      <div className="relative overflow-hidden border-b border-line pt-16">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-2xl"
          style={{ backgroundImage: `url(${posterLqip(movie)})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-0/40 to-bg-0" aria-hidden />
        <div className="relative mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-4 py-5 sm:px-6">
          <Link to={`/films/${movie.slug}`} className="w-12 shrink-0 sm:w-14">
            <Poster movie={movie} sizes="56px" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-[clamp(1.6rem,3vw,2.25rem)] leading-tight font-semibold">
              {movie.title}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
              <Certificate value={movie.certificate} />
              <span>{formatRuntime(movie.runtime)}</span>
              <span className="text-ink-1">{hall.name}</span>
              <span>
                {formatDay(show.date, 'long')}, <span className="tabular text-ink-1">{formatTime(show.start)}</span>
              </span>
            </p>
          </div>
          {sameDay.length > 0 && (
            <div className="flex w-full items-center gap-2 overflow-x-auto no-scrollbar sm:w-auto">
              <span className="shrink-0 text-xs text-ink-3">Other times</span>
              {sameDay.map((s) => (
                <Link
                  key={s.id}
                  to={`/book/${s.id}${view === '3d' ? '?view=3d' : ''}`}
                  replace
                  className="shrink-0 rounded-xs border border-line px-2.5 py-1.5 text-xs text-ink-2 hover:border-champagne-deep hover:text-ink-1"
                >
                  <span className="tabular font-semibold text-ink-1">{formatTime(s.start)}</span>{' '}
                  {showContext(s).hall.short}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {/* controls */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Seat view" className="inline-flex rounded-sm border border-line bg-bg-1 p-1">
              {(
                [
                  ['2d', 'Seat map', Grid2x2],
                  ['3d', '3D seat view', Box],
                ] as const
              ).map(([v, label, Icon]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v, v === '3d' ? (pov ?? selected[selected.length - 1] ?? null) : null)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xs px-4 text-sm font-semibold transition-colors ${
                    view === v ? 'bg-bg-3 text-ink-1' : 'text-ink-2 hover:text-ink-1'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter seats by price">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={highlight === c}
                  onClick={() => setHighlight(highlight === c ? null : c)}
                  className={`inline-flex h-9 items-center gap-2 rounded-xs border px-3 text-sm transition-colors ${
                    highlight === c ? 'border-champagne bg-bg-3 text-ink-1' : 'border-line text-ink-2 hover:text-ink-1'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-[3px] border ${CAT_SWATCH[c]}`} aria-hidden />
                  {CATEGORY_LABEL[c]}
                  <span className="tabular font-semibold text-champagne">{taka(show.prices[c]!)}</span>
                </button>
              ))}
            </div>
          </div>

          {!bookable && (
            <p className="mb-4 flex items-center gap-2 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <Info size={16} strokeWidth={1.5} className="text-warning" />
              Online sales for this show have closed. You can still explore the hall.
            </p>
          )}

          {view === '3d' ? (
            <div
              ref={stageRef}
              className="h-[calc(100svh-84px)] max-h-[920px] min-h-[480px] scroll-mt-[76px] overflow-hidden rounded-md border border-line"
            >
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center bg-[#050407] text-sm text-ink-2">
                    Preparing your auditorium…
                  </div>
                }
              >
                <Theatre3D
                  layout={layout}
                  statusOf={statusOf}
                  prices={show.prices}
                  povSeatId={pov}
                  setPov={(id) => setPov(id)}
                  onToggleSelect={onSeat}
                  onExit={exit3d}
                  selectedCount={selected.length}
                />
              </Suspense>
            </div>
          ) : (
            <div className="glow-projector rounded-md border border-line bg-bg-1 p-3 sm:p-6">
              <div
                className="overflow-x-auto"
                ref={(el) => {
                  // narrow screens scroll the map sideways — start centred on the screen
                  if (el && !el.dataset.centred) {
                    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
                    el.dataset.centred = '1';
                  }
                }}
              >
                <SeatMap
                  layout={layout}
                  statusOf={statusOf}
                  prices={show.prices}
                  onSeat={onSeat}
                  highlight={highlight}
                  className="mx-auto min-w-[620px] max-w-[980px]"
                  label={`Seat map for ${hall.name}. Use arrow keys to move between seats and space to select.`}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-2">
                {LEGEND.map((l) => (
                  <span key={l.status} className="inline-flex items-center gap-2">
                    <LegendSwatch status={l.status} />
                    {l.label}
                  </span>
                ))}
                {mine.size > 0 && (
                  <span className="inline-flex items-center gap-2">
                    <LegendSwatch status="mine" /> Booked by you
                  </span>
                )}
                <span className="text-ink-3">
                  {avail.free} of {avail.total} seats free
                </span>
              </div>
            </div>
          )}
          {notice && (
            <p className="mt-3 flex items-center gap-2 text-sm text-champagne" role="status">
              <Info size={16} strokeWidth={1.5} />
              {notice}
              <button className="ml-2 text-ink-3 underline" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </p>
          )}
        </div>

        {/* booking summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Your selection">
          <div className="rounded-md border border-line bg-bg-2 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold">Your seats</h2>
              <span className="tabular text-sm text-ink-3">
                {selSeats.length}/{MAX_SEATS}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-3">{PRICE_RULE_LABEL[show.priceRule]} for this show</p>

            {selSeats.length === 0 ? (
              <p className="mt-5 rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">
                Pick seats on the map. Not sure? Open the <span className="text-ink-1">3D seat view</span> and sit in
                them first.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line/70">
                {selSeats.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-9 w-11 place-items-center rounded-xs bg-garnet/30 font-mono text-sm font-medium">
                      {s.label}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block text-ink-1">{CATEGORY_LABEL[s.category]}</span>
                      <span className="tabular text-ink-3">{taka(show.prices[s.category] ?? 0)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setView('3d', s.id)}
                      className="grid h-9 w-9 place-items-center rounded-xs text-ink-2 hover:bg-bg-3 hover:text-ink-1"
                      aria-label={`See the view from ${s.label}`}
                      title="See the view from this seat"
                    >
                      <Eye size={16} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSeats(s.pairId ? [s.id, s.pairId] : [s.id])}
                      className="grid h-9 w-9 place-items-center rounded-xs text-ink-2 hover:bg-bg-3 hover:text-ink-1"
                      aria-label={`Remove ${s.label}`}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-ink-2">
                <dt>Tickets</dt>
                <dd className="tabular">{taka(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-2">
                <dt>Convenience fee</dt>
                <dd className="tabular">{taka(fees)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular text-champagne">{taka(subtotal + fees)}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={!selSeats.length || !bookable}
              onClick={proceed}
              className={buttonClass('primary', 'lg', 'mt-5 w-full')}
            >
              Continue to payment
            </button>
            {selSeats.length > 0 && (
              <button type="button" onClick={clearSelection} className="mt-2 w-full py-2 text-sm text-ink-3 hover:text-ink-1">
                Clear selection
              </button>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-3">
              Seats are held for 8 minutes once you continue. VAT included.
            </p>
          </div>
        </aside>
      </div>

      {/* mobile sticky total */}
      {selSeats.length > 0 && (
        <div className="fixed inset-x-0 bottom-15 z-30 border-t border-line bg-bg-0/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-ink-3">{selSeats.map((s) => s.label).join(', ')}</p>
              <p className="tabular font-semibold text-champagne">{taka(subtotal + fees)}</p>
            </div>
            <button type="button" onClick={proceed} disabled={!bookable} className={buttonClass('primary', 'md')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="glass fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-sm px-4 py-3 text-sm shadow-(--shadow-e2) md:bottom-8"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
