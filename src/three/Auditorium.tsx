import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { HallLayout, Seat } from '../lib/seats';
import type { ViewStatus } from '../components/SeatMap';
import { audienceSilhouette, loveseatHalf, recliner, standardSeat } from './seatGeometry';
import { carpetTexture, curtainTexture, flutingBump, flutingTexture, glowTexture } from './textures';
import { getReel, getReelTexture, playReel } from './reel';
import { CinemaEffects, RoomLighting, ShaderWarmup } from './Effects';

RectAreaLightUniformsLib.init();

export type CameraState = {
  /** user look-around offsets in seat view (radians) */
  yaw: number;
  pitch: number;
  fov: number;
  /** overview orbit */
  azimuth: number;
  polar: number;
  radius: number;
  dragging: boolean;
};

type SceneProps = {
  layout: HallLayout;
  statusOf: (id: string) => ViewStatus;
  povSeatId: string | null;
  onSeatPick: (seat: Seat) => void;
  onSeatHover: (seat: Seat | null) => void;
  houseLights: boolean;
  showAudience: boolean;
  lowPower: boolean;
  cam: MutableRefObject<CameraState>;
  resetToken: number;
  reducedMotion: boolean;
};

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();
const WHITE = new THREE.Color('#ffffff');

function scaleUVs(geo: THREE.BufferGeometry, sx: number, sy: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute | undefined;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
  return geo;
}

/* ------------------------------------------------------------------ */
/* Derived hall dimensions                                             */
/* ------------------------------------------------------------------ */
export function hallDims(layout: HallLayout) {
  const g = layout.hall.geometry;
  const W = g.room.width;
  const L = g.room.length;
  const H = g.room.height;
  const rows = layout.rows.length;
  const lastFloor = (rows - 1) * g.rise;
  const half = g.screen.width / 2;
  const R = g.screen.curveRadius;
  const sagitta = R ? R - Math.sqrt(R * R - half * half) : 0;
  const stageDepth = sagitta + 1.3;
  const maxSeatUnits = Math.max(...layout.seats.map((s) => Math.abs(s.x2d) + s.w2d / 2));
  const curveAt = (xMetres: number) => {
    const u = Math.min(Math.abs(xMetres) / g.unit, maxSeatUnits);
    return g.rowCurve * u * u * 1.2 * g.rowPitch;
  };
  return { g, W, L, H, rows, lastFloor, sagitta, stageDepth, curveAt, frontWallZ: -0.4 };
}

