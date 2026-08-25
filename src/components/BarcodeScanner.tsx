'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, ZapOff } from 'lucide-react';

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

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorClass {
  new (init?: { formats?: BarcodeFormat[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<BarcodeFormat[]>;
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

const DEFAULT_FORMATS: BarcodeFormat[] = [
  'qr_code',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'data_matrix',
  'itf',
];

const SAME_CODE_COOLDOWN_MS = 2500;

export default function BarcodeScanner({ onDetect, onClose, formats = DEFAULT_FORMATS }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastEmittedRef = useRef<{ value: string; t: number } | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [activeFormats, setActiveFormats] = useState<BarcodeFormat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;
    let detecting = false;

    async function start() {
      if (typeof window === 'undefined') return;
      if (!navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) {
        setSupported(false);
        return;
      }
      setSupported(true);

      try {
        const Detector = window.BarcodeDetector;
        let usableFormats = formats;
        if (Detector.getSupportedFormats) {
          const supportedFormats = await Detector.getSupportedFormats();
          usableFormats = formats.filter((format) => supportedFormats.includes(format));
        }
        if (!usableFormats.length) throw new Error('Este navegador no expone formatos de QR/código compatibles.');
        if (cancelled) return;
        setActiveFormats(usableFormats);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new Detector({ formats: usableFormats });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          if (!detecting && videoRef.current.readyState >= 2) {
            detecting = true;
            try {
              const codes = await detector.detect(videoRef.current);
              const code = codes[0];
              const value = code?.rawValue?.trim();
              if (value) {
                const now = Date.now();
                const last = lastEmittedRef.current;
                if (!last || last.value !== value || now - last.t > SAME_CODE_COOLDOWN_MS) {
                  lastEmittedRef.current = { value, t: now };
                  if ('vibrate' in navigator) navigator.vibrate?.(45);
                  onDetect(value, code.format);
                }
              }
            } catch {
              // Transient frame decoding errors are expected while the camera moves.
            } finally {
              detecting = false;
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
        streamRef.current.getTracks().forEach((track) => track.stop());
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
            Este navegador no ofrece el lector nativo de QR/códigos. Usa Chrome o Edge actualizado en Android/Desktop, o ingresa el código manualmente.
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
            <div className="relative h-32 w-[82%] max-w-xl rounded-2xl border-2 border-yellow-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              <span className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 animate-pulse bg-yellow-300/80" />
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-zinc-800 bg-zinc-900/90 px-4 py-2 text-xs text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2"><Camera size={14} className="text-yellow-400" /> Apunta al QR o código y mantén la cámara estable.</span>
            {activeFormats.length ? <span className="text-[10px] text-zinc-500">{activeFormats.length} formatos activos</span> : null}
          </div>
          {error && <p className="bg-red-500/10 px-4 py-2 text-xs text-red-300">{error}</p>}
        </>
      )}
    </div>
  );
}
