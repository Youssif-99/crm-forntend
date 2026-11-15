"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient 3D backdrop: a drifting particle field around a slow-turning
 * wireframe knot. Reacts gently to the pointer. Purely decorative.
 */
export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050b19, 0.06);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Particle field
    const COUNT = 900;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.045,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Wireframe knot (the one memorable object)
    const knotGeo = new THREE.TorusKnotGeometry(2.6, 0.55, 220, 24, 2, 3);
    const knotMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.set(0, 0, -3);
    scene.add(knot);

    // Sizing
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // Pointer parallax
    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    // Loop
    const clock = new THREE.Clock();
    let raf = 0;
    const render = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        knot.rotation.x = t * 0.08;
        knot.rotation.y = t * 0.12;
        particles.rotation.y = t * 0.015;
        particles.rotation.x = Math.sin(t * 0.1) * 0.05;
        camera.position.x += (target.x * 0.9 - camera.position.x) * 0.03;
        camera.position.y += (-target.y * 0.6 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      particleGeo.dispose();
      particleMat.dispose();
      knotGeo.dispose();
      knotMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  );
}