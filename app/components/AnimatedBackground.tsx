
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function createParticles(count: number, spread: number) {
  const positions = new Float32Array( count * 3);

  for (let i = 0; i < count; i++) {
    const radius = Math.random() * spread;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] =
      radius * Math.sin(phi) * Math.cos(theta);

    positions[i * 3 + 1] =
      radius * Math.sin(phi) * Math.sin(theta);

    positions[i * 3 + 2] =
      radius * Math.cos(phi);
  }

  return positions;
}

function ParticleLayer({
  count,
  spread,
  size,
  opacity,
  color,
}: {
  count: number;
  spread: number;
  size: number;
  opacity: number;
  color: string;
}) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(
    () => createParticles(count, spread),
    [count, spread]
  );

  useFrame((state, delta) => {
    if (!ref.current) return;

    ref.current.rotation.y += delta * 0.012;
    ref.current.rotation.x += delta * 0.003;

    ref.current.rotation.y +=
      (state.pointer.x * 0.025 -
        ref.current.rotation.y * 0.03) *
      delta;

    ref.current.rotation.x +=
      (-state.pointer.y * 0.02 -
        ref.current.rotation.x * 0.03) *
      delta;
  });

  return (
    <Points
      ref={ref}
      positions={positions}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        opacity={opacity}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function AmbientRings() {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;

    group.current.rotation.z += delta * 0.012;
    group.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.15) * 0.08;

    group.current.rotation.y =
      state.pointer.x * 0.035;
  });

  return (
    <group ref={group} position={[2.5, 0, -3]}>
      <mesh rotation={[0.9, 0.3, 0.2]}>
        <torusGeometry args={[2.8, 0.003, 8, 180]} />
        <meshBasicMaterial
          color="#328bff"
          transparent
          opacity={0.18}
        />
      </mesh>

      <mesh rotation={[1.1, 0.5, -0.4]}>
        <torusGeometry args={[3.5, 0.002, 8, 180]} />
        <meshBasicMaterial
          color="#5b9dff"
          transparent
          opacity={0.1}
        />
      </mesh>

      <mesh rotation={[0.5, 1, 0.7]}>
        <torusGeometry args={[4.1, 0.002, 8, 180]} />
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
}

function Scene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />

      <ParticleLayer
        count={reduced ? 350 : 1400}
        spread={12}
        size={0.022}
        opacity={0.65}
        color="#60a5fa"
      />

      {!reduced && (
        <ParticleLayer
          count={650}
          spread={8}
          size={0.035}
          opacity={0.35}
          color="#a5b4fc"
        />
      )}

      {!reduced && <AmbientRings />}
    </>
  );
}

export default function ThreeBackground() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      aria-hidden="true"
      className="pointer-events-auto fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Atmospheric blue lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[15%] top-[5%] h-[500px] w-[500px] rounded-full bg-blue-600/[0.09] blur-[140px]" />

        <div className="absolute right-[-10%] top-[15%] h-[600px] w-[600px] rounded-full bg-sky-500/[0.07] blur-[160px]" />

        <div className="absolute bottom-[-20%] left-[30%] h-[500px] w-[700px] rounded-full bg-indigo-600/[0.06] blur-[150px]" />
      </div>

      <Canvas
        camera={{
          position: [0, 0, 9],
          fov: 55,
        }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        frameloop={reduced ? "demand" : "always"}
      >
        <Scene reduced={!!reduced} />
      </Canvas>

      {/* Soft cinematic vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(3,8,23,0.28)_100%)]" />
    </motion.div>
  );
}
