import { lazy, Suspense, type ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { NotFoundPage } from './pages/NotFound';
import { PageLoader } from './components/ui';

// Only Home ships in the entry bundle (Lighthouse showed 59 KB of other pages' code
// unused on first load); every other route is its own chunk.
const FilmsPage = lazy(() => import('./pages/Films').then((m) => ({ default: m.FilmsPage })));
const FilmPage = lazy(() => import('./pages/Film').then((m) => ({ default: m.FilmPage })));
const ShowtimesPage = lazy(() => import('./pages/Showtimes').then((m) => ({ default: m.ShowtimesPage })));
const HallsPage = lazy(() => import('./pages/Halls').then((m) => ({ default: m.HallsPage })));
const SeatsPage = lazy(() => import('./pages/Seats'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const TicketPage = lazy(() => import('./pages/Ticket'));
const MyTicketsPage = lazy(() => import('./pages/MyTickets'));
const AboutPage = lazy(() => import('./pages/About'));

const s = (el: ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'films', element: s(<FilmsPage />) },
      { path: 'films/:slug', element: s(<FilmPage />) },
      { path: 'showtimes', element: s(<ShowtimesPage />) },
      { path: 'halls', element: s(<HallsPage />) },
      { path: 'book/:showId', element: s(<SeatsPage />) },
      { path: 'checkout', element: s(<CheckoutPage />) },
      { path: 'tickets', element: s(<MyTicketsPage />) },
      { path: 'tickets/:ref', element: s(<TicketPage />) },
      { path: 'about', element: s(<AboutPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
