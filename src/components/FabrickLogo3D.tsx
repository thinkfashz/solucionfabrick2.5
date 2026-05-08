'use client';

/**
 * FabrickLogo3D
 * ----------------------------------------------------------------
 * Versión 3D (Three.js) del logo "SOLUCIONES FABRICK – Tu obra en buenas manos",
 * portada del HTML/Three.js suministrado por el cliente a un componente React
 * reutilizable que se adapta a cualquier contenedor (admin y frontend).
 *
 * Diferencias relevantes vs. el snippet original:
 *  - No usa CDN: importa `three` (ya está en package.json) — `import * as THREE`.
 *  - No fuerza `body { overflow:hidden }` ni tamaños `100vw/100vh`. El renderer
 *    se ajusta al contenedor mediante `ResizeObserver`.
 *  - SSR-safe: todo el setup vive dentro de `useEffect`. El componente lleva
 *    `'use client'` para que Next.js no intente renderizarlo en el servidor.
 *  - Limpieza completa al desmontar (rAF cancelado, geometries / materials /
 *    textures / renderer disposed, canvas removido, listeners desuscritos).
 *  - Interactividad opcional via prop `interactive`. Si está desactivada, el
 *    raycaster no se evalúa y el cursor no cambia.
 *  - Pista visual ("¡Haz clic en el logo!") opcional via `showHint`.
 *
 * Uso típico:
 *   <FabrickLogo3D height={420} className="my-8" />
 *   <FabrickLogo3D interactive={false} showHint={false} height="100%" />
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import * as THREE from 'three';

interface FabrickLogo3DProps {
  /** Clases CSS adicionales para el contenedor raíz. */
  className?: string;
  /** Altura del contenedor. Acepta número (px) o cualquier valor CSS válido. Default: 480. */
  height?: number | string;
  /** Habilita clic+expand+spin sobre el logo. Default: true. */
  interactive?: boolean;
  /** Muestra el texto pulsante "¡Haz clic en el logo!". Default = `interactive`. */
  showHint?: boolean;
  /** Si true, el canvas tiene fondo transparente (toma el color del padre). Default: true. */
  transparent?: boolean;
  /**
   * Distancia fija de la cámara al origen (eje Z). Si se omite, el componente
   * usa el comportamiento responsivo por defecto (35 en mobile, 22 en desktop).
   * Útil cuando el logo vive en un contenedor pequeño (p. ej. la barra de
   * navegación) y el default haría que el modelo se vea como un punto.
   */
  cameraZ?: number;
  /** Callback opcional disparado al hacer clic sobre el logo. */
  onLogoClick?: () => void;
  /**
   * Si `false`, el plano con el texto "SOLUCIONES FABRICK / Tu obra en buenas
   * manos" no se dibuja: sólo se anima la cercha 3D (techo metálico dorado).
   * Útil cuando el logo vive en contenedores pequeños como el navbar, donde
   * el texto rasterizado a `CanvasTexture` se ve borroso al downscalear.
   * Cuando es `false` también centramos el truss en `y=0` (en lugar del
   * `y=2.5` original que deja espacio para el texto debajo). Default: true.
   */
  showText?: boolean;
}

