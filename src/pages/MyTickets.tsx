import { Link } from 'react-router-dom';
import { useBooking } from '../store/booking';
import { getShow, showContext } from '../data/schedule';
import { formatDay, formatTime } from '../lib/time';
import { taka } from '../lib/money';
import { ButtonLink, Poster } from '../components/ui';

export default function MyTicketsPage() {
  const bookings = useBooking((s) => s.bookings);
  const items = bookings
    .map((b) => ({ b, show: getShow(b.showId) }))
    .filter((x): x is { b: typeof x.b; show: NonNullable<typeof x.show> } => !!x.show);
  const now = Date.now();
  const upcoming = items.filter((x) => x.show.start.getTime() > now);
  const past = items.filter((x) => x.show.start.getTime() <= now);

  return (
    <div className="mx-auto max-w-[960px] px-4 pt-28 sm:px-6">
      <h1 className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.05] font-medium">My tickets</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Sample tickets you’ve booked on this device. They’re stored only in this browser.
      </p>

      {items.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-2xl">No tickets yet</p>
          <p className="mt-2 text-ink-2">Pick a film, sit in a few seats in 3D, and book the one you like.</p>
          <ButtonLink to="/showtimes" className="mt-6">
            Find a show
          </ButtonLink>
        </div>
      ) : (
        [
          ['Coming up', upcoming],
          ['Past', past],
        ].map(([title, list]) =>
          (list as typeof items).length ? (
            <section key={title as string} className="mt-12">
              <h2 className="mb-4 text-lg font-semibold">{title as string}</h2>
              <ul className="space-y-3">
                {(list as typeof items).map(({ b, show }) => {
                  const { movie, hall } = showContext(show);
                  return (
                    <li key={b.ref}>
                      <Link
                        to={`/tickets/${b.ref}`}
                        className="flex items-center gap-4 rounded-md border border-line bg-bg-2 p-3 transition-colors hover:border-line-strong"
                      >
                        <Poster movie={movie} className="w-14 shrink-0" sizes="56px" />
                        <div className="min-w-0 flex-1">
                          <p className="font-display truncate text-xl font-semibold">{movie.title}</p>
                          <p className="text-sm text-ink-2">
                            {formatDay(show.date)}, <span className="tabular">{formatTime(show.start)}</span> · {hall.name}
                          </p>
                          <p className="text-sm text-ink-3">
                            {b.seatIds.map((s) => s.split(':')[1]).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-champagne">{b.ref}</p>
                          <p className="tabular text-sm text-ink-2">{taka(b.total)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
