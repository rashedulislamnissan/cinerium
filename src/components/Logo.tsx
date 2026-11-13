import { useId } from 'react';

/**
 * CINERIUM mark — "the viewing cone".
 * A curved screen, one seat, and the two sightlines from that seat to the
 * screen's edges: the angle every seat sees the film from. The light between
 * the lines is the projector's beam read backwards — from your seat.
 */
export function LogoMark({ size = 32, className = '', title }: { size?: number; className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`cone-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--color-champagne)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--color-champagne)" stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={`seat-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-garnet-hover)" />
          <stop offset="1" stopColor="var(--color-garnet-press)" />
        </linearGradient>
      </defs>
      {/* light between the sightlines */}
      <path d="M24 33.5 L7.5 13.2 Q24 5.2 40.5 13.2 Z" fill={`url(#cone-${id})`} />
      {/* sightlines */}
      <path
        d="M24 33.5 L7.5 13.2 M24 33.5 L40.5 13.2"
        stroke="var(--color-champagne)"
        strokeOpacity="0.7"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* curved screen */}
      <path d="M6 13.6 Q24 4.4 42 13.6" stroke="var(--color-champagne)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      {/* the seat: backrest, cushion, arms */}
      <rect x="18.2" y="31.4" width="11.6" height="7.4" rx="2.4" fill={`url(#seat-${id})`} />
      <rect x="16.2" y="36.2" width="15.6" height="4.6" rx="2.1" fill="var(--color-garnet)" />
      <rect x="20.4" y="36.9" width="7.2" height="1.3" rx="0.65" fill="var(--color-ink-1)" fillOpacity="0.22" />
    </svg>
  );
}

export function Logo({ markSize = 34, className = '' }: { markSize?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} />
      <span className="font-display text-[1.6rem] leading-none font-semibold tracking-[0.18em] text-ink-1">
        CINERIUM
      </span>
    </span>
  );
}
