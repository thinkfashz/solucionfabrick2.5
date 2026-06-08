'use client';

/**
 * DottedSurface — fondo animado de "ola de puntos" en Three.js.
 *
 * Inspirado en el componente "Dotted Surface" de 21st.dev (a su vez basado
 * en el clásico ejemplo `webgl_points_waves` de three.js): una grilla de
 * partículas que ondula en el eje Y mediante funciones seno desfasadas por
 * posición y tiempo, renderizadas como puntos circulares vía shader propio
 * (evita depender de una textura/sprite externa).
 *
 * Se integra como capa de fondo absoluta y transparente — el contenedor
 * padre define el tamaño. SSR-safe: todo el setup vive en `useEffect` y se
 * limpia por completo al desmontar (rAF cancelado, geometría/material/
 * renderer disposed, canvas removido, listener de resize desuscrito).
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DottedSurfaceProps {
  className?: string;
  /** Color de los puntos (hex Three.js, ej. 0xfacc15). Default: amarillo Fabrick. */
  color?: number;
}

const SEPARATION = 80;
const AMOUNT_X = 44;
const AMOUNT_Y = 34;

export default function DottedSurface({ className = '', color = 0xfacc15 }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 1;
    let height = container.clientHeight || 1;

    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 10_000);
    camera.position.set(0, 420, 1400);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0014);

    const numParticles = AMOUNT_X * AMOUNT_Y;
    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);

    let i = 0;
    let j = 0;
    for (let ix = 0; ix < AMOUNT_X; ix++) {
      for (let iy = 0; iy < AMOUNT_Y; iy++) {
        positions[i] = ix * SEPARATION - (AMOUNT_X * SEPARATION) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * SEPARATION - (AMOUNT_Y * SEPARATION) / 2;
        scales[j] = 1;
        i += 3;
        j += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float scale;
        varying float vScale;
        void main() {
          vScale = scale;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = scale * (340.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vScale;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, d) * clamp(vScale / 22.0, 0.18, 0.85);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    let animId = 0;
    let count = 0;

    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const scaleAttr = geometry.getAttribute('scale') as THREE.BufferAttribute;
    const positionArr = positionAttr.array as Float32Array;
    const scaleArr = scaleAttr.array as Float32Array;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      let p = 0;
      let s = 0;
      for (let ix = 0; ix < AMOUNT_X; ix++) {
        for (let iy = 0; iy < AMOUNT_Y; iy++) {
          positionArr[p + 1] =
            Math.sin((ix + count) * 0.3) * 42 + Math.sin((iy + count) * 0.5) * 42;
          scaleArr[s] =
            (Math.sin((ix + count) * 0.3) + 1) * 8 + (Math.sin((iy + count) * 0.5) + 1) * 8;
          p += 3;
          s += 1;
        }
      }

      positionAttr.needsUpdate = true;
      scaleAttr.needsUpdate = true;

      renderer.render(scene, camera);
      count += 0.06;
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 1;
      height = container.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [color]);

  return <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden />;
}