/* ------------------------------------------------------------------ */
/* Camera rig — overview orbit + seat POV with look-around, with an     */
/* arcing transition (up and over the rows, never through them).        */
/* ------------------------------------------------------------------ */
function CameraRig({
  layout,
  povSeatId,
  cam,
  resetToken,
  reducedMotion,
}: Pick<SceneProps, 'layout' | 'povSeatId' | 'cam' | 'resetToken' | 'reducedMotion'>) {
  const { camera } = useThree();
  const d = useMemo(() => hallDims(layout), [layout]);
  const target = useMemo(() => new THREE.Vector3(0, 2 + d.lastFloor * 0.3, d.L * 0.42), [d]);
  const look = useRef(new THREE.Vector3(0, layout.screenCenter[1], 0));
  const anim = useRef<{ t: number; fromPos: THREE.Vector3; fromLook: THREE.Vector3; dur: number } | null>(null);
  const first = useRef(true);
  // pre-allocated — nothing is created inside the frame loop
  const v = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      ctrl: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      sph: new THREE.Spherical(),
    }),
    [],
  );

  // establishing shot: from the back corner, settling in
  useLayoutEffect(() => {
    const start = new THREE.Vector3(d.W * 0.42, d.H * 0.85, d.L * 0.98);
    camera.position.copy(start);
    look.current.set(0, layout.screenCenter[1], 0);
    camera.lookAt(look.current);
    anim.current = { t: 0, fromPos: start.clone(), fromLook: look.current.clone(), dur: reducedMotion ? 0.01 : 2.4 };
  }, [camera, d, layout, reducedMotion]);

  useEffect(() => {
    // the first run belongs to the establishing shot above
    if (first.current) {
      first.current = false;
      return;
    }
    anim.current = {
      t: 0,
      fromPos: camera.position.clone(),
      fromLook: look.current.clone(),
      dur: reducedMotion ? 0.15 : 1.25,
    };
  }, [povSeatId, resetToken, camera, reducedMotion]);

  useFrame((_, dt) => {
    const c = cam.current;
    const seat = povSeatId ? layout.byId.get(povSeatId) : undefined;

    if (seat) {
      const [ex, ey, ez] = seat.eye;
      v.pos.set(ex, ey, ez);
      v.dir.set(layout.screenCenter[0] - ex, layout.screenCenter[1] - ey, layout.screenCenter[2] - ez).normalize();
      const baseYaw = Math.atan2(v.dir.x, -v.dir.z);
      const basePitch = Math.asin(v.dir.y);
      const yaw = baseYaw + c.yaw;
      const pitch = THREE.MathUtils.clamp(basePitch + c.pitch, -1.2, 1.2);
      v.look.set(ex + Math.sin(yaw) * Math.cos(pitch), ey + Math.sin(pitch), ez - Math.cos(yaw) * Math.cos(pitch));
    } else {
      v.sph.set(c.radius, c.polar, c.azimuth);
      v.pos.setFromSpherical(v.sph).add(target);
      // keep the camera inside the room
      v.pos.x = THREE.MathUtils.clamp(v.pos.x, -d.W / 2 + 0.6, d.W / 2 - 0.6);
      v.pos.y = THREE.MathUtils.clamp(v.pos.y, d.lastFloor * 0.5 + 1.2, d.H - 0.5);
      v.pos.z = THREE.MathUtils.clamp(v.pos.z, d.stageDepth + 1, d.L - 0.4);
      v.look.copy(target);
      v.look.y = layout.screenCenter[1] * 0.75;
      v.look.z = target.z * 0.55;
    }

    const a = anim.current;
    if (a) {
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
      const dist = a.fromPos.distanceTo(v.pos);
      v.ctrl.copy(a.fromPos).add(v.pos).multiplyScalar(0.5);
      v.ctrl.y = Math.max(a.fromPos.y, v.pos.y) + Math.min(2.5, 0.6 + dist * 0.18);
      const u = 1 - e;
      camera.position.set(
        u * u * a.fromPos.x + 2 * u * e * v.ctrl.x + e * e * v.pos.x,
        u * u * a.fromPos.y + 2 * u * e * v.ctrl.y + e * e * v.pos.y,
        u * u * a.fromPos.z + 2 * u * e * v.ctrl.z + e * e * v.pos.z,
      );
      look.current.lerpVectors(a.fromLook, v.look, e);
      if (a.t >= 1) anim.current = null;
    } else {
      const k = 1 - Math.exp(-dt * 10);
      camera.position.lerp(v.pos, k);
      look.current.lerp(v.look, k);
    }
    camera.lookAt(look.current);

    const pc = camera as THREE.PerspectiveCamera;
    const fov = seat ? c.fov : 55;
    if (Math.abs(pc.fov - fov) > 0.01) {
      pc.fov += (fov - pc.fov) * (1 - Math.exp(-dt * 8));
      pc.updateProjectionMatrix();
    }
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Seats — one InstancedMesh per seat kind                              */
/* ------------------------------------------------------------------ */
const STATE_COLOR = {
  selected: new THREE.Color('#c0405f'),
  mine: new THREE.Color('#a8895a'),
  pov: new THREE.Color('#e8d3a8'),
};

function SeatGroup({
  seats,
  geometry,
  layout,
  statusOf,
  povSeatId,
  hovered,
  onSeatPick,
  onSeatHover,
}: {
  seats: Seat[];
  geometry: THREE.BufferGeometry;
  layout: HallLayout;
  statusOf: (id: string) => ViewStatus;
  povSeatId: string | null;
  hovered: MutableRefObject<string | null>;
  onSeatPick: (s: Seat) => void;
  onSeatHover: (s: Seat | null) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const fabric = layout.hall.geometry.seatFabric;

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return; // this hall has no seats of this kind
    seats.forEach((s, i) => {
      tmpObj.position.set(...s.pos);
      tmpObj.rotation.set(0, s.yaw, 0);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [seats]);

  const paint = () => {
    const m = ref.current;
    if (!m) return;
    seats.forEach((s, i) => {
      const st = statusOf(s.id);
      tmpColor.set(fabric[s.category] ?? '#4a2a35');
      if (s.id === povSeatId) tmpColor.copy(STATE_COLOR.pov);
      else if (st === 'selected') tmpColor.copy(STATE_COLOR.selected);
      else if (st === 'mine') tmpColor.copy(STATE_COLOR.mine);
      else if (st === 'sold') tmpColor.multiplyScalar(0.55);
      else if (st === 'held') tmpColor.multiplyScalar(0.7);
      if (hovered.current === s.id && s.id !== povSeatId) tmpColor.multiplyScalar(1.7);
      m.setColorAt(i, tmpColor);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };

  useEffect(paint);

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || e.instanceId == null) return;
    e.stopPropagation();
    onSeatPick(seats[e.instanceId]);
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId == null) return;
    e.stopPropagation();
    const s = seats[e.instanceId];
    if (hovered.current !== s.id) {
      hovered.current = s.id;
      onSeatHover(s);
      document.body.style.cursor = 'pointer';
    }
  };
  const out = () => {
    hovered.current = null;
    onSeatHover(null);
    document.body.style.cursor = '';
  };

  if (!seats.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, seats.length]}
      onClick={pick}
      onPointerMove={move}
      onPointerOut={out}
      frustumCulled={false}
    >
      {/* Gold Lounge recliners are leather (a little sheen under the IBL); elsewhere matte fabric */}
      <meshStandardMaterial
        vertexColors
        roughness={layout.hall.slug === 'gold' ? 0.52 : 0.86}
        metalness={layout.hall.slug === 'gold' ? 0.05 : 0.02}
      />
    </instancedMesh>
  );
}

function Audience({
  layout,
  statusOf,
  povSeatId,
}: Pick<SceneProps, 'layout' | 'statusOf' | 'povSeatId'>) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => audienceSilhouette(layout.hall.geometry.eyeHeight), [layout]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    let n = 0;
    for (const s of layout.seats) {
      const st = statusOf(s.id);
      if ((st === 'sold' || st === 'held') && s.id !== povSeatId) {
        tmpObj.position.set(...s.pos);
        tmpObj.rotation.set(0, s.yaw, 0);
        // a little natural variation in height and posture
        const k = ((s.number * 7 + s.rowIndex * 13) % 10) / 10;
        tmpObj.scale.set(1, 0.94 + k * 0.1, 1);
        tmpObj.rotation.y += (k - 0.5) * 0.2;
        tmpObj.updateMatrix();
        m.setMatrixAt(n++, tmpObj.matrix);
      }
    }
    tmpObj.scale.set(1, 1, 1);
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, layout.seats.length]} frustumCulled={false} raycast={() => null}>
      <meshStandardMaterial color="#120e16" roughness={1} vertexColors />
    </instancedMesh>
  );
}

