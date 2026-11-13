/**
 * The three demo auditoriums. Each hall is described once — as a seat layout
 * plus physical geometry — and BOTH the 2D map and the 3D scene are derived
 * from that single description (master plan §6: one source of truth for seats).
 */

export type SeatCategory = 'regular' | 'premium' | 'couple' | 'vip';
export type SeatKind = 'standard' | 'recliner' | 'couple';

export type RowDef = {
  label: string;
  category: SeatCategory;
  kind: SeatKind;
  /** Seat counts per block, left→right; aisles fall between blocks. For couple rows these are seat counts (always even). */
  blocks: number[];
  /** Seat numbers (1-based) that are wheelchair spaces. */
  wheelchair?: number[];
};

export type HallGeometry = {
  /** Interior size in metres. */
  room: { width: number; length: number; height: number };
  screen: { width: number; aspect: number; bottomY: number; curveRadius?: number };
  /** Metres from the screen plane to the first row's eye position. */
  firstRowZ: number;
  rowPitch: number;
  /** Floor rise per row (the rake), metres. */
  rise: number;
  /** Metres per layout unit across a row. */
  unit: number;
  /** Concave row curvature — rows wrap toward the screen at the ends. */
  rowCurve: number;
  /** Layout units each seat kind occupies. */
  seatWidth: Record<SeatKind, number>;
  aisleWidth: number;
  /** Seated eye height above the row's floor, metres. */
  eyeHeight: number;
  /** Mood lighting colour for step lights. */
  stepLight: string;
  wallTone: string;
  seatFabric: Partial<Record<SeatCategory, string>>;
};

export type Hall = {
  id: string;
  slug: string;
  name: string;
  short: string;
  format: string;
  description: string;
  highlights: string[];
  prices: Partial<Record<SeatCategory, number>>; // base price per seat, BDT
  rows: RowDef[];
  geometry: HallGeometry;
  /** Daily start times, 24h "HH:MM" (Asia/Dhaka). */
  slots: string[];
};

const R = (from: string, to: string) => {
  const out: string[] = [];
  for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) out.push(String.fromCharCode(c));
  return out;
};

export const HALLS: Hall[] = [
  {
    id: 'h-classic',
    slug: 'classic',
    name: 'Hall 1 · Classic',
    short: 'Classic',
    format: 'Standard 2D',
    description:
      'A traditional raked auditorium with a single centre aisle. Premium rows sit in the middle third of the room, where the screen fills your view without filling your neck.',
    highlights: ['140 seats', 'Centre aisle', '10.5 m flat screen', 'Wheelchair spaces in row J'],
    prices: { regular: 400, premium: 550 },
    rows: R('A', 'J').map((label) => ({
      label,
      category: 'DEFGH'.includes(label) ? 'premium' : 'regular',
      kind: 'standard',
      blocks: [7, 7],
      wheelchair: label === 'J' ? [1, 14] : undefined,
    })),
    geometry: {
      room: { width: 16, length: 19.5, height: 8 },
      screen: { width: 10.5, aspect: 2.39, bottomY: 1.5 },
      firstRowZ: 4.6,
      rowPitch: 1.05,
      rise: 0.28,
      unit: 0.56,
      rowCurve: 0,
      seatWidth: { standard: 1, recliner: 1.7, couple: 1.1 },
      aisleWidth: 1.6,
      eyeHeight: 1.15,
      stepLight: '#8a2f3d',
      wallTone: '#2a2232',
      seatFabric: { regular: '#7a2c40', premium: '#2c6664' },
    },
    slots: ['10:30', '13:45', '17:00', '20:15'],
  },
  {
    id: 'h-grand',
    slug: 'grand',
    name: 'Hall 2 · Grand',
    short: 'Grand',
    format: 'Grand Screen',
    description:
      'Our largest room: a 16-metre curved screen, a steep stadium rake and curved rows that turn every seat toward the centre. Two aisles, and loveseats along the back wall.',
    highlights: ['258 seats', 'Curved rows, two aisles', '16 m curved screen', 'Couple loveseats in row M'],
    prices: { regular: 480, premium: 630, couple: 580 },
    rows: [
      ...R('A', 'L').map<RowDef>((label) => ({
        label,
        category: 'DEFGHIJ'.includes(label) ? 'premium' : 'regular',
        kind: 'standard',
        blocks: 'AB'.includes(label) ? [4, 10, 4] : [5, 10, 5],
        wheelchair: label === 'L' ? [1, 20] : undefined,
      })),
      { label: 'M', category: 'couple', kind: 'couple', blocks: [6, 10, 6] },
    ],
    geometry: {
      room: { width: 25, length: 27, height: 12 },
      screen: { width: 16, aspect: 2.39, bottomY: 1.9, curveRadius: 24 },
      firstRowZ: 6.2,
      rowPitch: 1.02,
      rise: 0.34,
      unit: 0.56,
      rowCurve: 0.0042,
      seatWidth: { standard: 1, recliner: 1.7, couple: 1.12 },
      aisleWidth: 1.7,
      eyeHeight: 1.15,
      stepLight: '#8a2f3d',
      wallTone: '#261e2e',
      seatFabric: { regular: '#7a2c40', premium: '#2c6664', couple: '#8a4a5a' },
    },
    slots: ['11:15', '14:45', '18:30', '21:45'],
  },
  {
    id: 'h-gold',
    slug: 'gold',
    name: 'Hall 3 · Gold Lounge',
    short: 'Gold Lounge',
    format: 'Gold Lounge',
    description:
      'Forty seats, all of them leather recliners with nearly two metres of legroom. The back row is a set of loveseats for two. Small room, big screen, no one’s knees in your back.',
    highlights: ['40 seats', 'Full recliners', '7.5 m screen', 'Loveseats in row E'],
    prices: { vip: 900, couple: 800 },
    rows: [
      ...R('A', 'D').map<RowDef>((label) => ({
        label,
        category: 'vip',
        kind: 'recliner',
        blocks: [2, 4, 2],
        wheelchair: label === 'A' ? [1] : undefined,
      })),
      { label: 'E', category: 'couple', kind: 'couple', blocks: [4, 4] },
    ],
    geometry: {
      room: { width: 12.5, length: 14.5, height: 6 },
      screen: { width: 7.5, aspect: 2.39, bottomY: 1.25 },
      firstRowZ: 4.4,
      rowPitch: 1.95,
      rise: 0.42,
      unit: 0.56,
      rowCurve: 0,
      seatWidth: { standard: 1, recliner: 1.75, couple: 1.5 },
      aisleWidth: 1.8,
      eyeHeight: 1.05,
      stepLight: '#a8895a',
      wallTone: '#2e2418',
      seatFabric: { vip: '#6a4a2e', couple: '#7a3e4c' },
    },
    slots: ['12:00', '15:30', '19:15', '22:30'],
  },
];

export const hallById = (id: string) => HALLS.find((h) => h.id === id)!;
export const hallBySlug = (slug: string) => HALLS.find((h) => h.slug === slug);

export const CATEGORY_LABEL: Record<SeatCategory, string> = {
  regular: 'Regular',
  premium: 'Premium',
  couple: 'Couple loveseat',
  vip: 'Gold recliner',
};
