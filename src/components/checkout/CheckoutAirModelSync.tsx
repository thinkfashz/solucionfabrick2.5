'use client';

import { useEffect } from 'react';

type Capacity = 9000 | 12000 | 18000 | 24000;

const WIDTH: Record<Capacity, number> = {
  9000: 72,
  12000: 80,
  18000: 91,
  24000: 100,
};

function detectCapacity(src: string): Capacity | null {
  const match = src.match(/air-(9|12|18|24)k-(?:universal-)?v\d+\.png/i);
  if (!match) return null;
  const value = Number(match[1]) * 1000;
  return value === 9000 || value === 12000 || value === 18000 || value === 24000 ? value : null;
}

function createUniversalModel(capacity: Capacity) {
  const root = document.createElement('div');
  root.className = 'checkout-air-sync-model';
  root.dataset.capacity = String(capacity);
  root.style.setProperty('--checkout-air-width', `${WIDTH[capacity]}%`);
  root.innerHTML = `
    <div class="checkout-air-sync-wrap">
      <div class="checkout-air-sync-shadow"></div>
      <div class="checkout-air-sync-shell">
        <div class="checkout-air-sync-highlight"></div>
        <div class="checkout-air-sync-brand"><strong>FABRICK</strong><span>INVERTER</span></div>
        <div class="checkout-air-sync-display"><strong>22°</strong><span>COOL&nbsp;&nbsp;<b>ECO</b></span></div>
        <div class="checkout-air-sync-louver"></div>
        <div class="checkout-air-sync-vent">
          ${Array.from({ length: 12 }, (_, index) => `<i style="left:${7 + index * 7.7}%"></i>`).join('')}
        </div>
      </div>
    </div>`;
  return root;
}

export default function CheckoutAirModelSync() {
  useEffect(() => {
    const touched = new Map<HTMLImageElement, { opacity: string; ariaHidden: string | null }>();

    const sync = () => {
      document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
        const src = image.currentSrc || image.src || '';
        const capacity = detectCapacity(src);
        if (!capacity) return;

        const host = image.parentElement;
        if (!host) return;

        const current = host.querySelector<HTMLElement>(':scope > .checkout-air-sync-model');
        if (current?.dataset.capacity === String(capacity)) return;
        current?.remove();

        if (!touched.has(image)) {
          touched.set(image, { opacity: image.style.opacity, ariaHidden: image.getAttribute('aria-hidden') });
        }

        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        image.style.opacity = '0';
        image.style.pointerEvents = 'none';
        image.setAttribute('aria-hidden', 'true');
        host.appendChild(createUniversalModel(capacity));
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });

    return () => {
      observer.disconnect();
      document.querySelectorAll('.checkout-air-sync-model').forEach((node) => node.remove());
      touched.forEach((original, image) => {
        image.style.opacity = original.opacity;
        image.style.pointerEvents = '';
        if (original.ariaHidden === null) image.removeAttribute('aria-hidden');
        else image.setAttribute('aria-hidden', original.ariaHidden);
      });
    };
  }, []);

  return (
    <style>{`
      .checkout-air-sync-model{position:absolute;inset:0;z-index:4;display:grid;place-items:center;pointer-events:none;overflow:visible}
      .checkout-air-sync-wrap{position:relative;width:var(--checkout-air-width);max-width:680px;min-width:180px;transition:width .45s cubic-bezier(.2,.8,.2,1)}
      .checkout-air-sync-shadow{position:absolute;left:9%;right:9%;bottom:-16%;height:28%;border-radius:999px;background:rgba(0,0,0,.42);filter:blur(18px)}
      .checkout-air-sync-shell{position:relative;aspect-ratio:3.55/1;overflow:hidden;border:1px solid rgba(255,255,255,.8);border-radius:clamp(18px,2.5vw,36px);background:linear-gradient(180deg,#fff 0%,#fafbfd 18%,#eef1f4 68%,#d9dee4 100%);box-shadow:0 28px 58px rgba(0,0,0,.38),inset 0 2px 5px rgba(255,255,255,.98)}
      .checkout-air-sync-highlight{position:absolute;left:4%;right:4%;top:10%;height:2px;border-radius:999px;background:rgba(255,255,255,.92)}
      .checkout-air-sync-brand{position:absolute;left:7%;top:36%;display:flex;flex-direction:column;line-height:1}
      .checkout-air-sync-brand strong{font-size:clamp(7px,1vw,12px);letter-spacing:.28em;color:#7d858e;font-weight:900}
      .checkout-air-sync-brand span{margin-top:7px;font-size:clamp(5px,.72vw,8px);letter-spacing:.2em;color:#adb2b8;font-weight:700}
      .checkout-air-sync-display{position:absolute;right:8%;top:29%;min-width:66px;padding:8px 12px;border:1px solid rgba(127,223,255,.15);border-radius:12px;background:rgba(7,16,25,.94);text-align:right;box-shadow:0 0 18px rgba(100,218,255,.12)}
      .checkout-air-sync-display strong{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:clamp(15px,2vw,24px);font-weight:900;color:#74dcff;text-shadow:0 0 8px rgba(116,220,255,.47)}
      .checkout-air-sync-display span{display:block;margin-top:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:6px;letter-spacing:.16em;color:rgba(255,255,255,.42)}
      .checkout-air-sync-display b{color:#7de59b}
      .checkout-air-sync-louver{position:absolute;left:3%;right:3%;bottom:6%;height:29%;background:linear-gradient(180deg,#e6eaee,#b8c0c8);clip-path:polygon(0 0,100% 0,98% 100%,2% 100%)}
      .checkout-air-sync-vent{position:absolute;left:8%;right:8%;bottom:7%;height:19%;overflow:hidden;border-radius:10px;background:linear-gradient(180deg,#101419,#262d34);box-shadow:inset 0 6px 12px rgba(0,0,0,.75)}
      .checkout-air-sync-vent:before{content:'';position:absolute;left:3%;right:3%;top:20%;height:3px;border-radius:999px;background:rgba(105,115,126,.7)}
      .checkout-air-sync-vent i{position:absolute;bottom:14%;height:45%;width:4px;border-radius:999px;background:rgba(114,124,135,.7);transform:skewX(-8deg)}
      @media(max-width:640px){.checkout-air-sync-wrap{min-width:150px}.checkout-air-sync-display{min-width:54px;padding:6px 9px}.checkout-air-sync-brand span{margin-top:5px}}
      @media(prefers-reduced-motion:reduce){.checkout-air-sync-wrap{transition:none}}
    `}</style>
  );
}