/**
 * Volumetric-looking beam without raymarching: brightness follows how squarely
 * you look through the cone's surface (soft edges, fuller centre) and fades
 * along its length — strongest near the lens, never a hard point at the apex.
 */
const BEAM_SHADER = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vAlong;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      vAlong = uv.y; // 1 at the lens, 0 at the screen
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec3 vNormal;
    varying vec3 vView;
    varying float vAlong;
    void main() {
      float facing = abs(dot(normalize(vNormal), normalize(vView)));
      float body = pow(facing, 2.2);
      float fade = (0.3 + 0.7 * vAlong) * smoothstep(1.0, 0.9, vAlong) * smoothstep(0.0, 0.12, vAlong);
      float a = body * fade * uOpacity;
      gl_FragColor = vec4(uColor * a, a);
    }
  `,
};

/* ------------------------------------------------------------------ */
/* Screen — plays the reel; its light spills onto the room             */
/* ------------------------------------------------------------------ */
function Screen({ layout, houseLights, lowPower }: Pick<SceneProps, 'layout' | 'houseLights' | 'lowPower'>) {
  const d = hallDims(layout);
  const { screen } = d.g;
  const h = layout.screenHeight;
  const cy = layout.screenCenter[1];
  const tex = useMemo(() => getReelTexture(screen.aspect), [screen.aspect]);
  const light = useRef<THREE.RectAreaLight>(null);
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const sampler = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 4;
    return c.getContext('2d', { willReadFrequently: true });
  }, []);
  const avg = useRef(new THREE.Color('#9fb0c8'));
  const frame = useRef(0);

  useEffect(() => {
    playReel();
  }, []);

  const geometry = useMemo(() => {
    if (!screen.curveRadius) return new THREE.PlaneGeometry(screen.width, h);
    const R = screen.curveRadius;
    const half = screen.width / 2 / R;
    const g = new THREE.CylinderGeometry(R, R, h, 48, 1, true, Math.PI - half, half * 2);
    // seen from inside the cylinder the image would be mirrored — flip U
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    return g;
  }, [screen, h]);

  const maskGeometry = useMemo(() => {
    const border = 0.22;
    if (!screen.curveRadius) return new THREE.PlaneGeometry(screen.width + border * 2, h + border * 2);
    const R = screen.curveRadius + 0.03;
    const half = (screen.width / 2 + border) / R;
    return new THREE.CylinderGeometry(R, R, h + border * 2, 48, 1, true, Math.PI - half, half * 2);
  }, [screen, h]);

  // Projector beam: an open cone from the booth lens to the screen, with an elliptical
  // cross-section matching the screen's aspect. Oriented by quaternion; shaded in BEAM_SHADER.
  const beam = useMemo(() => {
    const apex = new THREE.Vector3(0, d.H - 1.5, d.L - 0.05);
    const target = new THREE.Vector3(0, cy, d.sagitta * 0.3);
    const len = apex.distanceTo(target);
    const g = new THREE.CylinderGeometry(0.06, 1, len, 48, 1, true);
    g.translate(0, -len / 2, 0); // apex at the origin, base at −len
    g.scale(screen.width / 2, 1, h / 2);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      target.clone().sub(apex).normalize(),
    );
    return { geometry: g, position: apex, quaternion: q };
  }, [d, screen, cy, h]);
  const beamUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#d8dce6') }, uOpacity: { value: 0.1 } }),
    [],
  );
  useEffect(() => () => beam.geometry.dispose(), [beam]);
  useEffect(() => () => void [geometry, maskGeometry].forEach((g) => g.dispose()), [geometry, maskGeometry]);

  useFrame(() => {
    // sample the reel every few frames so the room's light follows the film
    if (++frame.current % 6 === 0 && sampler) {
      const v = getReel();
      if (v.readyState >= 2) {
        try {
          sampler.drawImage(v, 0, 0, 8, 4);
          const px = sampler.getImageData(0, 0, 8, 4).data;
          let r = 0,
            g = 0,
            b = 0;
          for (let i = 0; i < px.length; i += 4) {
            r += px[i];
            g += px[i + 1];
            b += px[i + 2];
          }
          const n = px.length / 4;
          tmpColor.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
          avg.current.lerp(tmpColor, 0.35);
        } catch {
          /* tainted or not ready — keep last colour */
        }
      }
    }
    const lum = avg.current.r * 0.3 + avg.current.g * 0.59 + avg.current.b * 0.11;
    if (light.current) {
      light.current.color.copy(avg.current).lerp(WHITE, 0.35);
      light.current.intensity = (houseLights ? 4 : 9) * (0.4 + lum * 1.6);
    }
    beamUniforms.uColor.value.copy(avg.current).lerp(WHITE, 0.45);
    beamUniforms.uOpacity.value = houseLights ? 0 : 0.05 + lum * 0.09;
    if (screenMat.current) {
      screenMat.current.color.setScalar(houseLights ? 0.72 : 1);
    }
  });

  const curved = !!screen.curveRadius;
  const R = screen.curveRadius ?? 0;

  return (
    <group>
      <mesh geometry={maskGeometry} position={curved ? [0, cy, R] : [0, cy, -0.02]}>
        <meshBasicMaterial color="#030204" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry} position={curved ? [0, cy, R] : [0, cy, 0]}>
        <meshBasicMaterial ref={screenMat} map={tex} toneMapped={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      <rectAreaLight
        ref={light}
        width={screen.width}
        height={h}
        position={[0, cy, d.sagitta * 0.5 + 0.1]}
        // RectAreaLight emits along its local −Z; turn it to face the audience (+Z)
        rotation={[0, Math.PI, 0]}
        intensity={3}
      />
      {!lowPower && (
        <mesh geometry={beam.geometry} position={beam.position} quaternion={beam.quaternion} raycast={() => null}>
          <shaderMaterial
            args={[BEAM_SHADER]}
            uniforms={beamUniforms}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {!lowPower && !houseLights && <Dust layout={layout} />}
    </group>
  );
}

function Dust({ layout }: { layout: HallLayout }) {
  const d = hallDims(layout);
  const ref = useRef<THREE.Points>(null);
  const { geo, seeds } = useMemo(() => {
    const n = 180;
    const p = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      // scatter inside the beam's volume
      const z = d.L * (0.25 + t * 0.7);
      const spread = (1 - (z - d.L * 0.25) / (d.L * 0.75)) * 0.8 + 0.2;
      p[i * 3] = (Math.random() - 0.5) * d.g.screen.width * 0.5 * spread;
      p[i * 3 + 1] = layout.screenCenter[1] + (d.H - 1.5 - layout.screenCenter[1]) * (z / d.L) + (Math.random() - 0.5) * 1.6 * spread;
      p[i * 3 + 2] = z;
      seeds[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { geo: g, seeds };
  }, [d, layout]);
  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const a = pts.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < a.count; i++) {
      a.setY(i, a.getY(i) + Math.sin(t * 0.3 + seeds[i]) * 0.0009);
      a.setX(i, a.getX(i) + Math.cos(t * 0.2 + seeds[i]) * 0.0007);
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} raycast={() => null}>
      <pointsMaterial
        size={0.025}
        color="#e8dcc8"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        fog={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Room shell — walls, stepped tiers, stage, curtains, ceiling, lights  */
/* ------------------------------------------------------------------ */
function Room({ layout, houseLights, lowPower }: Pick<SceneProps, 'layout' | 'houseLights' | 'lowPower'>) {
  const d = hallDims(layout);
  const { g, W, L, H } = d;
  const carpet = useMemo(() => carpetTexture(), []);
  const flute = useMemo(() => flutingTexture(g.wallTone), [g.wallTone]);
  const bump = useMemo(() => flutingBump(), []);
  const curtain = useMemo(() => curtainTexture(layout.hall.slug === 'gold' ? '#3e2a18' : '#4a1626'), [layout]);
  const glow = useMemo(() => glowTexture('#e8b77a'), []);

  const floorGeo = useMemo(() => scaleUVs(new THREE.PlaneGeometry(W, L - d.frontWallZ), W / 2, (L - d.frontWallZ) / 2), [W, L, d]);
  const sideGeo = useMemo(() => scaleUVs(new THREE.PlaneGeometry(L - d.frontWallZ, H), (L - d.frontWallZ) / 0.8, 1), [L, H, d]);
  const backGeo = useMemo(() => scaleUVs(new THREE.PlaneGeometry(W, H), W / 0.8, 1), [W, H]);

  const tiers = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    for (let i = 1; i < d.rows; i++) {
      const h = i * g.rise;
      const zFront = (x: number) => g.firstRowZ + i * g.rowPitch - g.rowPitch * 0.55 - d.curveAt(x);
      const shape = new THREE.Shape();
      const half = W / 2 - 0.01;
      const N = g.rowCurve > 0 ? 32 : 1;
      shape.moveTo(-half, -zFront(-half));
      for (let k = 1; k <= N; k++) {
        const x = -half + (2 * half * k) / N;
        shape.lineTo(x, -zFront(x));
      }
      shape.lineTo(half, -(L - 0.01));
      shape.lineTo(-half, -(L - 0.01));
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      scaleUVs(geo, 0.5, 0.5);
      out.push(geo);
    }
    return out;
  }, [d, g, W, L]);

  // step lights at the front edge of every tier, in each aisle and along both side aisles
  const steps = useMemo(() => {
    const pts: [number, number, number][] = [];
    layout.rows.forEach((r) => {
      const xs: number[] = [];
      const first = r.seats[0];
      const last = r.seats[r.seats.length - 1];
      xs.push(first.pos[0] - g.unit * 1.1, last.pos[0] + g.unit * 1.1);
      for (let i = 1; i < r.seats.length; i++) {
        const a = r.seats[i - 1];
        const b = r.seats[i];
        if (b.x2d - a.x2d > (a.w2d + b.w2d) / 2 + 0.5) xs.push((a.pos[0] + b.pos[0]) / 2);
      }
      const y = r.index * g.rise;
      xs.forEach((x) => {
        const z = g.firstRowZ + r.index * g.rowPitch - g.rowPitch * 0.55 - d.curveAt(x) - 0.012;
        pts.push([x, y + 0.04, z]);
      });
    });
    return pts;
  }, [layout, g, d]);
  const stepRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = stepRef.current!;
    steps.forEach((p, i) => {
      tmpObj.position.set(...p);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [steps]);

  const sconceZ = useMemo(() => {
    const zs: number[] = [];
    for (let z = 3.2; z < L - 1.5; z += 3.6) zs.push(z);
    return zs;
  }, [L]);
  const sconceY = Math.min(H * 0.5, 3.4 + d.lastFloor * 0.5);

  const baffles = useMemo(() => {
    const zs: number[] = [];
    for (let z = 1.5; z < L - 0.5; z += 2.2) zs.push(z);
    return zs;
  }, [L]);
  const baffleRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = baffleRef.current!;
    baffles.forEach((z, i) => {
      tmpObj.position.set(0, H - 0.25, z);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [baffles, H]);

  const curtainW = (W - g.screen.width) / 2 - 0.5;
  const wash = houseLights ? 0.55 : 0.22;
  const doorY = d.lastFloor;

  return (
    <group>
      {/* ambient & fill */}
      {/* fill: IBL (RoomLighting) carries most of it; hemisphere adds the up/down cue; ambient is a small floor */}
      <ambientLight intensity={houseLights ? 0.5 : 0.18} color="#9c8cb0" />
      <hemisphereLight args={['#4a3d5c', '#0a0710', houseLights ? 1.5 : 0.9]} />
      <directionalLight position={[2, H, L * 0.6]} intensity={houseLights ? 1.4 : 0.25} color="#f2dcc0" />

      {/* floor and stepped tiers */}
      <mesh geometry={floorGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (L + d.frontWallZ) / 2]}>
        <meshStandardMaterial map={carpet} roughness={1} color="#cbbfd0" />
      </mesh>
      {tiers.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial map={carpet} roughness={1} color="#cbbfd0" />
        </mesh>
      ))}
      <instancedMesh ref={stepRef} args={[undefined, undefined, steps.length]} raycast={() => null}>
        <boxGeometry args={[0.22, 0.03, 0.03]} />
        <meshStandardMaterial color="#000" emissive={g.stepLight} emissiveIntensity={houseLights ? 1.2 : 2.6} toneMapped={false} />
      </instancedMesh>

      {/* walls */}
      <mesh geometry={sideGeo} rotation={[0, Math.PI / 2, 0]} position={[-W / 2, H / 2, (L + d.frontWallZ) / 2]}>
        <meshStandardMaterial map={flute} bumpMap={bump} bumpScale={2} roughness={0.92} />
      </mesh>
      <mesh geometry={sideGeo} rotation={[0, -Math.PI / 2, 0]} position={[W / 2, H / 2, (L + d.frontWallZ) / 2]}>
        <meshStandardMaterial map={flute} bumpMap={bump} bumpScale={2} roughness={0.92} />
      </mesh>
      <mesh geometry={backGeo} rotation={[0, Math.PI, 0]} position={[0, H / 2, L]}>
        <meshStandardMaterial map={flute} bumpMap={bump} bumpScale={2} roughness={0.92} color="#9a90a0" />
      </mesh>
      <mesh position={[0, H / 2, d.frontWallZ]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#09070c" roughness={1} />
      </mesh>

      {/* curtains either side of the screen */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (W / 2 - curtainW / 2 - 0.05), H / 2, d.frontWallZ + 0.12 + (d.sagitta > 0 ? d.sagitta * 0.6 : 0)]}>
          <planeGeometry args={[curtainW, H]} />
          <meshStandardMaterial map={curtain} roughness={0.75} />
        </mesh>
      ))}

      {/* stage */}
      <mesh position={[0, 0.3, d.frontWallZ + d.stageDepth / 2]}>
        <boxGeometry args={[W, 0.6, d.stageDepth]} />
        <meshStandardMaterial color="#120e16" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.58, d.frontWallZ + d.stageDepth + 0.005]}>
        <boxGeometry args={[W, 0.012, 0.012]} />
        <meshStandardMaterial color="#000" emissive="#d2b27a" emissiveIntensity={houseLights ? 0.6 : 1.4} toneMapped={false} />
      </mesh>

      {/* ceiling + acoustic baffles + cove light */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, (L + d.frontWallZ) / 2]}>
        <planeGeometry args={[W, L - d.frontWallZ]} />
        <meshStandardMaterial color="#0c0910" roughness={1} />
      </mesh>
      <instancedMesh ref={baffleRef} args={[undefined, undefined, baffles.length]} raycast={() => null}>
        <boxGeometry args={[W - 0.2, 0.5, 0.18]} />
        <meshStandardMaterial color="#17121d" roughness={0.95} />
      </instancedMesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (W / 2 - 0.35), H - 0.55, (L + d.frontWallZ) / 2]}>
          <boxGeometry args={[0.04, 0.04, L - d.frontWallZ - 1]} />
          <meshStandardMaterial color="#000" emissive="#e8b77a" emissiveIntensity={houseLights ? 2.4 : 0.5} toneMapped={false} />
        </mesh>
      ))}

      {/* wall sconces with soft light pools */}
      {[-1, 1].map((side) =>
        sconceZ.map((z) => (
          <group key={`${side}${z}`} position={[side * (W / 2 - 0.02), sconceY, z]} rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[0.1, 0.5, 0.06]} />
              <meshStandardMaterial color="#000" emissive="#e8b77a" emissiveIntensity={houseLights ? 3 : 1.4} toneMapped={false} />
            </mesh>
            <mesh position={[0, -0.2, 0.03]} raycast={() => null}>
              <planeGeometry args={[2.2, 4.4]} />
              <meshBasicMaterial map={glow} transparent opacity={wash} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
            </mesh>
          </group>
        )),
      )}
      {/* always mounted — adding/removing lights forces every material to recompile; dim to 0 instead */}
      {[-1, 1].map((side) => (
        <pointLight
          key={side}
          position={[side * (W / 2 - 1), sconceY, L * 0.55]}
          color="#e8b77a"
          intensity={lowPower ? 0 : houseLights ? 40 : 16}
          distance={14}
          decay={2}
        />
      ))}

      {/* projector booth window */}
      <mesh position={[0, H - 1.5, L - 0.03]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.3, 0.55]} />
        <meshStandardMaterial color="#000" emissive="#f3dcb0" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>

      {/* doors and exit signs at the back */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (W / 2 - 1.6), doorY, L - 0.04]} rotation={[0, Math.PI, 0]}>
          <mesh position={[0, 1.08, 0]}>
            <planeGeometry args={[1.1, 2.16]} />
            <meshStandardMaterial color="#0e0b12" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.5, 0.01]}>
            <planeGeometry args={[0.5, 0.17]} />
            <meshStandardMaterial color="#000" emissive="#4f9a94" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */

export function AuditoriumScene(props: SceneProps) {
  const { layout, statusOf, povSeatId, onSeatPick, onSeatHover, showAudience } = props;
  const g = layout.hall.geometry;
  const hovered = useRef<string | null>(null);

  const groups = useMemo(() => {
    const unitW = (k: keyof typeof g.seatWidth) => g.seatWidth[k] * g.unit;
    const standard = layout.seats.filter((s) => s.kind === 'standard');
    const recl = layout.seats.filter((s) => s.kind === 'recliner');
    const loveL = layout.seats.filter((s) => s.kind === 'couple' && s.number % 2 === 1);
    const loveR = layout.seats.filter((s) => s.kind === 'couple' && s.number % 2 === 0);
    return [
      { key: 'std', seats: standard, geo: standardSeat(unitW('standard')) },
      { key: 'rec', seats: recl, geo: recliner(unitW('recliner')) },
      { key: 'lovL', seats: loveL, geo: loveseatHalf(unitW('couple'), -1) },
      { key: 'lovR', seats: loveR, geo: loveseatHalf(unitW('couple'), 1) },
    ];
  }, [layout, g]);

  useEffect(() => () => void (document.body.style.cursor = ''), []);
  // these geometries are created here, so they're disposed here when the hall changes
  useEffect(() => () => groups.forEach((gr) => gr.geo.dispose()), [groups]);

  const selectedSeats = layout.seats.filter((s) => statusOf(s.id) === 'selected');
  const pov = povSeatId ? layout.byId.get(povSeatId) : undefined;

  return (
    <>
      <color attach="background" args={['#050407']} />
      <fog attach="fog" args={['#07060a', 16, 75]} />
      <RoomLighting intensity={props.houseLights ? 0.32 : 0.12} />
      <CameraRig {...props} />
      <Room {...props} />
      <Screen {...props} />
      {groups.map((gr) => (
        <SeatGroup
          key={gr.key}
          seats={gr.seats}
          geometry={gr.geo}
          layout={layout}
          statusOf={statusOf}
          povSeatId={povSeatId}
          hovered={hovered}
          onSeatPick={onSeatPick}
          onSeatHover={onSeatHover}
        />
      ))}
      {showAudience && <Audience layout={layout} statusOf={statusOf} povSeatId={povSeatId} />}

      {/* floor glow under selected seats and the seat you're viewing from */}
      {selectedSeats.map((s) => (
        <mesh key={s.id} position={[s.pos[0], s.pos[1] + 0.012, s.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.28, 0.4, 32]} />
          <meshBasicMaterial color="#c0405f" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
      {pov && (
        <mesh position={[pov.pos[0], pov.pos[1] + 0.014, pov.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color="#e8d3a8" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
      {!props.lowPower && <CinemaEffects />}
      <ShaderWarmup />
    </>
  );
}
