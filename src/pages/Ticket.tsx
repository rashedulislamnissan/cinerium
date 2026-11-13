import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { CalendarPlus, Printer } from 'lucide-react';
import { useBooking, type Booking } from '../store/booking';
import { getShow, showContext, type Show } from '../data/schedule';
import { buildLayout } from '../lib/seats';
import { CATEGORY_LABEL } from '../data/halls';
import { taka } from '../lib/money';
import { formatDay, formatTime } from '../lib/time';
import { Button, ButtonLink, Poster } from '../components/ui';
import { formatRuntime, posterLqip } from '../data/movies';
import { LogoMark } from '../components/Logo';

function icsFor(b: Booking, show: Show, title: string, hallName: string, runtime: number) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(show.start.getTime() + (runtime + 15) * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CINERIUM//Demo//EN',
    'BEGIN:VEVENT',
    `UID:${b.ref}@cinerium.example`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(show.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title} — ${hallName} (CINERIUM demo)`,
    `DESCRIPTION:Booking ${b.ref}. Demo ticket — not valid for entry.`,
    'LOCATION:Cinerium Lakeview (demo)',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function TicketPage() {
  const { ref = '' } = useParams();
  const booking = useBooking((s) => s.bookings.find((b) => b.ref === ref));
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    // payload carries no personal data — just the reference and seat labels
    QRCode.toDataURL(`CINERIUM-DEMO:${booking.ref}:${booking.seatIds.map((s) => s.split(':')[1]).join(',')}`, {
      margin: 1,
      width: 360,
      color: { dark: '#0b0910', light: '#f1e9dc' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [booking]);

  const show = booking ? getShow(booking.showId) : undefined;

  if (!booking || !show) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-40 text-center">
        <h1 className="font-display text-4xl">Ticket not found</h1>
        <p className="mt-3 text-ink-2">
          Demo tickets live only in the browser that booked them, and older ones drop off once their show week ends.
        </p>
        <ButtonLink to="/tickets" className="mt-8">
          See my tickets
        </ButtonLink>
      </div>
    );
  }

  const { movie, hall } = showContext(show);
  const layout = buildLayout(hall);
  const seats = booking.seatIds.map((id) => layout.byId.get(id)!).filter(Boolean);

  const downloadIcs = () => {
    const blob = new Blob([icsFor(booking, show, movie.title, hall.name, movie.runtime)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${booking.ref}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="relative overflow-hidden pt-24 pb-10">
      <div
        className="absolute inset-x-0 top-0 h-[520px] scale-110 bg-cover bg-center opacity-25 blur-3xl print:hidden"
        style={{ backgroundImage: `url(${posterLqip(movie)})` }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 text-center print:hidden">
          <p className="text-sm text-success">Sample ticket issued</p>
          <h1 className="font-display mt-2 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] font-medium">
            You’re all set{booking.name !== 'Guest' ? `, ${booking.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-3 text-ink-2">This is what a CINERIUM ticket looks like. It’s a demo — it won’t get you in anywhere.</p>
        </div>

        {/* the ticket */}
        <article
          className="relative overflow-hidden rounded-lg border border-line bg-bg-2 shadow-(--shadow-e3)"
          aria-label={`Ticket ${booking.ref}`}
        >
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-[5rem] font-bold tracking-[0.2em] whitespace-nowrap text-ink-1/[0.035] select-none"
            aria-hidden
          >
            DEMO TICKET
          </div>
          <div className="grid sm:grid-cols-[180px_1fr]">
            <Poster movie={movie} size={640} className="hidden rounded-none sm:block" sizes="180px" />
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[2.25rem] leading-none font-semibold">{movie.title}</h2>
                  <p className="mt-2 text-sm text-ink-2">
                    {movie.certificate} · {formatRuntime(movie.runtime)} · {movie.language}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <LogoMark size={34} title="CINERIUM" />
                  <span className="font-mono text-sm text-champagne">{booking.ref}</span>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-3">Date</dt>
                  <dd className="font-semibold">{formatDay(show.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Time</dt>
                  <dd className="tabular font-semibold">{formatTime(show.start)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-3">Hall</dt>
                  <dd className="font-semibold">{hall.name}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs text-ink-3">Seats</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {seats.map((s) => (
                      <span key={s.id} className="rounded-xs border border-line-strong px-2 py-1 text-sm">
                        <span className="font-mono font-medium">{s.label}</span>{' '}
                        <span className="text-ink-3">{CATEGORY_LABEL[s.category]}</span>
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="perforation relative h-3 border-t border-dashed border-line-strong" aria-hidden />
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
            {qr ? (
              <img src={qr} alt={`QR code for booking ${booking.ref}`} width={148} height={148} className="rounded-sm" />
            ) : (
              <div className="h-[148px] w-[148px] rounded-sm bg-bg-3" />
            )}
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-ink-3">Name</dt>
                <dd>{booking.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Paid with</dt>
                <dd>{booking.method} (simulated)</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Total</dt>
                <dd className="tabular font-semibold text-champagne">{taka(booking.total)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Status</dt>
                <dd className="text-warning">Demo — not valid for entry</dd>
              </div>
            </dl>
          </div>
        </article>

        <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
          <Button variant="secondary" onClick={downloadIcs}>
            <CalendarPlus size={18} strokeWidth={1.5} /> Add to calendar
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={18} strokeWidth={1.5} /> Print or save as PDF
          </Button>
          <ButtonLink to="/showtimes">Book another film</ButtonLink>
        </div>
      </div>
    </div>
  );
}
