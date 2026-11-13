import { ButtonLink } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 pt-24 text-center">
      <p className="font-display text-[7rem] leading-none text-champagne/80">404</p>
      <h1 className="font-display mt-2 text-4xl">This reel is missing</h1>
      <p className="mt-3 text-ink-2">The page you followed doesn’t exist. The films and showtimes are still where you left them.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/">Go home</ButtonLink>
        <ButtonLink to="/showtimes" variant="secondary">
          See showtimes
        </ButtonLink>
      </div>
    </div>
  );
}
