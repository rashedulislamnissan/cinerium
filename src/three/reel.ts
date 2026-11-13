import * as THREE from 'three';

/**
 * One shared <video> element for the reel, looped and muted so browsers allow
 * autoplay. The 3D screen samples it as a VideoTexture, cropped to the
 * auditorium's 2.39:1 scope ratio.
 */
let video: HTMLVideoElement | null = null;
let texture: THREE.VideoTexture | null = null;

export { REEL_SRC, REEL_POSTER } from '../lib/asset';
import { REEL_SRC } from '../lib/asset';

export function getReel() {
  if (!video) {
    video = document.createElement('video');
    video.src = REEL_SRC;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
  }
  return video;
}

export function getReelTexture(screenAspect: number) {
  const v = getReel();
  if (!texture) {
    texture = new THREE.VideoTexture(v);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }
  // centre-crop the 16:9 reel to the scope screen
  const videoAspect = 16 / 9;
  const ry = videoAspect / screenAspect;
  texture.repeat.set(1, ry);
  texture.offset.set(0, (1 - ry) / 2);
  return texture;
}

export function playReel() {
  const v = getReel();
  const p = v.play();
  if (p) p.catch(() => {});
}

export function pauseReel() {
  video?.pause();
}
