import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Box, Play } from 'lucide-react';
import { movieBySlug, formatRuntime, posterSrc, MOVIES, isNowShowing } from '../data/movies';
import { bookingDates, isBookable, showsFor } from '../data/schedule';
import { HALLS } from '../data/halls';
import { addDays, dayPart, dhakaToday, formatDay } from '../lib/time';
import { Button, ButtonLink, Certificate, Poster } from '../components/ui';
import { DateStrip, ShowFilterBar, ShowtimeChip, matchesFilters, type ShowFilters } from '../components/showtimes';
import { ReelModal } from '../components/ReelModal';
import { FilmCard } from '../components/FilmCard';
import { NotFoundPage } from './NotFound';

export function FilmPage() {
  const { slug = '' } = useParams();
  const movie = movieBySlug(slug);
  const [params, setParams] = useSearchParams();
  const [reel, setReel] = useState(false);
  const [filters, setFilters] = useState<ShowFilters>({ hall: 'all', part: 'any', price: 0 });

  const dates = bookingDates();
  const opening = movie ? addDays(dhakaToday(), Math.max(0, movie.opensInDays)) : dates[0];
  const firstWithShows = movie ? dates.find((d) => d >= opening && showsFor(movie.id, d).some(isBookable)) : undefined;
  const date = dates.includes(params.get('date') ?? '') ? params.get('date')! : (firstWithShows ?? opening);

  const shows = useMemo(
    () => (movie ? showsFor(movie.id, date).filter((s) => isBookable(s) && matchesFilters(s, filters, dayPart)) : []),
    [movie, date, filters],
  );

  if (!movie) return <NotFoundPage />;

  const firstShow = movie ? showsFor(movie.id).find(isBookable) : undefined;
  const others = MOVIES.filter((m) => m.id !== movie.id && m.genres.some((g) => movie.genres.includes(g))).slice(0, 4);

  return (
    <div>
      {/* hero */}
      <section className="grain relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <img
            src={posterSrc(movie, 640)}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-45 blur-[40px]"
            style={{ objectPosition: movie.focus }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,9,16,.95)_0%,rgba(11,9,16,.7)_50%,rgba(11,9,16,.35)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-0 to-transparent" />
          <div className="absolute inset-0 mix-blend-soft-light" style={{ background: movie.accent, opacity: 0.18 }} />
        </div>
        <div className="relative mx-auto grid max-w-[1280px] gap-10 px-4 pt-28 pb-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-end lg:pt-36">
          <div className="max-w-2xl">
            <h1 className="font-display text-[clamp(3rem,7vw,5.5rem)] leading-[1.02] font-medium text-balance">{movie.title}</h1>
            <p className="font-display mt-4 text-[1.5rem] leading-snug text-ink-2 italic">{movie.tagline}</p>
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
              <Certificate value={movie.certificate} />
              <span>{formatRuntime(movie.runtime)}</span>
              <span>{movie.genres.join(', ')}</span>
              <span>{movie.language}</span>
              {!isNowShowing(movie) && <span className="text-champagne">Opens {formatDay(opening, 'long')}</span>}
            </p>
            <p className="mt-6 max-w-[62ch] text-[1.0625rem] leading-relaxed text-ink-1/90">{movie.synopsis}</p>
            <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              <dt className="text-ink-3">Director</dt>
              <dd>{movie.director}</dd>
              <dt className="text-ink-3">Starring</dt>
              <dd>{movie.cast.join(', ')}</dd>
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#tickets" className="btn-primary inline-flex h-12 items-center rounded-sm px-6 font-semibold">
                {isNowShowing(movie) ? 'Get tickets' : 'Book early'}
              </a>
              <Button variant="secondary" size="lg" onClick={() => setReel(true)}>
                <Play size={18} strokeWidth={1.5} /> Watch the reel
              </Button>
              {firstShow && (
                <ButtonLink to={`/book/${firstShow.id}?view=3d`} variant="ghost" size="lg">
                  <Box size={18} strokeWidth={1.5} /> Preview a seat in 3D
                </ButtonLink>
              )}
            </div>
          </div>
          <Poster movie={movie} size={1200} priority className="hidden shadow-(--shadow-e3) md:block" sizes="320px" />
        </div>
      </section>

      {/* tickets */}
      <section id="tickets" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 sm:px-6" aria-labelledby="tickets-h">
        <div className="rounded-md border border-line bg-bg-1 p-4 sm:p-8">
          <h2 id="tickets-h" className="font-display text-[clamp(2rem,4vw,2.75rem)] leading-tight font-medium">
            Choose a time
          </h2>
          <div className="mt-6 space-y-6">
            <DateStrip
              dates={dates}
              value={date}
              disabledBefore={opening}
              onChange={(d) => setParams({ date: d }, { replace: true, preventScrollReset: true })}
            />
            <ShowFilterBar value={filters} onChange={setFilters} />
          </div>
          <div className="mt-8 space-y-6 border-t border-line pt-8">
            {shows.length === 0 ? (
              <p className="text-ink-2">
                No shows match on {formatDay(date, 'long')}.{' '}
                <button
                  className="text-verdigris underline underline-offset-4"
                  onClick={() => setFilters({ hall: 'all', part: 'any', price: 0 })}
                >
                  Clear filters
                </button>{' '}
                or try another day.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {shows.map((s) => (
                    <ShowtimeChip key={s.id} show={s} />
                  ))}
                </div>
                <p className="text-sm text-ink-3">
                  Not sure which hall?{' '}
                  {HALLS.map((h, i) => (
                    <span key={h.id}>
                      <Link to={`/halls#${h.slug}`} className="text-verdigris hover:text-ink-1">
                        {h.short}
                      </Link>
                      {i < HALLS.length - 1 ? ', ' : ''}
                    </span>
                  ))}{' '}
                  — every seat can be previewed in 3D.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="mx-auto mt-24 max-w-[1280px] px-4 sm:px-6" aria-labelledby="more-h">
          <h2 id="more-h" className="font-display mb-8 text-[clamp(1.75rem,3vw,2.25rem)] font-medium">
            If you like {movie.genres[0].toLowerCase()}
          </h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {others.map((m) => (
              <FilmCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}

      <ReelModal open={reel} onClose={() => setReel(false)} title={movie.title} />
    </div>
  );
}
