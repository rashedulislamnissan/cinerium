import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3, ShieldAlert } from 'lucide-react';
import { useBooking, newBookingRef, HOLD_MINUTES } from '../store/booking';
import { getShow, showContext } from '../data/schedule';
import { buildLayout, type Seat } from '../lib/seats';
import { CATEGORY_LABEL } from '../data/halls';
import { CONVENIENCE_FEE, taka } from '../lib/money';
import { formatDay, formatTime } from '../lib/time';
import { Button, ButtonLink, Modal, Poster, formatCountdown, useNow } from '../components/ui';
import { PAYMENT_GROUPS, PAYMENT_METHODS, type PaymentMethod } from '../data/payments';

const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { showId, selected, holdUntil, bookings, addBooking, clearSelection } = useBooking();
  const now = useNow();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const show = showId ? getShow(showId) : undefined;
  const ctx = show ? showContext(show) : null;
  const seats = useMemo(() => {
    if (!ctx) return [];
    const layout = buildLayout(ctx.hall);
    return selected.map((id) => layout.byId.get(id)).filter(Boolean) as Seat[];
  }, [ctx, selected]);

  const remaining = holdUntil ? holdUntil - now : 0;
  const expired = !!holdUntil && remaining <= 0;

  if (!show || !ctx || !seats.length || !holdUntil) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-40 text-center">
        <h1 className="font-display text-4xl">No seats on hold</h1>
        <p className="mt-3 text-ink-2">Choose a show and pick your seats first — we’ll hold them for {HOLD_MINUTES} minutes while you pay.</p>
        <ButtonLink to="/showtimes" className="mt-8">
          Find a show
        </ButtonLink>
      </div>
    );
  }

  const { movie, hall } = ctx;
  const subtotal = seats.reduce((s, x) => s + (show.prices[x.category] ?? 0), 0);
  const fees = seats.length * CONVENIENCE_FEE;
  const total = subtotal + fees;

  const errors = {
    name: form.name.trim().length < 2 ? 'Enter your name as it should appear on the ticket.' : '',
    email: !EMAIL_RE.test(form.email.trim()) ? 'Enter an email address like you@example.com.' : '',
    phone: !PHONE_RE.test(form.phone.replace(/[\s-]/g, '')) ? 'Enter a Bangladeshi mobile number, e.g. 01712 345678.' : '',
  };

  const issueSampleTicket = () => {
    const ref = newBookingRef(bookings);
    addBooking({
      ref,
      showId: show.id,
      seatIds: seats.map((s) => s.id),
      subtotal,
      fees,
      total,
      method: method?.name ?? 'Demo',
      name: form.name.trim() || 'Guest',
      email: form.email.trim(),
      phone: form.phone.trim(),
      createdAt: Date.now(),
    });
    setMethod(null);
    navigate(`/tickets/${ref}`, { replace: true });
  };

  const field = (key: keyof typeof form, label: string, type: string, autoComplete: string, placeholder: string) => {
    const err = touched[key] && errors[key];
    return (
      <div>
        <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-ink-1">
          {label}
        </label>
        <input
          id={key}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          onBlur={() => setTouched({ ...touched, [key]: true })}
          aria-invalid={!!err}
          aria-describedby={err ? `${key}-err` : undefined}
          className={`h-12 w-full rounded-sm border bg-bg-3 px-3.5 text-ink-1 placeholder:text-ink-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-focus ${
            err ? 'border-danger' : 'border-line focus:border-line-strong'
          }`}
        />
        {err && (
          <p id={`${key}-err`} className="mt-1.5 text-xs text-danger">
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-24 pb-16 sm:px-6">
      {/* hold timer */}
      <div
        className={`sticky top-16 z-20 -mx-4 mb-8 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-sm sm:border ${
          expired ? 'border-danger/50 bg-danger/10' : 'border-line bg-bg-1/90'
        }`}
        role="timer"
        aria-live="off"
      >
        <span className="flex items-center gap-2 text-sm text-ink-2">
          <Clock3 size={16} strokeWidth={1.5} className={expired ? 'text-danger' : 'text-champagne'} />
          {expired ? 'Your hold has ended and the seats were released.' : `Seats ${seats.map((s) => s.label).join(', ')} are held for you`}
        </span>
        {expired ? (
          <Button
            size="sm"
            onClick={() => {
              clearSelection();
              navigate(`/book/${show.id}`);
            }}
          >
            Pick seats again
          </Button>
        ) : (
          <span className="tabular text-lg font-semibold text-champagne">{formatCountdown(remaining)}</span>
        )}
      </div>

      <Link to={`/book/${show.id}`} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink-1">
        <ArrowLeft size={16} strokeWidth={1.5} /> Change seats
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={expired ? 'pointer-events-none opacity-50' : ''}>
          <h1 className="font-display text-[clamp(2.25rem,4vw,3rem)] leading-[1.05] font-medium">Pay for your tickets</h1>

          <section className="mt-10" aria-labelledby="contact-h">
            <h2 id="contact-h" className="text-lg font-semibold">
              Where should we send your tickets?
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{field('name', 'Full name', 'text', 'name', 'Name on the ticket')}</div>
              {field('email', 'Email', 'email', 'email', 'you@example.com')}
              {field('phone', 'Mobile number', 'tel', 'tel', '01712 345678')}
            </div>
          </section>

          <section className="mt-12" aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-lg font-semibold">
              Choose how to pay
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Total <span className="tabular font-semibold text-champagne">{taka(total)}</span>
            </p>
            <div className="mt-6 space-y-8">
              {PAYMENT_GROUPS.map((g) => (
                <div key={g.id}>
                  <h3 className="text-sm font-semibold text-ink-1">{g.title}</h3>
                  <p className="text-xs text-ink-3">{g.blurb}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {PAYMENT_METHODS.filter((m) => m.group === g.id).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m)}
                        className="group flex items-center gap-3 rounded-sm border border-line bg-bg-2 p-3 text-left transition-colors hover:border-line-strong hover:bg-bg-3"
                      >
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xs text-xs font-bold text-ink-1"
                          style={{ background: m.tint }}
                          aria-hidden
                        >
                          {m.monogram}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-1">{m.name}</span>
                          <span className="block truncate text-xs text-ink-3">{m.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p className="mt-10 text-xs leading-relaxed text-ink-3">
            Cancellation policy (demo): full refund up to 24 hours before the show, 50% up to 2 hours before, none after.
          </p>
        </div>

        {/* order summary */}
        <aside className="lg:sticky lg:top-36 lg:self-start" aria-label="Order summary">
          <div className="overflow-hidden rounded-md border border-line bg-bg-2">
            <div className="flex gap-4 p-5">
              <Poster movie={movie} className="w-20 shrink-0" sizes="80px" />
              <div className="min-w-0">
                <h2 className="font-display text-2xl leading-tight font-semibold">{movie.title}</h2>
                <p className="mt-1 text-sm text-ink-2">{hall.name}</p>
                <p className="text-sm text-ink-2">
                  {formatDay(show.date)} · <span className="tabular text-ink-1">{formatTime(show.start)}</span>
                </p>
              </div>
            </div>
            <div className="hairline-gold" />
            <ul className="space-y-2 p-5 text-sm">
              {seats.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-ink-1">{s.label}</span>{' '}
                    <span className="text-ink-3">{CATEGORY_LABEL[s.category]}</span>
                  </span>
                  <span className="tabular text-ink-2">{taka(show.prices[s.category] ?? 0)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-line pt-2 text-ink-2">
                <span>Convenience fee</span>
                <span className="tabular">{taka(fees)}</span>
              </li>
              <li className="flex justify-between pt-1 text-base font-semibold">
                <span>Total</span>
                <span className="tabular text-champagne">{taka(total)}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <Modal open={!!method} onClose={() => setMethod(null)} title="Demo website notice">
        <div className="flex flex-col items-start">
          <span className="grid h-12 w-12 place-items-center rounded-sm bg-garnet/25 text-champagne">
            <ShieldAlert size={22} strokeWidth={1.5} />
          </span>
          <h2 className="font-display mt-5 text-3xl leading-tight font-semibold">This is a demo website</h2>
          <p className="mt-3 text-ink-2">
            CINERIUM is a portfolio project. Nothing here exists — there is no cinema, no real ticket and no{' '}
            <span className="text-ink-1">{method?.name}</span> payment. No money will be taken, and nothing you typed
            leaves your browser.
          </p>
          <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row">
            <Button onClick={issueSampleTicket} className="sm:flex-1">
              Show me a sample ticket
            </Button>
            <Button variant="secondary" onClick={() => setMethod(null)} className="sm:flex-1">
              Back to payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
