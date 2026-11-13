import { Link } from 'react-router-dom';
import { formatRuntime, isNowShowing, type Movie } from '../data/movies';
import { Certificate, Poster } from './ui';
import { addDays, dhakaToday, formatDay } from '../lib/time';

export function FilmCard({ movie, priority = false }: { movie: Movie; priority?: boolean }) {
  return (
    <Link to={`/films/${movie.slug}`} className="group block rounded-(--radius-poster)">
      <div className="relative overflow-hidden rounded-(--radius-poster) shadow-(--shadow-e2)">
        <Poster
          movie={movie}
          priority={priority}
          className="transition-transform duration-700 ease-(--ease-standard) group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between bg-gradient-to-t from-bg-0/95 via-bg-0/60 to-transparent p-3 pt-14 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <span className="text-xs text-ink-2">{formatRuntime(movie.runtime)}</span>
          <span className="rounded-xs bg-garnet px-2.5 py-1 text-xs font-semibold text-ink-1">
            {isNowShowing(movie) ? 'Get tickets' : 'Book early'}
          </span>
        </div>
        {!isNowShowing(movie) && (
          <span className="absolute top-2.5 left-2.5 rounded-xs bg-bg-0/85 px-2 py-1 text-xs font-semibold text-champagne backdrop-blur">
            Opens {formatDay(addDays(dhakaToday(), movie.opensInDays))}
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-display text-[1.375rem] leading-tight font-semibold text-ink-1 group-hover:text-champagne">
          {movie.title}
        </h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-3">
          <Certificate value={movie.certificate} />
          {movie.genres.join(', ')}
        </p>
      </div>
    </Link>
  );
}
