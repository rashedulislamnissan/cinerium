import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Restrained post-processing for capable devices (master plan §5.3: bloom only
 * on the high tier, low strength, screen + emissives only).
 * RenderPass → UnrealBloom (half-res, high threshold) → vignette → OutputPass
 * (tone mapping + sRGB happen once, last).
 * perf: 4 full-screen passes; bloom mips at half resolution; ~+1.5 ms on an iGPU.
 */
export function CinemaEffects() {
  const { gl, scene, camera, size } = useThree();

  const { composer, bloom } = useMemo(() => {
    // MSAA on the composer's target — canvas antialiasing doesn't apply to render targets
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, target);
    c.addPass(new RenderPass(scene, camera));
    const b = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.6, 0.86);
    c.addPass(b);
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.92;
    vignette.uniforms.darkness.value = 1.05;
    c.addPass(vignette);
    c.addPass(new OutputPass());
    return { composer: c, bloom: b };
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    bloom.resolution.set(size.width / 2, size.height / 2);
  }, [composer, bloom, gl, size]);

  useEffect(() => () => composer.dispose(), [composer]);

  // priority 1 takes over rendering from R3F for as long as this is mounted
  useFrame(() => composer.render(), 1);
  return null;
}

/**
 * Low-intensity image-based lighting. Gives fabric, leather and metal soft,
 * believable reflections instead of the flat look of ambient-only light.
 */
export function RoomLighting({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    pmrem.dispose();
    room.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return null;
}

/** Compile every shader up front so the first camera move doesn't stall. */
export function ShaderWarmup() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);
  return null;
}
