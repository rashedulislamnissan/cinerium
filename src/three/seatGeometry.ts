import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Seat models, built from a few rounded boxes and merged into ONE geometry per
 * seat kind so each kind renders as a single InstancedMesh draw call.
 * Each part carries a vertex-colour "shade" that multiplies the per-instance
 * fabric colour (arms/base darker than cushions), so one material does it all.
 * Seats face −Z (toward the screen).
 */

type Part = {
  geo: THREE.BufferGeometry;
  pos: [number, number, number];
  rotX?: number;
  shade: number;
};

function rounded(w: number, h: number, d: number, r = 0.04) {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.2, h / 2.2, d / 2.2));
}

function assemble(parts: Part[]) {
  const geos = parts.map(({ geo, pos, rotX, shade }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (rotX) g.rotateX(rotX);
    g.translate(...pos);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3).fill(shade);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    return g;
  });
  const merged = mergeGeometries(geos, false)!;
  // keep each part's own (smooth) normals — recomputing on non-indexed geometry would facet it
  merged.computeBoundingSphere();
  return merged;
}

export function standardSeat(width: number) {
  const w = width * 0.9;
  return assemble([
    { geo: rounded(0.12, 0.36, 0.26, 0.02), pos: [0, 0.18, 0.06], shade: 0.25 },
    { geo: rounded(w, 0.13, 0.5, 0.045), pos: [0, 0.46, 0.0], shade: 1 },
    { geo: rounded(w, 0.56, 0.11, 0.045), pos: [0, 0.79, 0.27], rotX: 0.17, shade: 0.9 },
    { geo: rounded(0.06, 0.06, 0.46, 0.02), pos: [-width / 2, 0.66, 0.06], shade: 0.35 },
    { geo: rounded(0.06, 0.06, 0.46, 0.02), pos: [width / 2, 0.66, 0.06], shade: 0.35 },
    { geo: rounded(0.045, 0.28, 0.06, 0.015), pos: [-width / 2, 0.5, 0.18], shade: 0.25 },
    { geo: rounded(0.045, 0.28, 0.06, 0.015), pos: [width / 2, 0.5, 0.18], shade: 0.25 },
  ]);
}

export function recliner(width: number) {
  const body = width * 0.7;
  const arm = width * 0.13;
  const ax = width / 2 - arm / 2 - width * 0.02;
  return assemble([
    { geo: rounded(width * 0.92, 0.22, 0.74, 0.04), pos: [0, 0.11, 0.05], shade: 0.22 },
    { geo: rounded(body, 0.22, 0.64, 0.08), pos: [0, 0.4, 0.0], shade: 1 },
    { geo: rounded(body, 0.8, 0.22, 0.09), pos: [0, 0.86, 0.36], rotX: 0.26, shade: 0.92 },
    { geo: rounded(body * 0.82, 0.18, 0.16, 0.07), pos: [0, 1.28, 0.48], rotX: 0.26, shade: 1.05 },
    { geo: rounded(arm, 0.36, 0.8, 0.06), pos: [-ax, 0.48, 0.06], shade: 0.6 },
    { geo: rounded(arm, 0.36, 0.8, 0.06), pos: [ax, 0.48, 0.06], shade: 0.6 },
    { geo: rounded(body * 0.96, 0.28, 0.07, 0.03), pos: [0, 0.27, -0.33], shade: 0.75 },
  ]);
}

/** Half of a loveseat; `side` = −1 has its arm on the left, +1 on the right. */
export function loveseatHalf(width: number, side: -1 | 1) {
  const arm = 0.14;
  return assemble([
    { geo: rounded(width, 0.2, 0.66, 0.03), pos: [0, 0.1, 0.05], shade: 0.22 },
    { geo: rounded(width, 0.18, 0.6, 0.06), pos: [0, 0.4, 0.0], shade: 1 },
    { geo: rounded(width, 0.72, 0.18, 0.07), pos: [0, 0.82, 0.32], rotX: 0.22, shade: 0.9 },
    { geo: rounded(arm, 0.34, 0.7, 0.05), pos: [side * (width / 2 - arm / 2 + 0.04), 0.48, 0.05], shade: 0.6 },
  ]);
}

/** A seated audience member — just enough silhouette to show whose head is in your way. */
export function audienceSilhouette(eyeHeight: number) {
  const head = new THREE.SphereGeometry(0.105, 14, 10);
  head.scale(0.9, 1.12, 1);
  return assemble([
    { geo: head, pos: [0, eyeHeight + 0.05, 0.2], shade: 1 },
    { geo: rounded(0.11, 0.12, 0.1, 0.03), pos: [0, eyeHeight - 0.1, 0.22], shade: 1 },
    { geo: rounded(0.44, 0.34, 0.24, 0.1), pos: [0, eyeHeight - 0.3, 0.24], shade: 1 },
  ]);
}
