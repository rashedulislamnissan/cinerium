import { ButtonLink } from '../components/ui';

const BUILT = [
  ['Seat views from every seat', 'A procedural three.js auditorium generated from the same seat layout as the 2D map, with the reel playing on the screen and its light spilling into the room.'],
  ['Three halls, three layouts', 'A classic single-aisle room, a curved-row Grand hall with a 16 m curved screen and loveseats, and a 40-seat recliner lounge.'],
  ['A real-feeling programme', 'A deterministic 7-day schedule in Dhaka time, matinee and weekend pricing, availability from seat inventory, and an 8-minute seat hold.'],
  ['Honest geometry', 'Distance, viewing angle and side angle for each seat are computed from the hall model — no invented “best seat” scores.'],
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 pt-28 sm:px-6">
      <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] font-medium">About this project</h1>
      <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-ink-2">
        CINERIUM is a portfolio project: a cinema booking experience for the Bangladeshi market that answers the question
        every ticket buyer has — <em className="font-display text-xl text-ink-1">“will I like this seat?”</em> — by letting you sit
        in it first.
      </p>
      <div className="hairline-gold my-12" />
      <dl className="grid gap-8 sm:grid-cols-2">
        {BUILT.map(([t, d]) => (
          <div key={t}>
            <dt className="font-display text-2xl font-semibold">{t}</dt>
            <dd className="mt-2 text-ink-2">{d}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-12 rounded-md border border-line bg-bg-2 p-6">
        <h2 className="font-semibold">What isn’t real</h2>
        <p className="mt-2 text-ink-2">
          The cinema, films, cast, showtimes, prices and other customers are all fictional demo data. The payment options
          (bKash, Nagad, Rocket, cards and others) are not connected to anything — choosing one shows a demo notice. Tickets
          are stored only in your browser. The film posters and the reel are original artwork made for this project.
        </p>
      </div>
      <ButtonLink to="/showtimes" className="mt-10">
        Try booking a seat
      </ButtonLink>
    </div>
  );
}
