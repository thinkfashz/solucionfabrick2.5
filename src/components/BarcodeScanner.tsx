'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, RefreshCw, ScanLine, X, ZapOff } from 'lucide-react';

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

type CameraState = 'starting' | 'ready' | 'error' | 'unsupported';

function friendlyCameraError(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'La cámara está bloqueada. Permite el acceso a la cámara para solucionesfabrick.com desde los permisos del navegador y vuelve a intentarlo.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No se encontró una cámara disponible en este dispositivo.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'La cámara está siendo usada por otra aplicación o no pudo iniciarse. Cierra otras apps que usen la cámara y reintenta.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'La cámara no acepta la configuración solicitada. Se intentará abrir con una configuración compatible.';
  }
  if (name === 'SecurityError') {
    return 'El navegador bloqueó la cámara por una política de seguridad. Verifica que estés usando HTTPS y vuelve a intentarlo.';
  }
  return error instanceof Error && error.message
    ? error.message
    : 'No se pudo abrir la cámara. Revisa los permisos del navegador y vuelve a intentarlo.';
}

async function openCamera() {
  const preferred: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name !== 'OverconstrainedError' && name !== 'ConstraintNotSatisfiedError') throw error;
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

export default function BarcodeScanner({ onDetect, onClose, formats = DEFAULT_FORMATS }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastEmittedRef = useRef<{ value: string; t: number } | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('starting');
  const [detectorSupported, setDetectorSupported] = useState<boolean | null>(null);
  const [activeFormats, setActiveFormats] = useState<BarcodeFormat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;
    let detecting = false;

    async function start() {
      setCameraState('starting');
      setError(null);
      setActiveFormats([]);
      setDetectorSupported(null);

      if (typeof window === 'undefined') return;
      if (!window.isSecureContext) {
        setCameraState('error');
        setError('La cámara requiere una conexión segura HTTPS. Abre esta página desde https://www.solucionesfabrick.com.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        setDetectorSupported(false);
        return;
      }

      try {
        // Open the camera first. BarcodeDetector support must never prevent the
        // user from seeing the preview or diagnosing permissions.
        const stream = await openCamera();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error('No se pudo inicializar el visor de cámara.');
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setCameraState('ready');

        const Detector = window.BarcodeDetector;
        if (!Detector) {
          setDetectorSupported(false);
          return;
        }

        let usableFormats = formats;
        try {
          if (Detector.getSupportedFormats) {
            const supportedFormats = await Detector.getSupportedFormats();
            usableFormats = formats.filter((format) => supportedFormats.includes(format));
          }
        } catch {
          // Some implementations expose BarcodeDetector but throw while asking
          // for formats. Fall back to the requested set and let the constructor
          // decide what is usable.
          usableFormats = formats;
        }

        if (!usableFormats.length) {
          setDetectorSupported(false);
          return;
        }

        let detector: BarcodeDetectorInstance;
        try {
          detector = new Detector({ formats: usableFormats });
        } catch {
          setDetectorSupported(false);
          return;
        }

        setDetectorSupported(true);
        setActiveFormats(usableFormats);

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
              // Transient decoding errors are expected while the camera moves.
            } finally {
              detecting = false;
            }
          }
          rafId = requestAnimationFrame(() => void tick());
        };

        rafId = requestAnimationFrame(() => void tick());
      } catch (err) {
        if (cancelled) return;
        setCameraState('error');
        setError(friendlyCameraError(err));
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
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [formats, onDetect, retryKey]);

  const retry = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRetryKey((value) => value + 1);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-[0_24px_80px_rgba(0,0,0,.28)]">
      <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-white backdrop-blur-md">
        <span className={`h-2 w-2 rounded-full ${cameraState === 'ready' ? 'bg-emerald-400' : cameraState === 'error' ? 'bg-rose-400' : 'bg-amber-300 animate-pulse'}`} />
        {cameraState === 'ready' ? 'Cámara activa' : cameraState === 'error' ? 'Cámara bloqueada' : cameraState === 'unsupported' ? 'No compatible' : 'Abriendo cámara'}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md transition hover:bg-black"
        >
          <X size={18} />
        </button>
      )}

      {cameraState === 'unsupported' ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center text-zinc-300 sm:min-h-[420px]">
          <CameraOff className="h-8 w-8 text-amber-300" />
          <div className="max-w-md">
            <p className="font-bold text-white">Este navegador no permite abrir la cámara desde la web.</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Usa Chrome o Edge actualizado, o ingresa el EAN/SKU manualmente.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative min-h-[320px] bg-black sm:min-h-[420px]">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-[min(62vh,540px)] min-h-[320px] w-full bg-black object-cover sm:min-h-[420px]"
              aria-label="Vista previa de cámara"
            />

            {cameraState === 'starting' ? (
              <div className="absolute inset-0 z-10 grid place-items-center bg-black/72 px-6 text-center text-white backdrop-blur-sm">
                <div>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
                  <p className="mt-4 text-sm font-black">Solicitando acceso a la cámara…</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">Acepta el permiso del navegador para activar el visor.</p>
                </div>
              </div>
            ) : null}

            {cameraState === 'error' ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/88 px-6 text-center text-white">
                <div className="max-w-lg">
                  <ZapOff className="mx-auto h-8 w-8 text-rose-300" />
                  <p className="mt-4 text-sm font-black">No pudimos iniciar la cámara</p>
                  <p className="mt-2 text-xs leading-6 text-zinc-300">{error}</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-black"
                  >
                    <RefreshCw className="h-4 w-4" /> Reintentar cámara
                  </button>
                </div>
              </div>
            ) : null}

            {cameraState === 'ready' ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-36 w-[84%] max-w-xl rounded-2xl border-2 border-amber-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.44),0_0_35px_rgba(251,191,36,.20)] sm:h-44">
                  <span className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 animate-pulse bg-amber-200" />
                  <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-white" />
                  <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-white" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-white" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-white" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              {detectorSupported === false ? <Camera size={15} className="text-amber-300" /> : <ScanLine size={15} className="text-amber-300" />}
              {detectorSupported === false
                ? 'El visor funciona, pero este navegador no tiene lector automático. Puedes ingresar el código manualmente.'
                : 'Apunta al QR o código dentro del marco y mantén la cámara estable.'}
            </span>
            {detectorSupported && activeFormats.length ? (
              <span className="shrink-0 text-[10px] font-bold text-zinc-500">{activeFormats.length} formatos activos</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
