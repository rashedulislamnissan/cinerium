import { asset } from '../lib/asset';

export type Genre =
  | 'Horror'
  | 'Thriller'
  | 'Mystery'
  | 'Sci-Fi'
  | 'Action'
  | 'Drama'
  | 'Comedy'
  | 'Fantasy'
  | 'Adventure';

export type Movie = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  synopsis: string;
  genres: Genre[];
  runtime: number; // minutes
  certificate: 'U' | 'PG' | '12A' | '15' | '18';
  language: string;
  director: string;
  cast: string[];
  /** Days from today the film opens. ≤ 0 = now showing. */
  opensInDays: number;
  /** Accent sampled by eye from the poster, then clamped to the palette's chroma band. */
  accent: string;
  /** Focal point of the poster for cover-crops (CSS object-position). */
  focus: string;
  featured?: boolean;
};

export const MOVIES: Movie[] = [
  {
    id: 'm-tidelocked',
    slug: 'tidelocked',
    title: 'Tidelocked',
    tagline: 'Locked between eternal day and endless night.',
    synopsis:
      'A salvage crew is stranded on a planet that never turns — one face scorched by a sun that never sets, the other frozen in a night that never ends. To get home, they must cross the narrow band of twilight between the two before their ship’s orbit decays.',
    genres: ['Sci-Fi', 'Adventure'],
    runtime: 128,
    certificate: '12A',
    language: 'English',
    director: 'Nabik',
    cast: ['Sidon Rockwell', 'Jana Rhoney', 'Hat Faneek'],
    opensInDays: 0,
    accent: '#5f7fa3',
    focus: '50% 40%',
    featured: true,
  },
  {
    id: 'm-burn-the-map',
    slug: 'burn-the-map',
    title: 'Burn the Map',
    tagline: 'Some roads only exist once you stop looking for them.',
    synopsis:
      'A retired surveyor torches the only map to a valley he swore to keep hidden — then learns his daughter is driving straight into it. One night, one dirt road, and every wrong turn he ever charted.',
    genres: ['Action', 'Thriller'],
    runtime: 117,
    certificate: '15',
    language: 'English',
    director: 'Nabik',
    cast: ['Robert Moson', 'Anika Greerstein', 'Seth Janson'],
    opensInDays: 0,
    accent: '#a5683e',
    focus: '50% 35%',
    featured: true,
  },
  {
    id: 'm-negative-space',
    slug: 'negative-space',
    title: 'Negative Space',
    tagline: 'What isn’t there will find you.',
    synopsis:
      'A night-hiker follows a missing friend’s trail into a forest where the gaps between the trees begin to take a shape. The longer he looks, the more the woods look back.',
    genres: ['Horror', 'Mystery'],
    runtime: 101,
    certificate: '15',
    language: 'English',
    director: 'Nabik',
    cast: ['James Ryder', 'Clara Thorne', 'Mancus Vance'],
    opensInDays: 0,
    accent: '#5c7486',
    focus: '50% 45%',
    featured: true,
  },
  {
    id: 'm-dead-air',
    slug: 'dead-air',
    title: 'Dead Air',
    tagline: 'The silence is deafening.',
    synopsis:
      'A late-night radio host on a remote mountain relay starts receiving calls from a car that went off the pass road twenty years ago. Each call is a minute closer to the bend.',
    genres: ['Thriller', 'Mystery'],
    runtime: 109,
    certificate: '15',
    language: 'English',
    director: 'Nabik',
    cast: ['Nora Hagen', 'Dany Mehro', 'Stoneri Toh'],
    opensInDays: 0,
    accent: '#4f6a66',
    focus: '50% 40%',
  },
  {
    id: 'm-the-fifth-chair',
    slug: 'the-fifth-chair',
    title: 'The Fifth Chair',
    tagline: 'There were only ever four of us.',
    synopsis:
      'Four siblings return to their grandmother’s shuttered house to divide what is left. At dinner, there is always one more chair at the table than there are people — and someone keeps setting a place for it.',
    genres: ['Horror'],
    runtime: 96,
    certificate: '18',
    language: 'English',
    director: 'Nabik',
    cast: ['Ilsa Moreau', 'Kian Duarte', 'Peri Lund'],
    opensInDays: 0,
    accent: '#8e3a44',
    focus: '50% 40%',
  },
  {
    id: 'm-sorry-wrong-funeral',
    slug: 'sorry-wrong-funeral',
    title: 'Sorry, Wrong Funeral',
    tagline: 'He came to pay his respects. He picked the wrong grave.',
    synopsis:
      'A mild-mannered hearse driver delivers a coffin to the wrong service — a biker club’s send-off for their founder — and has until the final hymn to swap it back before anyone opens the lid.',
    genres: ['Comedy'],
    runtime: 104,
    certificate: '12A',
    language: 'English',
    director: 'Nabik',
    cast: ['Owen Carrick', 'Bea Thornbury', 'Rufus Hale'],
    opensInDays: 0,
    accent: '#6b7d5c',
    focus: '50% 55%',
  },
  {
    id: 'm-the-girl-who-cast-a-king',
    slug: 'the-girl-who-cast-a-king',
    title: 'The Girl Who Cast a King',
    tagline: 'Her shadow was the only crown she needed.',
    synopsis:
      'In a walled city without a ruler, an orphan discovers that her shadow falls as a king’s. The council wants her on the throne; she only wants to know whose shadow she is really wearing.',
    genres: ['Fantasy', 'Drama'],
    runtime: 133,
    certificate: 'PG',
    language: 'English',
    director: 'Nabik',
    cast: ['Mira Aldane', 'Theo Varga', 'Lucia Penn'],
    opensInDays: 3,
    accent: '#9a8a70',
    focus: '50% 30%',
  },
  {
    id: 'm-the-river-knows-the-way',
    slug: 'the-river-knows-the-way',
    title: 'The River Knows the Way',
    tagline: 'Every current ends somewhere.',
    synopsis:
      'After his father’s death, a quiet carpenter paddles his ashes three hundred kilometres downriver to the sea, meeting the people his father helped along the way — and the ones he didn’t.',
    genres: ['Drama', 'Adventure'],
    runtime: 121,
    certificate: 'PG',
    language: 'English',
    director: 'Nabik',
    cast: ['Arlo Brandt', 'Saoirse Kell', 'Imran Qadir'],
    opensInDays: 6,
    accent: '#58756a',
    focus: '50% 60%',
  },
];

export const GENRES: Genre[] = [
  'Horror',
  'Thriller',
  'Mystery',
  'Sci-Fi',
  'Action',
  'Drama',
  'Comedy',
  'Fantasy',
  'Adventure',
];

export function posterSrc(m: Movie, size: 640 | 1200 = 640) {
  return asset(`media/posters/${m.slug}-${size}.webp`);
}
export function posterLqip(m: Movie) {
  return asset(`media/posters/${m.slug}-lqip.webp`);
}

export const movieBySlug = (slug: string) => MOVIES.find((m) => m.slug === slug);
export const movieById = (id: string) => MOVIES.find((m) => m.id === id);

export const isNowShowing = (m: Movie) => m.opensInDays <= 0;

export function formatRuntime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
