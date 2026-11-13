import { HALLS, hallById, type Hall, type SeatCategory } from './halls';
import { MOVIES, movieById, type Movie } from './movies';
import { addDays, at, dayOffset, dhakaToday, weekday } from '../lib/time';
import { hashString, mulberry32 } from '../lib/rng';
import { buildLayout, type Seat } from '../lib/seats';

export const BOOKING_WINDOW_DAYS = 7;
/** Online sales close this many minutes before the show starts. */
export const SALES_CUTOFF_MIN = 15;

export type Show = {
  id: string; // `${ymd}_${hallSlug}_${HHMM}`
  movieId: string;
  hallId: string;
  date: string; // YYYY-MM-DD (Dhaka)
  time: string; // HH:MM (Dhaka)
  start: Date;
  /** Final per-seat price for each category this hall sells, after day/time rules. */
  prices: Partial<Record<SeatCategory, number>>;
  priceRule: 'matinee' | 'weekend' | 'standard';
};

export function bookingDates(): string[] {
  const today = dhakaToday();
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
}

function priceRuleFor(date: string, time: string): Show['priceRule'] {
  const wd = weekday(date);
  if (wd === 5 || wd === 6) return 'weekend'; // Fri/Sat — the Bangladeshi weekend
  if (Number(time.slice(0, 2)) < 15) return 'matinee';
  return 'standard';
}

export const PRICE_RULE_LABEL: Record<Show['priceRule'], string> = {
  matinee: 'Matinee −15%',
  weekend: 'Weekend +10%',
  standard: 'Standard price',
};

function applyRule(base: number, rule: Show['priceRule']) {
  const k = rule === 'matinee' ? 0.85 : rule === 'weekend' ? 1.1 : 1;
  return Math.round((base * k) / 10) * 10;
}

function makeShow(movie: Movie, hall: Hall, date: string, time: string): Show {
  const priceRule = priceRuleFor(date, time);
  const prices: Show['prices'] = {};
  for (const [cat, base] of Object.entries(hall.prices) as [SeatCategory, number][]) {
    prices[cat] = applyRule(base, priceRule);
  }
  return {
    id: `${date}_${hall.slug}_${time.replace(':', '')}`,
    movieId: movie.id,
    hallId: hall.id,
    date,
    time,
    start: at(date, time),
    prices,
    priceRule,
  };
}

const dayCache = new Map<string, Show[]>();

/** Deterministic programme: every hall runs its slots every day; films rotate through the halls. */
export function showsOn(date: string): Show[] {
  const hit = dayCache.get(date);
  if (hit) return hit;
  const off = dayOffset(date);
  // past dates (old tickets) use today's line-up; release dates are relative to today
  const eligible = MOVIES.filter((m) => m.opensInDays <= Math.max(0, off));
  const dayNum = Math.floor(at(date, '12:00').getTime() / 86_400_000);
  const shows: Show[] = [];

  HALLS.forEach((hall, hi) => {
    const start = (dayNum * 5 + hi * 3) % eligible.length;
    hall.slots.forEach((time, si) => {
      // newly opened films get their opening day on the Grand screen
      let movie = eligible[(start + si) % eligible.length];
      const opener = eligible.find((m) => m.opensInDays === off && off > 0);
      if (opener && hall.slug === 'grand' && si === 2) movie = opener;
      shows.push(makeShow(movie, hall, date, time));
    });
  });

  shows.sort((a, b) => a.start.getTime() - b.start.getTime());
  dayCache.set(date, shows);
  return shows;
}

export function allShows(): Show[] {
  return bookingDates().flatMap(showsOn);
}

export function showsFor(movieId: string, date?: string): Show[] {
  const src = date ? showsOn(date) : allShows();
  return src.filter((s) => s.movieId === movieId);
}

export function getShow(id: string): Show | undefined {
  const [date] = id.split('_');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return showsOn(date).find((s) => s.id === id);
}

export function isBookable(show: Show, now = Date.now()) {
  return show.start.getTime() - SALES_CUTOFF_MIN * 60_000 > now;
}

export function minPrice(show: Show) {
  return Math.min(...Object.values(show.prices));
}

export function showContext(show: Show) {
  return { movie: movieById(show.movieId)!, hall: hallById(show.hallId) };
}

/* ------------------------------------------------------------------
   Demo occupancy.
   There is no server in this demo, so seats already "sold" to other
   (fictional) customers are generated deterministically from the show
   id: the same show always has the same sold seats, on every device.
   Evening and weekend shows run fuller than matinees, and seats sell
   in small groups toward the centre, like real audiences.
------------------------------------------------------------------- */
export type SeatStatus = 'available' | 'sold' | 'held' | 'mine';
const occCache = new Map<string, Map<string, SeatStatus>>();

export function demoOccupancy(show: Show): Map<string, SeatStatus> {
  const hit = occCache.get(show.id);
  if (hit) return hit;
  const layout = buildLayout(hallById(show.hallId));
  const rand = mulberry32(hashString(show.id));
  const hour = Number(show.time.slice(0, 2));
  const off = Math.max(0, dayOffset(show.date));
  let target = hour >= 18 ? 0.5 + rand() * 0.3 : hour >= 15 ? 0.3 + rand() * 0.25 : 0.12 + rand() * 0.22;
  if (show.priceRule === 'weekend') target += 0.1;
  target *= Math.max(0.25, 1 - off * 0.12);
  const opening = movieById(show.movieId)!.opensInDays;
  if (opening > 0 && opening === off) target = Math.min(0.92, target + 0.3);

  const status = new Map<string, SeatStatus>();
  const total = layout.seats.length;
  const wanted = Math.round(total * Math.min(target, 0.95));
  const { minX, maxX, maxY } = layout.bounds;
  const cx = (minX + maxX) / 2;
  const span = (maxX - minX) / 2 || 1;

  const weight = (s: Seat) => {
    const centrality = 1 - Math.abs(s.x2d - cx) / span;
    const depth = 1 - Math.abs(s.y2d / (maxY || 1) - 0.6);
    return 0.25 + centrality * 1.2 + depth * 0.8 + (s.wheelchair ? -0.2 : 0);
  };

  let sold = 0;
  let guard = 0;
  while (sold < wanted && guard++ < total * 6) {
    const s = layout.seats[Math.floor(rand() * total)];
    if (status.has(s.id) || rand() * 2.2 > weight(s)) continue;
    const row = layout.rows[s.rowIndex].seats;
    const group = s.pairId ? 2 : 1 + Math.floor(rand() * 4);
    let i = row.indexOf(s);
    if (s.pairId && row[i].number % 2 === 0) i -= 1;
    for (let k = 0; k < group && i + k < row.length; k++) {
      const t = row[i + k];
      if (status.has(t.id)) break;
      status.set(t.id, 'sold');
      sold++;
    }
  }
  // a handful of seats are mid-checkout for other customers
  const holds = Math.round(total * 0.015);
  for (let n = 0; n < holds; n++) {
    const s = layout.seats[Math.floor(rand() * total)];
    if (!status.has(s.id) && !s.pairId) status.set(s.id, 'held');
  }
  occCache.set(show.id, status);
  return status;
}

export function availability(show: Show, extraTaken = 0) {
  const total = buildLayout(hallById(show.hallId)).seats.length;
  const taken = demoOccupancy(show).size + extraTaken;
  const free = Math.max(0, total - taken);
  const ratio = free / total;
  const label =
    free === 0 ? 'Sold out' : ratio < 0.1 ? 'Few seats left' : ratio < 0.4 ? 'Filling fast' : 'Good availability';
  return { total, free, ratio, label };
}
