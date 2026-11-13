import type { HallLayout, Seat } from './seats';

/**
 * Viewing geometry for a seat — computed purely from the hall model, never invented.
 *
 * Thresholds for the descriptive tags follow commonly cited cinema guidance:
 *  - SMPTE EG-18 recommends the screen subtend at least ~30° of horizontal view;
 *  - THX recommends ~36° (and up to ~40°) from the "best" seats.
 * They are used only to pick neutral wording — never a score or a "best seat" claim.
 */
export type ViewingMetrics = {
  distance: number; // metres, eye → screen centre
  horizontalAngle: number; // degrees the screen spans across your view
  lookUp: number; // degrees from eye level up to the top of the screen
  sideAngle: number; // degrees off the screen's centre line
  tags: string[];
};

const deg = (r: number) => (r * 180) / Math.PI;

export function viewingMetrics(seat: Seat, layout: HallLayout): ViewingMetrics {
  const g = layout.hall.geometry;
  const [ex, ey, ez] = seat.eye;
  const [cx, cy, cz] = layout.screenCenter;
  const half = layout.screenWidth / 2;
  const R = g.screen.curveRadius;
  // a curved screen's edges come toward the audience by the sagitta
  const edgeZ = R ? R - Math.sqrt(R * R - half * half) : 0;

  const vL = [-half - ex, cy - ey, edgeZ - ez];
  const vR = [half - ex, cy - ey, edgeZ - ez];
  const dot = vL[0] * vR[0] + vL[1] * vR[1] + vL[2] * vR[2];
  const mag = Math.hypot(...vL) * Math.hypot(...vR);
  const horizontalAngle = deg(Math.acos(dot / mag));

  const distance = Math.hypot(ex - cx, ey - cy, ez - cz);
  const top = g.screen.bottomY + layout.screenHeight;
  const lookUp = deg(Math.atan2(top - ey, ez));
  const sideAngle = deg(Math.atan2(Math.abs(ex), ez));

  const tags: string[] = [];
  if (horizontalAngle >= 52) tags.push('Screen fills your whole view');
  else if (horizontalAngle >= 36) tags.push('Immersive — within THX-style range');
  else if (horizontalAngle >= 28) tags.push('Comfortable, cinema-standard view');
  else tags.push('Relaxed view — whole frame at a glance');
  if (lookUp > 32) tags.push('You will look up noticeably');
  if (sideAngle > 24) tags.push('Noticeable side angle');
  else if (sideAngle < 6) tags.push('On the centre line');

  return { distance, horizontalAngle, lookUp, sideAngle, tags };
}
