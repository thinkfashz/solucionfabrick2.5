import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

export type FabrickLoadingScreenProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  compact?: boolean;
};

export default function FabrickLoadingScreen({
  title = 'Preparando experiencia',
  description = 'Cargando Soluciones Fabrick.',
  eyebrow = 'Soluciones Fabrick',
  compact = false,
}: FabrickLoadingScreenProps) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[9999] grid min-h-[100dvh] place-items-center overflow-hidden bg-[#050607] px-4 py-8 text-white sm:px-6"
      data-fabrick-loader="responsive-v2"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="sf-load-aura absolute left-1/2 top-[41%] h-[min(112vw,760px)] w-[min(112vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,179,0,.2)_0%,rgba(238,116,0,.08)_34%,rgba(5,6,7,0)_72%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[.09] [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
      </div>

      <section className={`sf-load-enter relative z-10 flex w-full flex-col items-center text-center ${compact ? 'max-w-sm' : 'max-w-xl'}`}>
        <div className="relative grid min-h-[260px] place-items-center md:min-h-[220px]">
          <div className="sf-load-ring absolute h-[220px] w-[220px] rounded-full border border-amber-200/[.07] md:h-[300px] md:w-[300px]" aria-hidden="true" />
          <div className="sf-load-ring-reverse absolute h-[178px] w-[178px] rounded-full border border-dashed border-orange-300/[.06] md:h-[244px] md:w-[244px]" aria-hidden="true" />
          <div className="absolute h-[120px] w-[220px] rounded-full bg-amber-400/10 blur-3xl md:h-[140px] md:w-[430px]" aria-hidden="true" />

          <div className="sf-load-logo relative z-10 flex items-center justify-center px-2 py-3">
            <FabrickFullLogo priority responsive theme="light" />
            <span className="sf-load-sheen pointer-events-none absolute inset-y-6 left-1/2 w-14 -translate-x-[260%] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-md md:w-20" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-1 inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-200/10 bg-white/[.035] px-3 py-1.5 backdrop-blur-md md:mt-4">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-30" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <span className="text-[8px] font-black uppercase tracking-[.22em] text-amber-100/65 sm:text-[9px]">{eyebrow}</span>
        </div>

        <h1 className="mt-4 max-w-[92vw] text-[clamp(1.2rem,6vw,1.9rem)] font-black tracking-[-.04em] text-white md:mt-5">{title}</h1>
        <p className="mt-2 max-w-[320px] text-[12px] leading-5 text-white/42 sm:text-sm sm:leading-6 md:max-w-md">{description}</p>

        <div className="mt-6 w-[min(70vw,220px)] md:mt-7" aria-hidden="true">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[.07]">
            <div className="sf-load-progress h-full w-[34%] rounded-full bg-gradient-to-r from-transparent via-amber-300 to-orange-500 shadow-[0_0_18px_rgba(245,161,29,.55)]" />
          </div>
        </div>

        <p className="mt-4 hidden text-[8px] font-bold uppercase tracking-[.2em] text-white/20 sm:block" aria-hidden="true">Construcción · Remodelación · Soluciones</p>
      </section>

      <style>{`
        @keyframes sfLoadEnter {
          0% { opacity: 0; transform: translateY(10px) scale(.985); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes sfLoadProgress {
          0% { transform: translateX(-145%); opacity: .3; }
          45% { opacity: 1; }
          100% { transform: translateX(300%); opacity: .32; }
        }
        @keyframes sfLoadSheen {
          0%, 18% { transform: translateX(-310%) skewX(-16deg); opacity: 0; }
          38% { opacity: .8; }
          66%, 100% { transform: translateX(620%) skewX(-16deg); opacity: 0; }
        }
        @keyframes sfLoadAura {
          0%, 100% { opacity: .62; transform: translate(-50%, -50%) scale(.96); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes sfLoadRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sfLoadRingReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .sf-load-enter { animation: sfLoadEnter .48s cubic-bezier(.16,1,.3,1) both; }
        .sf-load-progress { animation: sfLoadProgress 1.25s cubic-bezier(.45,0,.2,1) infinite; }
        .sf-load-sheen { animation: sfLoadSheen 3.2s ease-in-out infinite; }
        .sf-load-aura { animation: sfLoadAura 4s ease-in-out infinite; }
        .sf-load-ring { animation: sfLoadRing 17s linear infinite; }
        .sf-load-ring-reverse { animation: sfLoadRingReverse 24s linear infinite; }
        @media (max-width: 480px) and (max-height: 760px) {
          .sf-load-logo { transform: scale(.88); margin-block: -18px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-load-enter, .sf-load-progress, .sf-load-sheen, .sf-load-aura, .sf-load-ring, .sf-load-ring-reverse { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
