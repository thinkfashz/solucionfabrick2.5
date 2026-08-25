import { FabrickFullLogo, FabrickPeakIcon } from '@/components/FabrickBrandIcon';

export function AdminAccessLoader({
  title = 'Preparando panel',
  description = 'Cargando el centro de control de forma segura.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#070809] px-5 py-10 text-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="fabrick-loader-aurora absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,161,29,.14)_0%,rgba(232,109,20,.055)_36%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      </div>

      <div className="fabrick-loader-enter relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative grid h-28 w-28 place-items-center" aria-hidden="true">
          <span className="fabrick-loader-orbit absolute inset-0 rounded-full border border-amber-300/15 border-t-amber-300/70" />
          <span className="fabrick-loader-orbit-reverse absolute inset-[9px] rounded-full border border-white/[0.07] border-b-orange-400/50" />
          <span className="absolute inset-[18px] rounded-[24px] border border-white/[0.08] bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl" />
          <span className="fabrick-loader-mark relative z-10">
            <FabrickPeakIcon size={66} theme="light" />
          </span>
        </div>

        <div className="fabrick-loader-wordmark relative mt-6 overflow-hidden px-2">
          <FabrickFullLogo priority theme="light" />
          <span className="fabrick-loader-sheen pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-sm" aria-hidden="true" />
        </div>

        <div className="mt-5 flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-100/70">Conexión segura</span>
        </div>

        <h1 className="mt-5 text-[1.7rem] font-black tracking-[-0.045em] text-white">{title}</h1>
        <p className="mt-2 max-w-[19rem] text-sm leading-6 text-white/42">{description}</p>

        <div className="mt-7 h-[3px] w-40 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,.02)]" aria-hidden="true">
          <div className="fabrick-loader-progress h-full w-20 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-orange-500 shadow-[0_0_16px_rgba(245,161,29,.55)]" />
        </div>
        <span className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/24">Soluciones Fabrick</span>
      </div>

      <style>{`
        @keyframes fabrickLoaderEnter {
          0% { opacity: 0; transform: translateY(14px) scale(.97); filter: blur(5px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes fabrickLoaderOrbit {
          to { transform: rotate(360deg); }
        }
        @keyframes fabrickLoaderOrbitReverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes fabrickLoaderMark {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.025); }
        }
        @keyframes fabrickLoaderProgress {
          0% { transform: translateX(-115%); opacity: .35; }
          40% { opacity: 1; }
          100% { transform: translateX(205%); opacity: .45; }
        }
        @keyframes fabrickLoaderSheen {
          0%, 18% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
          36% { opacity: 1; }
          62%, 100% { transform: translateX(620%) skewX(-18deg); opacity: 0; }
        }
        @keyframes fabrickLoaderAurora {
          0%, 100% { opacity: .72; transform: translate(-50%, -50%) scale(.96); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.07); }
        }
        .fabrick-loader-enter { animation: fabrickLoaderEnter .72s cubic-bezier(.2,.8,.2,1) both; }
        .fabrick-loader-orbit { animation: fabrickLoaderOrbit 5.8s linear infinite; }
        .fabrick-loader-orbit-reverse { animation: fabrickLoaderOrbitReverse 8s linear infinite; }
        .fabrick-loader-mark { animation: fabrickLoaderMark 2.25s ease-in-out infinite; }
        .fabrick-loader-progress { animation: fabrickLoaderProgress 1.45s cubic-bezier(.45,0,.2,1) infinite; }
        .fabrick-loader-sheen { left: 0; animation: fabrickLoaderSheen 3.3s ease-in-out infinite; }
        .fabrick-loader-aurora { animation: fabrickLoaderAurora 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .fabrick-loader-enter,
          .fabrick-loader-orbit,
          .fabrick-loader-orbit-reverse,
          .fabrick-loader-mark,
          .fabrick-loader-progress,
          .fabrick-loader-sheen,
          .fabrick-loader-aurora { animation: none !important; }
        }
      `}</style>
    </main>
  );
}

export default AdminAccessLoader;
