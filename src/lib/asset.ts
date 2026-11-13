/**
 * URL for a file in /public that works whether the site is served from the
 * domain root (dev, `vite preview`) or a sub-path (GitHub Pages: /cinerium/).
 * Vite sets BASE_URL from `--base`; it always ends with a slash.
 */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const REEL_SRC = asset('media/reel.mp4');
export const REEL_POSTER = asset('media/reel-frame.webp');
