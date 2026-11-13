import type { Hall, SeatCategory, SeatKind } from '../data/halls';
export type { SeatCategory };

export type Vec3 = [number, number, number];

/** One seat — the single identity shared by the 2D map, the mini-map and the 3D scene. */
export type Seat = {
  id: string; // `${hallId}:${row}${number}` — stable across views
  hallId: string;
  row: string;
  rowIndex: number;
  number: number;
  label: string; // "H12"
  category: SeatCategory;
  kind: SeatKind;
  wheelchair: boolean;
  /** Partner seat id for loveseats — both must be booked together. */
  pairId?: string;
  /** 2D layout position in layout units (seat centre). */
  x2d: number;
  y2d: number;
  w2d: number;
  /** 3D world position of the seat base centre (metres). Screen centre is at x=0, z=0, audience toward +z. */
  pos: Vec3;
  /** Seated eye position. */
  eye: Vec3;
  /** Rotation (radians, around Y) that faces the seat toward the screen centre. */
  yaw: number;
};

export type HallLayout = {
  hall: Hall;
  seats: Seat[];
  byId: Map<string, Seat>;
  rows: { label: string; index: number; y2d: number; seats: Seat[] }[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  screenCenter: Vec3;
  screenWidth: number;
  screenHeight: number;
};

const cache = new Map<string, HallLayout>();

export function buildLayout(hall: Hall): HallLayout {
  const hit = cache.get(hall.id);
  if (hit) return hit;

  const g = hall.geometry;
  const seats: Seat[] = [];
  const rows: HallLayout['rows'] = [];

  hall.rows.forEach((row, rowIndex) => {
    const w = g.seatWidth[row.kind];
    // total row width in layout units, to centre the row on x = 0
    const seatCount = row.blocks.reduce((a, b) => a + b, 0);
    const total = seatCount * w + (row.blocks.length - 1) * g.aisleWidth;
    let cursor = -total / 2;
    let number = 1;
    const rowSeats: Seat[] = [];

    row.blocks.forEach((count, bi) => {
      for (let i = 0; i < count; i++) {
        const x2d = cursor + w / 2;
        // curved rows: ends sit closer to the screen
        const curveOffset = g.rowCurve * x2d * x2d;
        const y2d = rowIndex * (g.rowPitch / 1.05) - curveOffset * 1.2;

        const x = x2d * g.unit;
        const floorY = rowIndex * g.rise;
        const z = g.firstRowZ + rowIndex * g.rowPitch - curveOffset * 1.2 * g.rowPitch;
        const id = `${hall.id}:${row.label}${number}`;

        const seat: Seat = {
          id,
          hallId: hall.id,
          row: row.label,
          rowIndex,
          number,
          label: `${row.label}${number}`,
          category: row.category,
          kind: row.kind,
          wheelchair: !!row.wheelchair?.includes(number),
          x2d,
          y2d,
          w2d: w,
          pos: [x, floorY, z],
          eye: [x, floorY + g.eyeHeight, z + 0.12],
          // seats are modelled facing -Z; in curved-row halls each turns toward the screen centre
          yaw: g.rowCurve > 0 ? Math.atan2(x, z) : 0,
        };
        rowSeats.push(seat);
        cursor += w;
        number++;
      }
      if (bi < row.blocks.length - 1) cursor += g.aisleWidth;
    });

    if (row.kind === 'couple') {
      for (let i = 0; i + 1 < rowSeats.length; i += 2) {
        rowSeats[i].pairId = rowSeats[i + 1].id;
        rowSeats[i + 1].pairId = rowSeats[i].id;
      }
    }

    seats.push(...rowSeats);
    rows.push({ label: row.label, index: rowIndex, y2d: rowIndex * (g.rowPitch / 1.05), seats: rowSeats });
  });

  const xs = seats.flatMap((s) => [s.x2d - s.w2d / 2, s.x2d + s.w2d / 2]);
  const ys = seats.map((s) => s.y2d);
  const screenHeight = g.screen.width / g.screen.aspect;

  const layout: HallLayout = {
    hall,
    seats,
    byId: new Map(seats.map((s) => [s.id, s])),
    rows,
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    screenCenter: [0, g.screen.bottomY + screenHeight / 2, 0],
    screenWidth: g.screen.width,
    screenHeight,
  };
  cache.set(hall.id, layout);
  return layout;
}
