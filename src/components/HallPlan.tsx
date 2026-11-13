import type { Hall } from '../data/halls';
import { buildLayout } from '../lib/seats';
import { SeatMap } from './SeatMap';
import { allShows, isBookable } from '../data/schedule';

const available = () => 'available' as const;

export function HallPlan({ hall, className = '' }: { hall: Hall; className?: string }) {
  return <SeatMap layout={buildLayout(hall)} statusOf={available} mode="plan" className={className} label={`Seat plan of ${hall.name}`} />;
}

export function nextShowIn(hallId: string) {
  return allShows().find((s) => s.hallId === hallId && isBookable(s));
}
