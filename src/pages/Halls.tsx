import { HALLS, CATEGORY_LABEL, type SeatCategory } from '../data/halls';
import { showContext } from '../data/schedule';
import { HallPlan, nextShowIn } from '../components/HallPlan';
import { taka } from '../lib/money';
import { ButtonLink } from '../components/ui';
import { formatTime, relativeDayLabel } from '../lib/time';

export function HallsPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6">
      <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] font-medium">Our halls</h1>
      <p className="mt-3 max-w-2xl text-ink-2">
        Three rooms, three different ways to watch. Every seat in every hall can be previewed in 3D before you book it — the
        film plays on the screen so you can see exactly what you’ll see.
      </p>

      <div className="mt-14 space-y-20">
        {HALLS.map((hall) => {
          const next = nextShowIn(hall.id);
          return (
            <section key={hall.id} id={hall.slug} className="scroll-mt-24" aria-labelledby={`${hall.slug}-h`}>
              <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
                <div>
                  <p className="text-sm text-champagne">{hall.format}</p>
                  <h2 id={`${hall.slug}-h`} className="font-display mt-1 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-medium">
                    {hall.name}
                  </h2>
                  <p className="mt-4 max-w-[52ch] text-ink-2">{hall.description}</p>
                  <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {hall.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-ink-1">
                        <span className="h-px w-3 bg-champagne" aria-hidden />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                    {(Object.entries(hall.prices) as [SeatCategory, number][]).map(([c, p]) => (
                      <div key={c}>
                        <dt className="text-xs text-ink-3">{CATEGORY_LABEL[c]}</dt>
                        <dd className="tabular font-display text-2xl font-semibold text-champagne">{taka(p)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-ink-3">Per seat. Matinees (before 3 PM, Sun–Thu) −15%, Fri &amp; Sat +10%.</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    {next && (
                      <ButtonLink to={`/book/${next.id}?view=3d`}>Sit in {hall.short} in 3D</ButtonLink>
                    )}
                    {next && (
                      <ButtonLink to={`/showtimes?hall=${hall.slug}`} variant="secondary">
                        Showtimes in this hall
                      </ButtonLink>
                    )}
                  </div>
                  {next && (
                    <p className="mt-3 text-xs text-ink-3">
                      3D preview uses the next show: {showContext(next).movie.title}, {relativeDayLabel(next.date).toLowerCase()} at{' '}
                      {formatTime(next.start)}.
                    </p>
                  )}
                </div>
                <div className="glow-projector rounded-md border border-line bg-bg-1 p-5 sm:p-8">
                  <HallPlan hall={hall} className="mx-auto max-w-[640px]" />
                  <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-2">
                    {(Object.keys(hall.prices) as SeatCategory[]).map((c) => (
                      <span key={c} className="inline-flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-[3px]"
                          style={{ background: `var(--color-seat-${c === 'vip' ? 'vip' : c})`, opacity: 0.75 }}
                          aria-hidden
                        />
                        {CATEGORY_LABEL[c]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
