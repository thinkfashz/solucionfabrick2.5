'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, ZapOff } from 'lucide-react';

/**
 * Barcode scanner using the native `BarcodeDetector` API (Chromium/Edge,
 * Android/iOS 17+) with no external dependency. When the API is missing,
 * the component renders a fallback message instead of pulling a 200 KB
 * polyfill — the admin scanner page is desktop-first, and on supported
 * mobiles the API is available.
 *
 * Calls `onDetect(value, format)` once per unique scan, debounced by 1.5 s
 * to avoid duplicate triggers when the same barcode stays in frame.
 */
type BarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_13'
  | 'ean_8'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e';

interface DetectedBarcode {
  rawValue: string;
  format: BarcodeFormat;
}

interface BarcodeDetectorClass {
  new (init?: { formats?: BarcodeFormat[] }): {
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
  };
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorClass;
  }
}

interface BarcodeScannerProps {
  onDetect: (value: string, format: BarcodeFormat) => void;
  onClose?: () => void;
  formats?: BarcodeFormat[];
}

const DEFAULT_FORMATS: BarcodeFormat[] = ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'];
const COOLDOWN_MS = 1500;

export default function BarcodeScanner({ onDetect, onClose, formats = DEFAULT_FORMATS }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastEmittedRef = useRef<{ value: string; t: number } | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;

    async function start() {
      if (typeof window === 'undefined') return;
      if (!('mediaDevices' in navigator) || !window.BarcodeDetector) {
        setSupported(false);
        return;
      }
      setSupported(true);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const Detector = window.BarcodeDetector!;
        const detector = new Detector({ formats });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const codes = await detector.detect(videoRef.current);
              const code = codes[0];
              if (code?.rawValue) {
                const now = Date.now();
                const last = lastEmittedRef.current;
                if (!last || last.value !== code.rawValue || now - last.t > COOLDOWN_MS) {
                  lastEmittedRef.current = { value: code.rawValue, t: now };
                  onDetect(code.rawValue, code.format);
                }
              }
            } catch {
              /* transient detect errors are fine */
            }
          }
          rafId = requestAnimationFrame(() => void tick());
        };
        rafId = requestAnimationFrame(() => void tick());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo abrir la cámara');
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [formats, onDetect]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="absolute right-3 top-3 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black"
        >
          <X size={16} />
        </button>
      )}

      {supported === false ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center text-zinc-300">
          <ZapOff />
          <p className="text-sm">
            Tu navegador no soporta el lector de códigos nativo. Probá desde Chrome o Edge en
            Android/Desktop, o Safari en iOS 17+.
          </p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-72 w-full bg-black object-cover sm:h-96"
            aria-label="Vista previa de cámara"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-3/4 rounded-2xl border-2 border-yellow-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
          <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs text-zinc-300">
            <Camera size={14} className="text-yellow-400" />
            Apuntá al código EAN/QR para escanear automáticamente.
          </div>
          {error && <p className="bg-red-500/10 px-4 py-2 text-xs text-red-300">{error}</p>}
        </>
      )}
    </div>
  );
}
