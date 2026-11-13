import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingDates, isBookable, showsOn } from '../data/schedule';
import { MOVIES, formatRuntime } from '../data/movies';
import { HALLS } from '../data/halls';
import { dayPart, formatDay } from '../lib/time';
import { Certificate, Poster } from '../components/ui';
import { DateStrip, ShowFilterBar, ShowtimeChip, matchesFilters, type ShowFilters } from '../components/showtimes';

export function ShowtimesPage() {
  const [params, setParams] = useSearchParams();
  const dates = bookingDates();
  const date = dates.includes(params.get('date') ?? '') ? params.get('date')! : dates[0];
  const filters: ShowFilters = {
    hall: HALLS.some((h) => h.slug === params.get('hall')) ? params.get('hall')! : 'all',
    part: (['morning', 'afternoon', 'evening', 'night'].includes(params.get('time') ?? '') ? params.get('time') : 'any') as ShowFilters['part'],
    price: Number(params.get('price')) || 0,
  };
  const film = params.get('film');

  const update = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '' || v === 'all' || v === 'any' || v === 0) next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace: true });
  };

  const { byFilm, finished } = useMemo(() => {
    const day = showsOn(date);
    const shows = day.filter((s) => isBookable(s) && matchesFilters(s, filters, dayPart) && (!film || s.movieId === film));
    return {
      finished: day.filter((s) => !isBookable(s)).length,
      byFilm: MOVIES.map((m) => ({ movie: m, shows: shows.filter((s) => s.movieId === m.id) })).filter((x) => x.shows.length),
    };
  }, [date, filters.hall, filters.part, filters.price, film]); // eslint-disable-line react-hooks/exhaustive-deps

  const filmTitle = film ? MOVIES.find((m) => m.id === film)?.title : null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6">
      <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] font-medium">Showtimes</h1>
      <p className="mt-3 max-w-xl text-ink-2">
        Three halls, four shows each, every day. Pick a day, then narrow it down by hall, time or price.
      </p>

      <div className="mt-10 space-y-6 rounded-md border border-line bg-bg-1 p-4 sm:p-6">
        <DateStrip dates={dates} value={date} onChange={(d) => update({ date: d === dates[0] ? null : d })} />
        <ShowFilterBar
          value={filters}
          onChange={(f) => update({ hall: f.hall, time: f.part, price: f.price })}
        />
        {filmTitle && (
          <p className="text-sm text-ink-2">
            Showing only <span className="text-ink-1">{filmTitle}</span>.{' '}
            <button className="text-verdigris underline underline-offset-4" onClick={() => update({ film: null })}>
              Show all films
            </button>
          </p>
        )}
      </div>

      <h2 className="sr-only">Films on {formatDay(date, 'long')}</h2>
      {finished > 0 && (
        <p className="mt-6 text-sm text-ink-3">
          {finished} earlier {finished === 1 ? 'show has' : 'shows have'} already started today and {finished === 1 ? 'is' : 'are'} not listed.
        </p>
      )}
      {byFilm.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-2xl">Nothing matches on {formatDay(date, 'long')}</p>
          <p className="mt-2 text-ink-2">Try another hall, a different time of day, or a higher price limit.</p>
          <button
            className="mt-6 text-sm text-verdigris underline underline-offset-4"
            onClick={() => update({ hall: null, time: null, price: null, film: null })}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-line">
          {byFilm.map(({ movie, shows }) => (
            <li key={movie.id} className="grid gap-5 py-8 sm:grid-cols-[120px_1fr] sm:gap-8">
              <Link to={`/films/${movie.slug}`} className="flex gap-4 sm:block">
                <Poster movie={movie} className="w-24 shrink-0 sm:w-full" sizes="120px" />
                <div className="sm:hidden">
                  <p className="font-display text-2xl leading-tight font-semibold">{movie.title}</p>
                  <p className="mt-1 text-sm text-ink-2">{movie.genres.join(', ')}</p>
                </div>
              </Link>
              <div>
                <div className="hidden items-baseline gap-4 sm:flex">
                  <Link to={`/films/${movie.slug}`} className="font-display text-3xl leading-tight font-semibold hover:text-champagne">
                    {movie.title}
                  </Link>
                </div>
                <p className="mt-1 hidden items-center gap-3 text-sm text-ink-2 sm:flex">
                  <Certificate value={movie.certificate} />
                  {formatRuntime(movie.runtime)}
                  <span>{movie.genres.join(', ')}</span>
                  {movie.opensInDays > 0 && <span className="text-champagne">Advance booking</span>}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {shows.map((s) => (
                    <ShowtimeChip key={s.id} show={s} />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