export default function FabrickLogo3D({
  className = '',
  height = 480,
  interactive = true,
  showHint,
  transparent = true,
  cameraZ,
  onLogoClick,
  showText = true,
}: FabrickLogo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  // onLogoClick se accede vía ref para que un cambio de identidad de la
  // callback (p.ej. callback inline en el padre) no fuerce a destruir y
  // recrear el contexto WebGL en cada render.
  const onLogoClickRef = useRef<typeof onLogoClick>(onLogoClick);
  useEffect(() => {
    onLogoClickRef.current = onLogoClick;
  }, [onLogoClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof window === 'undefined') return;

    // ----------------------------------------------------------------
    // Escena, cámara, renderer
    // ----------------------------------------------------------------
    const scene = new THREE.Scene();

    const initialWidth = Math.max(1, container.clientWidth);
    const initialHeight = Math.max(1, container.clientHeight);

    const camera = new THREE.PerspectiveCamera(
      45,
      initialWidth / initialHeight,
      0.1,
      1000,
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: transparent,
    });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (!transparent) {
      renderer.setClearColor(0x1a1a1a, 1);
    }
    container.appendChild(renderer.domElement);

    // ----------------------------------------------------------------
    // Iluminación
    // ----------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-10, 0, 15);
    scene.add(fillLight);

    // ----------------------------------------------------------------
    // Cercha (techo metálico dorado)
    // ----------------------------------------------------------------
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    const trussGroup = new THREE.Group();

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xdeb841,
      metalness: 0.8,
      roughness: 0.35,
    });

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-7, 0);
    roofShape.lineTo(0, 2.5);
    roofShape.lineTo(3.5, 1.25);
    roofShape.lineTo(3.5, 2.2);
    roofShape.lineTo(4.5, 2.2);
    roofShape.lineTo(4.5, 0.89);
    roofShape.lineTo(7, 0);
    roofShape.lineTo(0, 1.5);
    roofShape.lineTo(-7, 0);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 1.0,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 4,
    };

    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    roofGeometry.center();

    const roofMesh = new THREE.Mesh(roofGeometry, goldMaterial);
    trussGroup.add(roofMesh);
    // Sin texto, el truss queda centrado verticalmente. Con texto, lo
    // levantamos a y=2.5 para dejar espacio al plano del wordmark debajo.
    const trussBaseY = showText ? 2.5 : 0;
    trussGroup.position.set(0, trussBaseY, 0);
    logoGroup.add(trussGroup);

    // ----------------------------------------------------------------
    // Texto: SOLUCIONES FABRICK + eslogan (sólo si showText=true)
    // ----------------------------------------------------------------
    let textCanvas: HTMLCanvasElement | null = null;
    let texture: THREE.CanvasTexture | null = null;
    let planeGeo: THREE.PlaneGeometry | null = null;
    let planeMat: THREE.MeshStandardMaterial | null = null;

    if (showText) {
    textCanvas = document.createElement('canvas');
    textCanvas.width = 2048;
    textCanvas.height = 1024;
    const ctx = textCanvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.font =
        'bold 130px "Nunito", "Arial Rounded MT Bold", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const titleY = 400;
      const title = 'SOLUCIONES FABRICK';

      ctx.lineWidth = 18;
      ctx.strokeStyle = '#111111';
      ctx.strokeText(title, textCanvas.width / 2, titleY);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(title, textCanvas.width / 2, titleY);

      ctx.font = 'italic bold 75px "Nunito", "Segoe UI", Arial, sans-serif';
      const sloganY = 560;
      const slogan = 'Tu obra en buenas manos';

      ctx.lineWidth = 12;
      ctx.strokeStyle = '#111111';
      ctx.strokeText(slogan, textCanvas.width / 2, sloganY);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(slogan, textCanvas.width / 2, sloganY);
    }

    texture = new THREE.CanvasTexture(textCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    planeGeo = new THREE.PlaneGeometry(24, 12);
    planeMat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1,
    });
    const textPlane = new THREE.Mesh(planeGeo, planeMat);
    textPlane.position.y = -4;
    logoGroup.add(textPlane);
    } // end if (showText)

    // ----------------------------------------------------------------
    // Cámara + responsividad por contenedor
    // ----------------------------------------------------------------
    const adjustCamera = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.position.z = cameraZ ?? (w < 768 ? 35 : 22);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    adjustCamera();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => adjustCamera())
        : null;
    resizeObserver?.observe(container);
    window.addEventListener('resize', adjustCamera);

    // ----------------------------------------------------------------
    // Interactividad
    // ----------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isExpanded = false;
    let targetScale = 1;
    let spinAngle = 0;
    let targetSpinAngle = 0;
    let roofOffsetY = 0;
    let targetRoofOffsetY = 0;

    const updateMouseFromEvent = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (event: MouseEvent) => {
      if (!interactive) return;
      updateMouseFromEvent(event);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(logoGroup.children, true);
      renderer.domElement.style.cursor =
        intersects.length > 0 ? 'pointer' : 'default';
    };

    const onClick = (event: MouseEvent) => {
      if (!interactive) return;
      updateMouseFromEvent(event);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(logoGroup.children, true);
      if (intersects.length === 0) return;

      isExpanded = !isExpanded;
      const isSmall = container.clientWidth < 768;

      if (isExpanded) {
        targetScale = isSmall ? 1.5 : 1.8;
        targetSpinAngle += Math.PI * 2;
        targetRoofOffsetY = 2.0;
        if (hintRef.current) hintRef.current.style.opacity = '0';
      } else {
        targetScale = 1;
        targetSpinAngle -= Math.PI * 2;
        targetRoofOffsetY = 0;
        if (hintRef.current) hintRef.current.style.opacity = '1';
      }

      onLogoClickRef.current?.();
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // ----------------------------------------------------------------
    // Bucle de animación
    // ----------------------------------------------------------------
    const clock = new THREE.Clock();
    let rafId: number | null = null;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      const currentScale = logoGroup.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.08);
      logoGroup.scale.set(newScale, newScale, newScale);

      spinAngle = THREE.MathUtils.lerp(spinAngle, targetSpinAngle, 0.05);
      roofOffsetY = THREE.MathUtils.lerp(roofOffsetY, targetRoofOffsetY, 0.08);
      trussGroup.position.y = trussBaseY + roofOffsetY;

      logoGroup.position.y = Math.sin(elapsed * 1.0) * 0.2;
      logoGroup.rotation.y = Math.sin(elapsed * 0.5) * 0.15 + spinAngle;
      trussGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.02;

      renderer.render(scene, camera);
    };
    animate();

    // ----------------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------------
    return () => {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);

      window.removeEventListener('resize', adjustCamera);
      resizeObserver?.disconnect();

      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);

      roofGeometry.dispose();
      goldMaterial.dispose();
      planeGeo?.dispose();
      planeMat?.dispose();
      texture?.dispose();

      scene.clear();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [interactive, transparent, cameraZ, showText]);

  const showHintResolved = showHint ?? interactive;

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: typeof height === 'number' ? `${height}px` : height,
    overflow: 'hidden',
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      aria-label="Logo 3D — Soluciones Fabrick"
      role="img"
    >
      {showHintResolved && (
        <div
          ref={hintRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '1rem',
            fontWeight: 700,
            pointerEvents: 'none',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            zIndex: 2,
            transition: 'opacity 0.5s ease',
            animation: 'fabrick-logo3d-pulse 2s infinite',
          }}
        >
          ¡Haz clic en el logo!
        </div>
      )}
      <style jsx>{`
        @keyframes fabrick-logo3d-pulse {
          0% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
