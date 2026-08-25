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
      className="fixed inset-0 z-[9999] grid place-items-center overflow-hidden bg-[#050607] px-5 py-10 text-white"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="sf-load-aurora absolute left-1/2 top-[44%] h-[min(96vw,760px)] w-[min(96vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,181,35,.18)_0%,rgba(205,111,0,.07)_34%,transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[.13] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
        <div className="sf-load-beam absolute -left-[30%] top-[-22%] h-[150%] w-[26%] rotate-[18deg] bg-gradient-to-r from-transparent via-white/[.055] to-transparent blur-2xl" />
      </div>

      <section className={`sf-load-enter relative z-10 flex w-full flex-col items-center text-center ${compact ? 'max-w-md' : 'max-w-2xl'}`}>
        <div className="sf-load-logo relative w-full overflow-hidden px-3 py-3">
          <div className="sf-load-glow absolute inset-x-[12%] top-1/2 h-20 -translate-y-1/2 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
          <FabrickFullLogo className="relative z-10 [&>span]:!h-[clamp(108px,20vw,190px)] [&>span]:!w-[min(94vw,720px)]" priority theme="light" />
          <span className="sf-load-sheen pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-white/24 to-transparent blur-md" aria-hidden="true" />
        </div>

        <div className="mt-5 inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-200/10 bg-white/[.035] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <span className="text-[9px] font-black uppercase tracking-[.24em] text-amber-100/65">{eyebrow}</span>
        </div>

        <h1 className="mt-5 text-[clamp(1.45rem,4vw,2rem)] font-black tracking-[-.045em] text-white">{title}</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/42">{description}</p>

        <div className="mt-7 h-[3px] w-48 overflow-hidden rounded-full bg-white/[.065] shadow-[inset_0_0_0_1px_rgba(255,255,255,.025)]" aria-hidden="true">
          <div className="sf-load-progress h-full w-24 rounded-full bg-gradient-to-r from-transparent via-amber-300 to-orange-500 shadow-[0_0_18px_rgba(245,161,29,.58)]" />
        </div>
      </section>

      <style>{`
        @keyframes sfLoadEnter {
          0% { opacity: 0; transform: translateY(16px) scale(.975); filter: blur(5px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes sfLoadProgress {
          0% { transform: translateX(-130%); opacity: .3; }
          42% { opacity: 1; }
          100% { transform: translateX(210%); opacity: .38; }
        }
        @keyframes sfLoadSheen {
          0%, 14% { transform: translateX(-220%) skewX(-18deg); opacity: 0; }
          34% { opacity: .95; }
          66%, 100% { transform: translateX(850%) skewX(-18deg); opacity: 0; }
        }
        @keyframes sfLoadAurora {
          0%, 100% { opacity: .68; transform: translate(-50%, -50%) scale(.96); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes sfLoadBeam {
          0%, 100% { transform: translateX(-20%) rotate(18deg); opacity: .28; }
          50% { transform: translateX(420%) rotate(18deg); opacity: .72; }
        }
        .sf-load-enter { animation: sfLoadEnter .68s cubic-bezier(.16,1,.3,1) both; }
        .sf-load-progress { animation: sfLoadProgress 1.45s cubic-bezier(.45,0,.2,1) infinite; }
        .sf-load-sheen { animation: sfLoadSheen 3.4s ease-in-out infinite; }
        .sf-load-aurora { animation: sfLoadAurora 4.2s ease-in-out infinite; }
        .sf-load-beam { animation: sfLoadBeam 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sf-load-enter, .sf-load-progress, .sf-load-sheen, .sf-load-aurora, .sf-load-beam { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
