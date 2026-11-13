import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Clapperboard, Clock3, Film, House, LayoutGrid, Ticket } from 'lucide-react';
import { useBooking } from '../store/booking';
import { formatCountdown, useNow } from './ui';
import { getShow, showContext } from '../data/schedule';
import { Logo } from './Logo';

const NAV = [
  { to: '/films', label: 'Films', icon: Film },
  { to: '/showtimes', label: 'Showtimes', icon: Clock3 },
  { to: '/halls', label: 'Our halls', icon: LayoutGrid },
  { to: '/tickets', label: 'My tickets', icon: Ticket },
];


function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-300 ${
        scrolled ? 'border-b border-line/70 bg-bg-0/80 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="CINERIUM home" className="rounded-xs">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `relative rounded-xs px-3 py-2 text-[0.9375rem] transition-colors ${
                  isActive ? 'text-ink-1' : 'text-ink-2 hover:text-ink-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {n.label}
                  <span
                    className={`absolute inset-x-3 -bottom-px h-px bg-champagne transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/showtimes"
          className="btn-primary hidden h-10 items-center gap-2 rounded-sm px-4 text-sm font-semibold text-ink-1 sm:inline-flex"
        >
          <Clapperboard size={16} strokeWidth={1.5} />
          Book tickets
        </Link>
      </div>
    </header>
  );
}

function BottomTabs() {
  const items = [{ to: '/', label: 'Home', icon: House }, ...NAV];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-0/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-15 flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-champagne' : 'text-ink-2'}`
              }
            >
              <Icon size={20} strokeWidth={1.5} />
              {label === 'Our halls' ? 'Halls' : label === 'My tickets' ? 'Tickets' : label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "Resume booking · 6:41" — visible on every page while a seat hold is running. */
function ResumePill() {
  const { holdUntil, showId, selected } = useBooking();
  const now = useNow();
  const { pathname } = useLocation();
  if (!holdUntil || !showId || !selected.length || holdUntil < now) return null;
  if (pathname.startsWith('/checkout') || pathname.startsWith('/book/')) return null;
  const show = getShow(showId);
  if (!show) return null;
  const { movie } = showContext(show);
  return (
    <Link
      to="/checkout"
      className="glass fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2.5 text-sm shadow-(--shadow-e2) md:bottom-6"
    >
      <span className="h-2 w-2 rounded-full bg-garnet-hover animate-pulse-ring" />
      <span className="text-ink-2">Resume {movie.title}</span>
      <span className="tabular font-semibold text-champagne">{formatCountdown(holdUntil - now)}</span>
    </Link>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-bg-1 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo markSize={36} />
          <p className="font-display mt-4 max-w-sm text-xl text-ink-2 italic">Where every seat has a perspective.</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-1">Go to</h3>
          <ul className="space-y-2 text-ink-2">
            <li><Link className="hover:text-ink-1" to="/films">Films</Link></li>
            <li><Link className="hover:text-ink-1" to="/showtimes">Showtimes</Link></li>
            <li><Link className="hover:text-ink-1" to="/halls">Our halls</Link></li>
            <li><Link className="hover:text-ink-1" to="/about">About this project</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink-1">Visit</h3>
          <p className="text-ink-2">
            Cinerium Lakeview (demo)
            <br />
            House 00, Road 00, Gulshan, Dhaka
            <br />
            Open daily 10:00 – 23:30
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1280px] px-4 py-6 text-[0.8125rem] leading-relaxed text-ink-3 sm:px-6">
          CINERIUM is an independent demonstration project. It is not affiliated with, endorsed by, or operated by STAR
          Cineplex or any other cinema operator. All cinemas, films, showtimes, prices and bookings are fictional
          demonstration data. Payments are simulated; no real money is processed.
        </p>
      </div>
    </footer>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  // focus the page heading on navigation for screen-reader users
  useEffect(() => {
    const h = document.querySelector('main h1') as HTMLElement | null;
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-bg-2 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <TopBar />
      <main id="main" className="min-h-screen">
        <Outlet />
      </main>
      <Footer />
      <BottomTabs />
      <ResumePill />
      <ScrollRestoration />
    </>
  );
}
