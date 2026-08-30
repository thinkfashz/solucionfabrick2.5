'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec2 uPointer;
  uniform vec2 uResolution;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 centered = uv - 0.5;
    centered.x *= aspect;

    vec3 ink = vec3(0.018, 0.020, 0.022);
    vec3 warmInk = vec3(0.055, 0.040, 0.018);
    vec3 amber = vec3(1.0, 0.57, 0.05);
    vec3 ivory = vec3(1.0, 0.94, 0.82);

    float slow = uTime * 0.055;
    vec2 orbA = vec2(-0.34 + sin(slow) * 0.12, 0.34 + cos(slow * 0.82) * 0.08);
    vec2 orbB = vec2(0.48 + cos(slow * 0.66) * 0.10, -0.16 + sin(slow * 0.9) * 0.10);
    vec2 pointer = vec2((uPointer.x - 0.5) * aspect, uPointer.y - 0.5);

    float glowA = exp(-3.7 * length(centered - orbA));
    float glowB = exp(-4.8 * length(centered - orbB));
    float pointerGlow = exp(-7.2 * length(centered - pointer)) * 0.20;
    float ribbon = 0.5 + 0.5 * sin((uv.x * 1.55 + uv.y * 1.15 + slow + uScroll * 0.000055) * 6.2831853);
    ribbon = smoothstep(0.74, 1.0, ribbon) * 0.055;

    vec3 color = mix(ink, warmInk, smoothstep(0.05, 0.94, uv.y));
    color += amber * glowA * 0.16;
    color += amber * glowB * 0.085;
    color += ivory * pointerGlow;
    color += amber * ribbon;

    float vignette = smoothstep(0.95, 0.22, length(centered));
    color *= 0.68 + vignette * 0.36;

    float grain = (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.018;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function FounderExperience() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uTime: { value: 0 },
      uScroll: { value: window.scrollY },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frame = 0;
    let visible = true;
    const clock = new THREE.Clock();

    const resize = () => {
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    };

    const onPointer = (event: PointerEvent) => {
      if (reducedMotion) return;
      uniforms.uPointer.value.set(
        THREE.MathUtils.clamp(event.clientX / Math.max(window.innerWidth, 1), 0, 1),
        THREE.MathUtils.clamp(1 - event.clientY / Math.max(window.innerHeight, 1), 0, 1),
      );
    };

    const onScroll = () => {
      uniforms.uScroll.value = window.scrollY;
    };

    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible && !frame) frame = window.requestAnimationFrame(render);
    };

    const render = () => {
      frame = 0;
      if (!visible) return;
      uniforms.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    resize();
    renderer.render(scene, camera);
    if (!reducedMotion) frame = window.requestAnimationFrame(render);

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      const [{ gsap }, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;

      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const page = document.querySelector<HTMLElement>('[data-founder-page]');
      if (!page) return;

      const context = gsap.context(() => {
        const hero = gsap.utils.toArray<HTMLElement>('[data-founder-hero]');
        gsap.fromTo(
          hero,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.82, stagger: 0.09, ease: 'power3.out', delay: 0.08 },
        );

        const revealItems = gsap.utils.toArray<HTMLElement>('[data-founder-reveal]');
        revealItems.forEach((item) => {
          gsap.fromTo(
            item,
            { autoAlpha: 0, y: 34 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.78,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: item,
                start: 'top 88%',
                once: true,
              },
            },
          );
        });

        const staggerGroups = gsap.utils.toArray<HTMLElement>('[data-founder-stagger]');
        staggerGroups.forEach((group) => {
          const children = Array.from(group.children);
          if (!children.length) return;
          gsap.fromTo(
            children,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.68,
              stagger: 0.075,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: group,
                start: 'top 86%',
                once: true,
              },
            },
          );
        });

        const portrait = document.querySelector<HTMLElement>('[data-founder-portrait]');
        if (portrait) {
          gsap.to(portrait, {
            yPercent: 5,
            scale: 1.025,
            ease: 'none',
            scrollTrigger: {
              trigger: portrait,
              start: 'top 85%',
              end: 'bottom 15%',
              scrub: 0.6,
            },
          });
        }
      }, page);

      ScrollTrigger.refresh();
      cleanup = () => context.revert();
    };

    void setup();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#08090a]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-12%,rgba(255,221,168,.07),transparent_37%),linear-gradient(180deg,rgba(3,4,5,.06),rgba(3,4,5,.38))]" />
      <div className="absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
    </div>
  );
}
