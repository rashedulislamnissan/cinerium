import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  LightbulbOff,
  Map as MapIcon,
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AuditoriumScene, type CameraState } from './Auditorium';
import { getReel, pauseReel, playReel } from './reel';
import { SeatMap, type ViewStatus } from '../components/SeatMap';
import type { HallLayout, Seat } from '../lib/seats';
import { viewingMetrics } from '../lib/viewing';
import { CATEGORY_LABEL, type SeatCategory } from '../data/halls';
import { taka } from '../lib/money';

type Props = {
  layout: HallLayout;
  statusOf: (id: string) => ViewStatus;
  prices: Partial<Record<SeatCategory, number>>;
  povSeatId: string | null;
  setPov: (id: string | null) => void;
  onToggleSelect: (seat: Seat) => void;
  onExit: (reason?: string) => void;
  selectedCount: number;
};

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function isLowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || coarse;
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Drops the pixel ratio once if the first seconds run below ~38 fps. */
function FrameGuard({ onSlow }: { onSlow: () => void }) {
  const acc = useRef({ t: 0, n: 0, done: false });
  useFrame((_, dt) => {
    const a = acc.current;
    if (a.done) return;
    a.t += dt;
    a.n++;
    if (a.t > 3) {
      a.done = true;
      if (a.n / a.t < 38) onSlow();
    }
  });
  return null;
}

const ICON = { size: 18, strokeWidth: 1.5 };

function ToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid h-11 w-11 place-items-center rounded-sm transition-colors ${
        pressed ? 'bg-bg-3 text-champagne' : 'text-ink-2 hover:bg-bg-3/70 hover:text-ink-1'
      }`}
    >
      {children}
    </button>
  );
}

export default function Theatre3D({
  layout,
  statusOf,
  prices,
  povSeatId,
  setPov,
  onToggleSelect,
  onExit,
  selectedCount,
}: Props) {
  const [supported] = useState(webglAvailable);
  // ?quality=high|low pins the tier (and turns off the automatic step-down)
  const forced = useMemo(() => {
    const q = new URLSearchParams(window.location.search).get('quality');
    return q === 'high' || q === 'low' ? q : null;
  }, []);
  const [lowPower, setLowPower] = useState(() => (forced ? forced === 'low' : isLowPowerDevice()));
  const [dpr, setDpr] = useState<number>(() => Math.min(window.devicePixelRatio, isLowPowerDevice() ? 1.25 : 1.75));
  const [ready, setReady] = useState(false);
  const [houseLights, setHouseLights] = useState(false);
  const [showAudience, setShowAudience] = useState(true);
  const [muted, setMuted] = useState(true);
  const [mapOpen, setMapOpen] = useState(() => window.innerWidth >= 768);
  const [hovered, setHovered] = useState<Seat | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  // phones: the mini-map and the seat panel take turns instead of stacking over the view
  const [narrow, setNarrow] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const cam = useRef<CameraState>({
    yaw: 0,
    pitch: 0,
    fov: 62,
    azimuth: 0.5,
    polar: 1.12,
    radius: layout.hall.geometry.room.length * 0.62,
    dragging: false,
  });

  useEffect(() => {
    if (!supported) onExit('3D isn’t available in this browser, so here’s the seat map instead.');
  }, [supported, onExit]);

  useEffect(() => {
    playReel();
    return () => {
      const v = getReel();
      v.muted = true;
      pauseReel();
    };
  }, []);

  // new seat → look straight at the screen again
  useEffect(() => {
    cam.current.yaw = 0;
    cam.current.pitch = 0;
  }, [povSeatId]);

  /* ---------------- pointer: drag to look / orbit, pinch or wheel to zoom ---------------- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // only drags that start on the 3D canvas move the camera — not ones on the HUD or mini-map
    if (!(e.target instanceof HTMLCanvasElement)) return;
    // capture on the canvas itself: drags survive leaving the canvas, and R3F still sees the click
    e.target.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = cam.current;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current != null) zoom((pinch.current - dist) * 0.25);
      pinch.current = dist;
      return;
    }
    if (Math.abs(dx) + Math.abs(dy) > 1 && !c.dragging) {
      c.dragging = true;
      setDragging(true);
    }
    if (povSeatId) {
      c.yaw = Math.max(-0.87, Math.min(0.87, c.yaw - dx * 0.0032)); // ±50°
      c.pitch = Math.max(-0.44, Math.min(0.61, c.pitch + dy * 0.0032)); // −25° / +35°
    } else {
      c.azimuth -= dx * 0.005;
      c.polar = Math.max(0.7, Math.min(1.5, c.polar - dy * 0.004));
    }
  };
  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      cam.current.dragging = false;
      setDragging(false);
    }
  };
  const zoom = useCallback(
    (delta: number) => {
      const c = cam.current;
      if (povSeatId) c.fov = Math.max(40, Math.min(85, c.fov + delta * 0.06));
      else {
        const L = layout.hall.geometry.room.length;
        c.radius = Math.max(3, Math.min(L * 0.95, c.radius + delta * 0.02));
      }
    },
    [povSeatId, layout],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      e.preventDefault();
      zoom(e.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  /* ---------------- keyboard ---------------- */
  const neighbour = useCallback(
    (from: Seat, dx: number, dy: number) => {
      if (dx) {
        const row = layout.rows[from.rowIndex].seats;
        return row[row.indexOf(from) + dx];
      }
      const r = layout.rows[from.rowIndex + dy];
      return r?.seats.reduce((b, s) => (Math.abs(s.x2d - from.x2d) < Math.abs(b.x2d - from.x2d) ? s : b));
    },
    [layout],
  );

  const pov = povSeatId ? layout.byId.get(povSeatId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[data-seat],dialog')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (povSeatId) setPov(null);
        else onExit();
      } else if (e.key === 'm' || e.key === 'M') {
        setMapOpen((o) => !o);
      } else if (pov && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const map: Record<string, [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const n = neighbour(pov, ...map[e.key]);
        if (n) setPov(n.id);
      } else if (!pov && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        cam.current.azimuth += e.key === 'ArrowLeft' ? 0.15 : -0.15;
      } else if (pov && (e.key === 'Enter' || e.key === ' ') && t.tagName !== 'BUTTON') {
        e.preventDefault();
        const st = statusOf(pov.id);
        if (st === 'available' || st === 'selected') onToggleSelect(pov);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pov, povSeatId, setPov, onExit, neighbour, statusOf, onToggleSelect]);

  const metrics = useMemo(() => (pov ? viewingMetrics(pov, layout) : null), [pov, layout]);
  const povStatus = pov ? statusOf(pov.id) : null;

  const toggleSound = () => {
    const v = getReel();
    v.muted = !muted;
    if (!v.muted) playReel();
    setMuted(!muted);
  };

  const onSeatPick = useCallback((s: Seat) => setPov(s.id), [setPov]);

  if (!supported) return null;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-[#050407] select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <SceneBoundary onError={() => onExit('The 3D view couldn’t start on this device, so here’s the seat map instead.')}>
        <Canvas
          dpr={dpr}
          gl={{ antialias: !lowPower, powerPreference: 'high-performance' }}
          camera={{ fov: 55, near: 0.05, far: 120 }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              onExit('The 3D view was interrupted. Your selection is safe.');
            });
            requestAnimationFrame(() => setReady(true));
          }}
          aria-label={`3D view of ${layout.hall.name}`}
        >
          <AuditoriumScene
            layout={layout}
            statusOf={statusOf}
            povSeatId={povSeatId}
            onSeatPick={onSeatPick}
            onSeatHover={setHovered}
            houseLights={houseLights}
            showAudience={showAudience}
            lowPower={lowPower}
            cam={cam}
            resetToken={resetToken}
            reducedMotion={reducedMotion}
          />
          {!forced && (
            <FrameGuard
              onSlow={() => {
                setDpr(1);
                setLowPower(true);
              }}
            />
          )}
        </Canvas>
      </SceneBoundary>

      {/* loader */}
      <div
        className={`pointer-events-none absolute inset-0 grid place-items-center bg-[#050407] transition-opacity duration-700 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden={ready}
      >
        <div className="flex flex-col items-center gap-4 text-ink-2">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-champagne" />
          <span className="text-sm">Preparing your auditorium…</span>
        </div>
      </div>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onExit()}
            aria-label="Back to 2D map"
            className="glass inline-flex h-11 items-center gap-2 rounded-sm px-3.5 text-sm font-semibold text-ink-1 hover:border-champagne-deep"
          >
            <ArrowLeft {...ICON} />
            <span className="hidden sm:inline">Back to 2D map</span>
            <span className="sm:hidden">2D map</span>
          </button>
          <span className="glass hidden h-11 items-center rounded-sm px-3.5 text-xs text-ink-2 lg:inline-flex">
            Representative demo auditorium
          </span>
        </div>
        <div
          className={`glass pointer-events-auto flex items-center gap-0.5 rounded-sm p-1 transition-opacity ${dragging ? 'opacity-60' : ''}`}
          role="toolbar"
          aria-label="3D view controls"
        >
          <ToolButton label={houseLights ? 'Dim house lights' : 'Raise house lights'} pressed={houseLights} onClick={() => setHouseLights((v) => !v)}>
            {houseLights ? <Lightbulb {...ICON} /> : <LightbulbOff {...ICON} />}
          </ToolButton>
          <ToolButton label={showAudience ? 'Hide other audience' : 'Show other audience'} pressed={showAudience} onClick={() => setShowAudience((v) => !v)}>
            <Users {...ICON} />
          </ToolButton>
          <ToolButton label={muted ? 'Turn reel sound on' : 'Mute reel'} pressed={!muted} onClick={toggleSound}>
            {muted ? <VolumeX {...ICON} /> : <Volume2 {...ICON} />}
          </ToolButton>
          <ToolButton label={mapOpen ? 'Hide seat map (M)' : 'Show seat map (M)'} pressed={mapOpen} onClick={() => setMapOpen((v) => !v)}>
            <MapIcon {...ICON} />
          </ToolButton>
          <ToolButton
            label="Reset view"
            onClick={() => {
              cam.current.azimuth = 0.5;
              cam.current.polar = 1.12;
              cam.current.radius = layout.hall.geometry.room.length * 0.62;
              setPov(null);
              setResetToken((t) => t + 1);
            }}
          >
            <RotateCcw {...ICON} />
          </ToolButton>
        </div>
      </div>

      {/* hovered seat chip */}
      {hovered && hovered.id !== povSeatId && (
        <div className="glass pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 rounded-sm px-3 py-1.5 text-sm">
          <span className="font-semibold">
            Row {hovered.row} · Seat {hovered.number}
          </span>
          <span className="text-ink-2"> — click to sit here</span>
        </div>
      )}

      {/* seat view panel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-4">
        {narrow && mapOpen ? null : narrow && pov && metrics ? (
          <section aria-live="polite" className="glass pointer-events-auto w-full rounded-md p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-xl leading-tight font-semibold">
                Row {pov.row} · Seat {pov.number}
              </h3>
              <span className="text-sm text-ink-2">
                {CATEGORY_LABEL[pov.category]}
                {prices[pov.category] != null && <span className="tabular text-champagne"> · {taka(prices[pov.category]!)}</span>}
              </span>
            </div>
            <p className="tabular mt-1 text-xs text-ink-2">
              {metrics.distance.toFixed(1)} m to screen · screen spans {Math.round(metrics.horizontalAngle)}° · {Math.round(metrics.sideAngle)}° off centre
            </p>
            <div className="mt-2.5 flex gap-2">
              {povStatus === 'available' || povStatus === 'selected' ? (
                <button
                  type="button"
                  onClick={() => onToggleSelect(pov)}
                  className={`inline-flex h-11 flex-1 items-center justify-center rounded-sm text-sm font-semibold ${
                    povStatus === 'selected' ? 'border border-garnet-hover text-ink-1' : 'btn-primary text-ink-1'
                  }`}
                >
                  {povStatus === 'selected' ? 'Remove this seat' : 'Select this seat'}
                </button>
              ) : (
                <p className="flex h-11 flex-1 items-center justify-center rounded-sm border border-line text-sm text-ink-3">
                  {povStatus === 'mine' ? 'Already yours' : 'Taken — preview only'}
                </p>
              )}
              <button
                type="button"
                aria-label="Leave this seat"
                onClick={() => setPov(null)}
                className="grid h-11 w-11 place-items-center rounded-sm border border-line text-ink-2"
              >
                <X {...ICON} />
              </button>
            </div>
            <p className="mt-2 text-xs leading-snug text-ink-3">
              Geometry-based estimate for a representative demo auditorium. Not a measurement of a real hall.
            </p>
          </section>
        ) : pov && metrics ? (
          <section
            aria-live="polite"
            className={`glass pointer-events-auto w-full rounded-md p-4 transition-opacity sm:max-w-[320px] ${dragging ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-ink-3">Viewing from</p>
                <h3 className="font-display text-2xl leading-tight font-semibold">
                  Row {pov.row} · Seat {pov.number}
                </h3>
                <p className="mt-0.5 text-sm text-ink-2">
                  {CATEGORY_LABEL[pov.category]}
                  {pov.wheelchair ? ' · wheelchair space' : ''}
                  {prices[pov.category] != null && (
                    <span className="tabular text-champagne"> · {taka(prices[pov.category]!)}</span>
                  )}
                </p>
              </div>
              <div className="flex">
                <button
                  type="button"
                  aria-label="Seat to the left"
                  className="grid h-10 w-10 place-items-center rounded-sm text-ink-2 hover:bg-bg-3 hover:text-ink-1"
                  onClick={() => {
                    const n = neighbour(pov, -1, 0);
                    if (n) setPov(n.id);
                  }}
                >
                  <ChevronLeft {...ICON} />
                </button>
                <button
                  type="button"
                  aria-label="Seat to the right"
                  className="grid h-10 w-10 place-items-center rounded-sm text-ink-2 hover:bg-bg-3 hover:text-ink-1"
                  onClick={() => {
                    const n = neighbour(pov, 1, 0);
                    if (n) setPov(n.id);
                  }}
                >
                  <ChevronRight {...ICON} />
                </button>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-line/70 py-2.5 text-center">
              <div>
                <dt className="text-xs text-ink-3">To screen</dt>
                <dd className="tabular text-lg font-semibold">{metrics.distance.toFixed(1)} m</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Screen spans</dt>
                <dd className="tabular text-lg font-semibold">{Math.round(metrics.horizontalAngle)}°</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-3">Side angle</dt>
                <dd className="tabular text-lg font-semibold">{Math.round(metrics.sideAngle)}°</dd>
              </div>
            </dl>
            <ul className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
              {metrics.tags.map((t) => (
                <li key={t} className="rounded-xs bg-verdigris-deep/60 px-2 py-0.5 text-xs text-ink-1">
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              {povStatus === 'available' || povStatus === 'selected' ? (
                <button
                  type="button"
                  onClick={() => onToggleSelect(pov)}
                  className={`inline-flex h-11 flex-1 items-center justify-center rounded-sm text-sm font-semibold ${
                    povStatus === 'selected' ? 'border border-garnet-hover text-ink-1 hover:bg-garnet/20' : 'btn-primary text-ink-1'
                  }`}
                >
                  {povStatus === 'selected' ? 'Remove this seat' : pov.pairId ? 'Select this loveseat' : 'Select this seat'}
                </button>
              ) : (
                <p className="flex h-11 flex-1 items-center justify-center rounded-sm border border-line text-sm text-ink-3">
                  {povStatus === 'mine' ? 'You’ve already booked this seat' : 'Taken — preview only'}
                </p>
              )}
              <button
                type="button"
                aria-label="Leave this seat"
                onClick={() => setPov(null)}
                className="grid h-11 w-11 place-items-center rounded-sm border border-line text-ink-2 hover:text-ink-1"
              >
                <X {...ICON} />
              </button>
            </div>
            <p className="mt-2.5 text-xs leading-snug text-ink-3">
              Geometry-based estimate for a representative demo auditorium. Not a measurement of a real hall.
            </p>
          </section>
        ) : (
          <p className="glass pointer-events-auto max-w-sm rounded-md p-4 text-sm text-ink-2">
            <span className="font-semibold text-ink-1">Click any seat to sit in it</span> — or pick one on the map. Drag to
            look around the hall, scroll to zoom.
            {selectedCount > 0 && <span className="mt-1 block text-champagne">{selectedCount} selected so far.</span>}
          </p>
        )}

        {/* floating mini-map */}
        {mapOpen ? (
          <section
            aria-label="Seat map"
            className={`glass pointer-events-auto w-full rounded-md p-3 transition-opacity sm:w-[260px] xl:w-[290px] ${dragging ? 'opacity-60' : ''}`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-ink-2">Tap a seat to view from it</span>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-xs text-ink-3 hover:text-ink-1"
                aria-label="Hide seat map"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <SeatMap
              layout={layout}
              statusOf={statusOf}
              mode="mini"
              povSeatId={povSeatId}
              onSeat={(s) => {
                setPov(s.id);
                if (narrow) setMapOpen(false);
              }}
              label="Mini seat map — choose a seat to view from"
            />
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="glass pointer-events-auto inline-flex h-11 items-center gap-2 self-end rounded-sm px-3.5 text-sm text-ink-1"
          >
            <MapIcon {...ICON} />
            Seat map
          </button>
        )}
      </div>
    </div>
  );
}
