import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { GENRES, MOVIES, isNowShowing, type Genre, type Movie } from '../data/movies';
import { FilmCard } from '../components/FilmCard';

const TABS = [
  { id: 'now', label: 'Now showing' },
  { id: 'soon', label: 'Coming soon' },
  { id: 'all', label: 'All films' },
] as const;


export function FilmsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'now') as (typeof TABS)[number]['id'];
  const genre = GENRES.find((g) => g === params.get('genre')) ?? null;
  const q = params.get('q') ?? '';

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const inTab = (m: Movie) => (tab === 'now' ? isNowShowing(m) : tab === 'soon' ? !isNowShowing(m) : true);
  const counts = useMemo(() => {
    const c = new Map<Genre, number>();
    MOVIES.filter(inTab).forEach((m) => m.genres.forEach((g) => c.set(g, (c.get(g) ?? 0) + 1)));
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const list = MOVIES.filter(inTab)
    .filter((m) => !genre || m.genres.includes(genre))
    .filter((m) => {
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return [m.title, m.director, ...m.cast, ...m.genres].some((s) => s.toLowerCase().includes(needle));
    });

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6">
      <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] font-medium">Films</h1>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line">
        <div role="tablist" aria-label="Release status" className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => set('tab', t.id === 'now' ? null : t.id)}
              className={`border-b-2 pb-3 text-[0.9375rem] font-semibold transition-colors ${
                tab === t.id ? 'border-champagne text-ink-1' : 'border-transparent text-ink-2 hover:text-ink-1'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative mb-3 block w-full sm:w-72">
          <span className="sr-only">Search films, cast or genre</span>
          <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => set('q', e.target.value || null)}
            placeholder="Search films, cast or genre"
            className="h-11 w-full rounded-sm border border-line bg-bg-2 pr-3 pl-9 text-base text-ink-1 sm:text-sm placeholder:text-ink-3 focus:border-line-strong focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
        <button
          onClick={() => set('genre', null)}
          aria-pressed={!genre}
          className={`h-9 rounded-full border px-4 text-sm transition-colors ${
            !genre ? 'border-champagne bg-bg-3 text-ink-1' : 'border-line text-ink-2 hover:text-ink-1'
          }`}
        >
          Every genre
        </button>
        {GENRES.filter((g) => counts.get(g)).map((g) => (
          <button
            key={g}
            onClick={() => set('genre', genre === g ? null : g)}
            aria-pressed={genre === g}
            className={`h-9 rounded-full border px-4 text-sm transition-colors ${
              genre === g ? 'border-champagne bg-bg-3 text-ink-1' : 'border-line text-ink-2 hover:text-ink-1'
            }`}
          >
            {g} <span className="tabular text-ink-3">{counts.get(g)}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-12 rounded-md border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-2xl">No films match that</p>
          <p className="mt-2 text-ink-2">Try a different genre or search term.</p>
          <button className="mt-6 text-sm text-verdigris underline underline-offset-4" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((m, i) => (
            <FilmCard key={m.id} movie={m} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
