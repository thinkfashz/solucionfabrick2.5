import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

export type FabrickLoadingScreenProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  compact?: boolean;
};

export default function FabrickLoadingScreen({
  title = 'Preparando experiencia',
  description = 'Cargando Soluciones Fabrick de forma segura.',
  eyebrow = 'Soluciones Fabrick',
  compact = false,
}: FabrickLoadingScreenProps) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[9999] grid min-h-[100dvh] place-items-center overflow-hidden bg-[#050607] px-5 py-10 text-white"
      data-fabrick-loader="true"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="sf-load-aurora absolute left-1/2 top-[43%] h-[min(108vw,820px)] w-[min(108vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,176,0,.22)_0%,rgba(245,135,31,.09)_31%,rgba(8,9,10,0)_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[.14] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
        <div className="sf-load-beam absolute -left-[30%] top-[-22%] h-[150%] w-[24%] rotate-[18deg] bg-gradient-to-r from-transparent via-white/[.06] to-transparent blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/35 to-transparent" />
      </div>

      <section className={`sf-load-enter relative z-10 flex w-full flex-col items-center text-center ${compact ? 'max-w-md' : 'max-w-2xl'}`}>
        <div className="relative grid place-items-center">
          <div className="sf-load-orbit absolute h-[clamp(190px,39vw,330px)] w-[clamp(190px,39vw,330px)] rounded-full border border-amber-200/[.08]" aria-hidden="true" />
          <div className="sf-load-orbit-reverse absolute h-[clamp(160px,32vw,275px)] w-[clamp(160px,32vw,275px)] rounded-full border border-dashed border-orange-300/[.08]" aria-hidden="true" />
          <div className="sf-load-glow absolute h-[clamp(120px,24vw,210px)] w-[clamp(220px,58vw,580px)] rounded-full bg-amber-400/12 blur-3xl" aria-hidden="true" />

          <div className="sf-load-logo relative overflow-hidden px-3 py-5">
            <FabrickFullLogo className="relative z-10 [&>span]:!h-[clamp(112px,21vw,196px)] [&>span]:!w-[min(94vw,740px)]" priority theme="light" />
            <span className="sf-load-sheen pointer-events-none absolute inset-y-2 left-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-md" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-5 inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-200/10 bg-white/[.035] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-md">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <span className="text-[9px] font-black uppercase tracking-[.24em] text-amber-100/65">{eyebrow}</span>
        </div>

        <h1 className="mt-5 text-[clamp(1.45rem,4vw,2rem)] font-black tracking-[-.045em] text-white">{title}</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/45">{description}</p>

        <div className="mt-7 flex w-full max-w-[236px] items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
          <div className="h-[3px] w-36 overflow-hidden rounded-full bg-white/[.065] shadow-[inset_0_0_0_1px_rgba(255,255,255,.025)]">
            <div className="sf-load-progress h-full w-16 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-orange-500 shadow-[0_0_18px_rgba(245,161,29,.58)]" />
          </div>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
        </div>

        <p className="mt-4 text-[8px] font-bold uppercase tracking-[.22em] text-white/22" aria-hidden="true">Construcción · Remodelación · Soluciones</p>
      </section>

      <style>{`
        @keyframes sfLoadEnter {
          0% { opacity: 0; transform: translateY(14px) scale(.98); filter: blur(5px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes sfLoadProgress {
          0% { transform: translateX(-150%); opacity: .28; }
          42% { opacity: 1; }
          100% { transform: translateX(260%); opacity: .35; }
        }
        @keyframes sfLoadSheen {
          0%, 14% { transform: translateX(-240%) skewX(-18deg); opacity: 0; }
          34% { opacity: .92; }
          66%, 100% { transform: translateX(900%) skewX(-18deg); opacity: 0; }
        }
        @keyframes sfLoadAurora {
          0%, 100% { opacity: .66; transform: translate(-50%, -50%) scale(.96); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes sfLoadBeam {
          0%, 100% { transform: translateX(-20%) rotate(18deg); opacity: .2; }
          50% { transform: translateX(430%) rotate(18deg); opacity: .66; }
        }
        @keyframes sfLoadOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sfLoadOrbitReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .sf-load-enter { animation: sfLoadEnter .62s cubic-bezier(.16,1,.3,1) both; }
        .sf-load-progress { animation: sfLoadProgress 1.35s cubic-bezier(.45,0,.2,1) infinite; }
        .sf-load-sheen { animation: sfLoadSheen 3.35s ease-in-out infinite; }
        .sf-load-aurora { animation: sfLoadAurora 4.2s ease-in-out infinite; }
        .sf-load-beam { animation: sfLoadBeam 5.2s ease-in-out infinite; }
        .sf-load-orbit { animation: sfLoadOrbit 16s linear infinite; }
        .sf-load-orbit-reverse { animation: sfLoadOrbitReverse 23s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sf-load-enter, .sf-load-progress, .sf-load-sheen, .sf-load-aurora, .sf-load-beam, .sf-load-orbit, .sf-load-orbit-reverse { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
