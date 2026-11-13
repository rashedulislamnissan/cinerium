import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { X } from 'lucide-react';
import { posterLqip, posterSrc, type Movie } from '../data/movies';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-[background-color,border-color,color,filter] duration-200 ease-(--ease-standard) disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap';
const variants: Record<Variant, string> = {
  primary: 'btn-primary text-ink-1',
  secondary: 'border border-line-strong text-ink-1 hover:border-champagne-deep hover:bg-bg-3/60',
  ghost: 'text-ink-2 hover:text-ink-1 hover:bg-bg-3/60',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/** 2:3 poster with a tiny blurred placeholder underneath so there's no flash or layout shift. */
export function Poster({
  movie,
  size = 640,
  className = '',
  priority = false,
  sizes = '(min-width: 1024px) 18vw, 45vw',
}: {
  movie: Movie;
  size?: 640 | 1200;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-(--radius-poster) bg-bg-3 ${className}`}
      style={{ backgroundImage: `url(${posterLqip(movie)})`, backgroundSize: 'cover', backgroundPosition: movie.focus }}
    >
      <img
        src={posterSrc(movie, size)}
        srcSet={`${posterSrc(movie, 640)} 640w, ${posterSrc(movie, 1200)} 1200w`}
        sizes={sizes}
        alt={`${movie.title} poster`}
        width={640}
        height={960}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded || priority ? 'opacity-100' : 'opacity-0'}`}
        style={{ objectPosition: movie.focus }}
      />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-ink-2">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-champagne" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

/** Native <dialog>: focus trap, Esc to close and inert background come for free. */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-md'} rounded-lg border border-line bg-bg-2 p-0 text-ink-1 shadow-(--shadow-e3) backdrop:bg-[rgba(8,6,12,0.74)] backdrop:backdrop-blur-sm open:animate-rise-in`}
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 grid h-11 w-11 place-items-center rounded-sm text-ink-2 hover:bg-bg-3 hover:text-ink-1"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
        {children}
      </div>
    </dialog>
  );
}

export function Certificate({ value }: { value: string }) {
  return (
    <span className="inline-grid h-6 min-w-6 place-items-center rounded-xs border border-line-strong px-1.5 text-xs font-semibold text-ink-2">
      {value}
    </span>
  );
}

export function SectionHeader({
  title,
  aside,
  id,
  sub,
}: {
  title: string;
  aside?: ReactNode;
  id?: string;
  sub?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-medium text-ink-1">
          {title}
        </h2>
        {sub && <p className="mt-3 text-ink-2">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function AvailabilityBar({ ratio, label }: { ratio: number; label: string }) {
  const tone = ratio === 0 ? 'bg-ink-3' : ratio < 0.1 ? 'bg-danger' : ratio < 0.4 ? 'bg-warning' : 'bg-verdigris';
  return (
    <span className="flex items-center gap-2" title={label}>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className={`absolute inset-y-0 left-0 ${tone}`} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
