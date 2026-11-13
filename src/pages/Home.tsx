import { REEL_POSTER, REEL_SRC } from '../lib/asset';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { GENRES, MOVIES, formatRuntime, isNowShowing, posterSrc, type Movie } from '../data/movies';
import { HALLS } from '../data/halls';
import { allShows, bookingDates, isBookable, showsFor } from '../data/schedule';
import { addDays, dhakaToday, formatDay, formatTime, relativeDayLabel } from '../lib/time';
import { taka } from '../lib/money';
import { Button, ButtonLink, Certificate, Poster, SectionHeader } from '../components/ui';
import { ReelModal } from '../components/ReelModal';
import { FilmCard } from '../components/FilmCard';
import { HallPlan, nextShowIn } from '../components/HallPlan';

const FEATURED = MOVIES.filter((m) => m.featured);

function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reel, setReel] = useState(false);
  const movie = FEATURED[i];
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // render just the poster this screen shows — a display:none <img> still downloads
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => setI((n) => (n + 1) % FEATURED.length), 9000);
    return () => clearTimeout(t);
  }, [i, paused, reduced]);

  // only fetch a slide's backdrop once it has been shown — not all three up front
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => setSeen((s) => (s.has(i) ? s : new Set(s).add(i))), [i]);

  const next = showsFor(movie.id).filter(isBookable).slice(0, 4);

  return (
    <section
      className="grain relative isolate flex min-h-[min(100svh,920px)] items-end overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      aria-roledescription="carousel"
      aria-label="Featured films"
    >
      {/* backdrop: the poster itself, blown up and softened */}
      {FEATURED.map((m, n) => (
        <div
          key={m.id}
          aria-hidden
          className={`absolute inset-0 -z-10 transition-opacity duration-1000 ${n === i ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* blurred 28px, so the 640px file is indistinguishable from the 1200px one */}
          <img
            src={seen.has(n) ? posterSrc(m, 640) : undefined}
            alt=""
            className={`h-full w-full object-cover opacity-60 blur-[28px] ${n === i ? 'animate-ken-burns' : ''}`}
            style={{ objectPosition: m.focus }}
          />
          <div className="absolute inset-0 mix-blend-soft-light" style={{ background: m.accent, opacity: 0.25 }} />
        </div>
      ))}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,9,16,.94)_0%,rgba(11,9,16,.62)_48%,rgba(11,9,16,.2)_85%)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-bg-0 to-transparent" />

      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 pt-28 pb-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] md:items-end md:pb-20">
        <div key={movie.id} className="animate-rise-in max-w-2xl">
          {!wide && (
            <Link to={`/films/${movie.slug}`} className="mb-7 block w-36" tabIndex={-1} aria-hidden>
              <Poster movie={movie} priority className="shadow-(--shadow-e3)" sizes="144px" />
            </Link>
          )}
          <p className="text-sm text-champagne">{isNowShowing(movie) ? 'Now showing' : 'Coming soon'}</p>
          <h1 className="font-display mt-3 text-[clamp(3.25rem,8.5vw,6.5rem)] leading-[1.02] font-medium text-balance">
            {movie.title}
          </h1>
          <p className="font-display mt-5 max-w-xl text-[clamp(1.25rem,2.2vw,1.625rem)] leading-snug text-ink-2 italic">
            {movie.tagline}
          </p>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
            <Certificate value={movie.certificate} />
            <span>{formatRuntime(movie.runtime)}</span>
            <span>{movie.genres.join(', ')}</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={`/films/${movie.slug}#tickets`} size="lg">
              Get tickets
            </ButtonLink>
            <Button variant="secondary" size="lg" onClick={() => setReel(true)}>
              <Play size={18} strokeWidth={1.5} /> Watch the reel
            </Button>
          </div>
          {next.length > 0 && (
            <div className="mt-10">
              <p className="mb-3 text-xs text-ink-3">Next shows</p>
              <div className="flex flex-wrap gap-2">
                {next.map((s) => (
                  <Link
                    key={s.id}
                    to={`/book/${s.id}`}
                    className="glass rounded-sm px-3 py-2 text-sm transition-colors hover:border-champagne-deep"
                  >
                    <span className="text-ink-3">{relativeDayLabel(s.date)} </span>
                    <span className="tabular font-semibold text-ink-1">{formatTime(s.start)}</span>
                    <span className="text-ink-3"> · {HALLS.find((h) => h.id === s.hallId)!.short}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block">
          {wide && (
            <Link to={`/films/${movie.slug}`} className="block" aria-label={`${movie.title} — details`} key={movie.id}>
              <div className="relative animate-fade-in">
                <div className="absolute -inset-3 rounded-[10px] border border-champagne/25" aria-hidden />
                <Poster movie={movie} size={1200} priority className="shadow-(--shadow-e3)" sizes="360px" />
              </div>
            </Link>
          )}
          <div className="mt-6 flex items-center justify-between gap-3" role="group" aria-label="Choose featured film">
            {FEATURED.map((m, n) => (
              <button
                key={m.id}
                onClick={() => setI(n)}
                aria-label={`Show ${m.title}`}
                aria-current={n === i}
                className="group flex-1 text-left"
              >
                <span className="relative block h-0.5 overflow-hidden rounded-full bg-line">
                  <span
                    className={`absolute inset-y-0 left-0 bg-champagne ${n === i ? 'w-full' : 'w-0'}`}
                    style={{ transition: n === i && !paused && !reduced ? 'width 9s linear' : 'none' }}
                  />
                </span>
                <span className={`mt-2 block truncate text-xs ${n === i ? 'text-ink-1' : 'text-ink-3 group-hover:text-ink-2'}`}>
                  {m.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <ReelModal open={reel} onClose={() => setReel(false)} title={movie.title} />
    </section>
  );
}

function QuickBook() {
  const navigate = useNavigate();
  const dates = bookingDates();
  const [film, setFilm] = useState('');
  const [date, setDate] = useState(dates[0]);
  const [hall, setHall] = useState('');
  const select =
    'h-12 w-full appearance-none rounded-sm border border-line bg-bg-3 px-3.5 text-ink-1 focus:border-line-strong focus:outline-none';
  return (
    <section className="relative z-10 mx-auto -mt-6 max-w-[1280px] px-4 sm:px-6" aria-labelledby="qb-h">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const p = new URLSearchParams();
          if (film) p.set('film', film);
          if (date !== dates[0]) p.set('date', date);
          if (hall) p.set('hall', hall);
          navigate(`/showtimes${p.size ? `?${p}` : ''}`);
        }}
        className="grid gap-4 rounded-md border border-line bg-bg-2 p-5 shadow-(--shadow-e2) md:grid-cols-[auto_1fr_1fr_1fr_auto] md:items-end"
      >
        <h2 id="qb-h" className="font-display text-2xl leading-none font-semibold md:pr-4 md:pb-3">
          Find a show
        </h2>
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink-3">Film</span>
          <select className={select} value={film} onChange={(e) => setFilm(e.target.value)}>
            <option value="">Any film</option>
            {MOVIES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink-3">Day</span>
          <select className={select} value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {relativeDayLabel(d) === 'Today' || relativeDayLabel(d) === 'Tomorrow'
                  ? `${relativeDayLabel(d)}, ${formatDay(d).split(' ').slice(1).join(' ')}`
                  : formatDay(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink-3">Hall</span>
          <select className={select} value={hall} onChange={(e) => setHall(e.target.value)}>
            <option value="">Any hall</option>
            {HALLS.map((h) => (
              <option key={h.id} value={h.slug}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary h-12 rounded-sm px-6 font-semibold text-ink-1">
          See times
        </button>
      </form>
    </section>
  );
}

function Rail({ movies }: { movies: Movie[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="relative">
      <div className="absolute -top-16 right-0 hidden gap-2 md:flex">
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll films left"
          className="grid h-11 w-11 place-items-center rounded-sm border border-line text-ink-2 hover:border-line-strong hover:text-ink-1"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll films right"
          className="grid h-11 w-11 place-items-center rounded-sm border border-line text-ink-2 hover:border-line-strong hover:text-ink-1"
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {movies.map((m) => (
          <div key={m.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-[22vw] lg:w-[228px]">
            <FilmCard movie={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatPerspective() {
  const featured = FEATURED[0];
  const show = showsFor(featured.id).find(isBookable) ?? allShows().find(isBookable);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // only play while on screen
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), {
      threshold: 0.2,
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden border-y border-line bg-bg-1 py-24" aria-labelledby="persp-h">
      <div className="glow-projector absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <h2 id="persp-h" className="font-display text-[clamp(2.5rem,5vw,4.25rem)] leading-[1] font-medium text-balance">
            Sit in the seat before you buy it
          </h2>
          <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-2">
            Every hall is modelled in 3D, seat by seat. Click any seat and you’re sitting in it — the film playing on the
            screen, the rows and heads in front of you, the angle you’ll actually have.
          </p>
          <ul className="mt-8 space-y-3 text-ink-1">
            <li className="flex gap-3">
              <span className="mt-2.5 h-px w-4 shrink-0 bg-champagne" aria-hidden />
              See how far you’ll be from the screen, in metres and degrees.
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-px w-4 shrink-0 bg-champagne" aria-hidden />
              Look around from your seat, then hop to the one next to it.
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-px w-4 shrink-0 bg-champagne" aria-hidden />
              The same seat map in 2D and 3D — pick in either.
            </li>
          </ul>
          {show && (
            <ButtonLink to={`/book/${show.id}?view=3d`} size="lg" className="mt-10">
              Try a seat view
            </ButtonLink>
          )}
        </div>

        {/* a seat's-eye illustration: the reel on a curved screen, seat backs in the foreground */}
        <div className="relative [perspective:1100px]" aria-hidden>
          <div className="relative mx-auto w-full max-w-[680px] [transform:rotateX(4deg)] [transform-style:preserve-3d]">
            <div className="absolute -inset-x-10 -top-10 bottom-1/3 rounded-[50%] bg-[radial-gradient(closest-side,rgba(159,176,200,.18),transparent)] blur-2xl" />
            <div className="overflow-hidden rounded-[6px] shadow-[0_0_80px_rgba(159,176,200,0.18)] [clip-path:polygon(0_3%,50%_0,100%_3%,100%_97%,50%_100%,0_97%)]">
              <video
                ref={videoRef}
                className="block aspect-[2.39/1] w-full object-cover"
                src={REEL_SRC}
                poster={REEL_POSTER}
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
            <svg viewBox="0 0 680 210" className="relative -mt-2 block w-full" role="presentation">
              <defs>
                <linearGradient id="seatback" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#2a1820" />
                  <stop offset="1" stopColor="#0b0910" />
                </linearGradient>
              </defs>
              {[0, 1, 2].map((row) => {
                const y = 40 + row * 58;
                const w = 52 + row * 16;
                const count = Math.floor(680 / (w + 8)) + 2;
                const offset = row % 2 ? -w / 2 : 0;
                return (
                  <g key={row} opacity={0.55 + row * 0.22}>
                    {Array.from({ length: count }, (_, k) => (
                      <rect key={k} x={offset + k * (w + 8)} y={y} width={w} height={210} rx={w * 0.28} fill="url(#seatback)" />
                    ))}
                  </g>
                );
              })}
              <circle cx="300" cy="78" r="16" fill="#120e16" />
              <rect x="276" y="92" width="48" height="60" rx="20" fill="#120e16" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function GenreIndex() {
  const rows = GENRES.map((g) => ({ g, films: MOVIES.filter((m) => m.genres.includes(g)) })).filter((r) => r.films.length);
  return (
    <section className="mx-auto mt-28 max-w-[1280px] px-4 sm:px-6" aria-labelledby="genre-h">
      <SectionHeader id="genre-h" title="By genre" sub={`${MOVIES.length} films on this week. Find your mood.`} />
      <ul className="border-t border-line">
        {rows.map(({ g, films }) => (
          <li key={g} className="border-b border-line">
            <div className="group grid items-center gap-4 py-5 sm:grid-cols-[220px_1fr_auto]">
              <Link
                to={`/films?tab=all&genre=${encodeURIComponent(g)}`}
                className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-none font-medium text-ink-1 hover:text-champagne"
              >
                {g}
              </Link>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {films.map((m) => (
                  <Link key={m.id} to={`/films/${m.slug}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink-1">
                    <span className="block w-7 shrink-0">
                      <Poster movie={m} sizes="28px" className="rounded-[3px]" />
                    </span>
                    <span className="text-[0.9375rem]">{m.title}</span>
                  </Link>
                ))}
              </div>
              <span className="tabular hidden text-sm text-ink-3 sm:block">
                {films.length} {films.length === 1 ? 'film' : 'films'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComingSoon() {
  const soon = MOVIES.filter((m) => !isNowShowing(m));
  if (!soon.length) return null;
  return (
    <section className="mx-auto mt-28 max-w-[1280px] px-4 sm:px-6" aria-labelledby="soon-h">
      <SectionHeader id="soon-h" title="Opening this week" sub="Advance booking is open." />
      <div className="grid gap-6 md:grid-cols-2">
        {soon.map((m) => {
          const opens = addDays(dhakaToday(), m.opensInDays);
          return (
            <Link
              key={m.id}
              to={`/films/${m.slug}`}
              className="group grid grid-cols-[120px_1fr] gap-5 rounded-md border border-line bg-bg-2 p-4 transition-colors hover:border-line-strong sm:grid-cols-[150px_1fr]"
            >
              <Poster movie={m} sizes="150px" />
              <div className="flex flex-col py-1">
                <p className="text-sm text-champagne">Opens {formatDay(opens, 'long')}</p>
                <h3 className="font-display mt-1 text-[1.875rem] leading-tight font-semibold group-hover:text-champagne">
                  {m.title}
                </h3>
                <p className="font-display mt-2 text-lg text-ink-2 italic">{m.tagline}</p>
                <p className="mt-auto pt-4 text-sm text-ink-3">
                  {m.genres.join(', ')} · {formatRuntime(m.runtime)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HallsTrio() {
  return (
    <section className="mx-auto mt-28 max-w-[1280px] px-4 sm:px-6" aria-labelledby="halls-h">
      <SectionHeader
        id="halls-h"
        title="Three halls, three ways to watch"
        aside={
          <ButtonLink to="/halls" variant="secondary">
            Compare the halls
          </ButtonLink>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        {HALLS.map((h) => {
          const next = nextShowIn(h.id);
          return (
            <article key={h.id} className="flex flex-col rounded-md border border-line bg-bg-1 p-5">
              <div className="glow-projector -mx-1 rounded-sm bg-bg-0/60 p-4">
                <HallPlan hall={h} />
              </div>
              <h3 className="font-display mt-5 text-[1.75rem] leading-tight font-semibold">{h.name}</h3>
              <p className="text-sm text-champagne">{h.format}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{h.description}</p>
              <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                <p className="text-sm text-ink-3">
                  Seats from{' '}
                  <span className="tabular font-display text-2xl font-semibold text-ink-1">
                    {taka(Math.min(...Object.values(h.prices)))}
                  </span>
                </p>
                {next && (
                  <Link to={`/book/${next.id}?view=3d`} className="text-sm font-semibold text-verdigris hover:text-ink-1">
                    Sit in it
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <QuickBook />
      <section className="mx-auto mt-24 max-w-[1280px] px-4 sm:px-6" aria-labelledby="now-h">
        <SectionHeader id="now-h" title="Now showing" />
        <Rail movies={MOVIES.filter(isNowShowing)} />
      </section>
      <div className="mt-28">
        <SeatPerspective />
      </div>
      <GenreIndex />
      <ComingSoon />
      <HallsTrio />
    </>
  );
}
