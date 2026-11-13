import * as THREE from 'three';
import { hashString, mulberry32 } from '../lib/rng';

/**
 * Procedural textures, generated once on a canvas — no image downloads for
 * the auditorium itself (master plan §5.7: textures generated to canvas).
 */
const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function finish(key: string, c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(...opts.repeat);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Vertical acoustic fluting: soft cylindrical shading per flute. */
export function flutingTexture(tone: string) {
  const key = `flute:${tone}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 64);
  const base = new THREE.Color(tone);
  const flutes = 8;
  const fw = c.width / flutes;
  for (let i = 0; i < flutes; i++) {
    const grad = g.createLinearGradient(i * fw, 0, (i + 1) * fw, 0);
    const lit = base.clone().multiplyScalar(1.55);
    const dark = base.clone().multiplyScalar(0.55);
    grad.addColorStop(0, `#${dark.getHexString()}`);
    grad.addColorStop(0.45, `#${lit.getHexString()}`);
    grad.addColorStop(0.9, `#${base.getHexString()}`);
    grad.addColorStop(1, `#${dark.getHexString()}`);
    g.fillStyle = grad;
    g.fillRect(i * fw, 0, fw, c.height);
  }
  return finish(key, c);
}

/** Matching bump map for the fluting so the screen light rakes across it. */
export function flutingBump() {
  const key = 'flute-bump';
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 8);
  const flutes = 8;
  const fw = c.width / flutes;
  for (let i = 0; i < flutes; i++) {
    const grad = g.createLinearGradient(i * fw, 0, (i + 1) * fw, 0);
    grad.addColorStop(0, '#000');
    grad.addColorStop(0.5, '#fff');
    grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(i * fw, 0, fw, c.height);
  }
  return finish(key, c, { srgb: false });
}

/** Low-pile cinema carpet: dark violet with a faint woven speckle and a quiet diamond motif. */
export function carpetTexture(tint = '#261b30') {
  const key = `carpet:${tint}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 256);
  g.fillStyle = tint;
  g.fillRect(0, 0, 256, 256);
  const rand = mulberry32(hashString(key));
  for (let i = 0; i < 9000; i++) {
    const v = rand();
    g.fillStyle = v > 0.5 ? 'rgba(255,240,230,0.035)' : 'rgba(0,0,0,0.18)';
    g.fillRect(rand() * 256, rand() * 256, 1, 1);
  }
  g.strokeStyle = 'rgba(210,178,122,0.06)';
  g.lineWidth = 1;
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      g.beginPath();
      g.moveTo(x + 32, y + 8);
      g.lineTo(x + 56, y + 32);
      g.lineTo(x + 32, y + 56);
      g.lineTo(x + 8, y + 32);
      g.closePath();
      g.stroke();
    }
  }
  return finish(key, c);
}

/** Velvet curtain folds. */
export function curtainTexture(tone = '#4a1626') {
  const key = `curtain:${tone}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 32);
  const base = new THREE.Color(tone);
  const folds = 6;
  const fw = c.width / folds;
  for (let i = 0; i < folds; i++) {
    const grad = g.createLinearGradient(i * fw, 0, (i + 1) * fw, 0);
    grad.addColorStop(0, `#${base.clone().multiplyScalar(0.35).getHexString()}`);
    grad.addColorStop(0.35, `#${base.clone().multiplyScalar(1.25).getHexString()}`);
    grad.addColorStop(0.6, `#${base.getHexString()}`);
    grad.addColorStop(1, `#${base.clone().multiplyScalar(0.3).getHexString()}`);
    g.fillStyle = grad;
    g.fillRect(i * fw, 0, fw, c.height);
  }
  return finish(key, c);
}

/** Soft radial light pool used for wall-washes under the sconces (additive). */
export function glowTexture(color = '#e8b77a') {
  const key = `glow:${color}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(128, 256);
  const grad = g.createRadialGradient(64, 70, 2, 64, 110, 130);
  const col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  grad.addColorStop(0, `rgba(${rgb},0.9)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  const t = finish(key, c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Vertical fade used for the projector beam (bright at the lens, fading toward the screen). */
export function beamTexture() {
  const key = 'beam';
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(4, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = finish(key, c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
