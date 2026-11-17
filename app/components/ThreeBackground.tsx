"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient 3D backdrop: drifting particles around a luminous orbital sculpture.
 * Reacts gently to pointer movement and page scroll. Purely decorative.
 */
export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050916, 0.06);

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
      color: 0x9beafe,
      size: 0.045,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const sculpture = new THREE.Group();
    sculpture.position.set(2.7, 0.2, -3.2);
    scene.add(sculpture);

    const coreGeo = new THREE.IcosahedronGeometry(1.35, 3);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      wireframe: true,
      transparent: true,
      opacity: 0.24,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    sculpture.add(core);

    const shellGeo = new THREE.SphereGeometry(1.12, 36, 36);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    sculpture.add(shell);

    const rings: THREE.Mesh[] = [];
    const ringColors = [0x22d3ee, 0xa78bfa, 0xf0abfc];
    for (let i = 0; i < ringColors.length; i++) {
      const ringGeo = new THREE.TorusGeometry(2 + i * 0.22, 0.008, 8, 180);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.58 - i * 0.1,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(0.7 + i * 0.48, 0.4 + i * 0.72, i * 0.35);
      rings.push(ring);
      sculpture.add(ring);
    }

    const satelliteGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const satellites = [0, 1, 2].map((index) => {
      const material = new THREE.MeshBasicMaterial({
        color: ringColors[index],
        transparent: true,
        opacity: 0.9,
      });
      const satellite = new THREE.Mesh(satelliteGeo, material);
      sculpture.add(satellite);
      return satellite;
    });

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
    let scrollProgress = 0;
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);
    const onScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Loop
    const timer = new THREE.Timer();
    timer.connect(document);
    let raf = 0;
    const render = () => {
      timer.update();
      const t = timer.getElapsed();
      if (!reduceMotion) {
        sculpture.rotation.x = t * 0.045 + target.y * 0.08;
        sculpture.rotation.y = t * 0.07 + target.x * 0.12 + scrollProgress * 0.45;
        sculpture.position.y = 0.2 + scrollProgress * 1.25;
        rings.forEach((ring, index) => {
          ring.rotation.z += (index % 2 === 0 ? 1 : -1) * 0.0008;
        });
        satellites.forEach((satellite, index) => {
          const angle = t * (0.32 + index * 0.08) + index * ((Math.PI * 2) / 3);
          satellite.position.set(
            Math.cos(angle) * (1.72 + index * 0.1),
            Math.sin(angle * 1.15) * 0.9,
            Math.sin(angle) * (1.72 + index * 0.1),
          );
        });
        particles.rotation.y = t * 0.015;
        particles.rotation.x = Math.sin(t * 0.1) * 0.05;
        camera.position.x += (target.x * 0.35 - camera.position.x) * 0.03;
        camera.position.y += (-target.y * 0.25 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
      }
      renderer.render(scene, camera);
      if (!reduceMotion) {
        raf = requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      timer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      particleGeo.dispose();
      particleMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      rings.forEach((ring) => {
        ring.geometry.dispose();
        if (Array.isArray(ring.material)) {
          ring.material.forEach((material) => material.dispose());
        } else {
          ring.material.dispose();
        }
      });
      satelliteGeo.dispose();
      satellites.forEach((satellite) => satellite.material.dispose());
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