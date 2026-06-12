'use client';

import { useEffect } from 'react';
import { Eye, PanelLeft, Save, Share2, Sparkles } from 'lucide-react';

export default function PageEngineShopifyChrome() {
  useEffect(() => {
    document.documentElement.classList.add('sf-page-engine-shopify');
    return () => document.documentElement.classList.remove('sf-page-engine-shopify');
  }, []);

  return <>
    <div className="sf-shopify-topbar">
      <div className="sf-shopify-brand"><Sparkles className="h-4 w-4" /> Fabrick HTML Studio</div>
      <div className="sf-shopify-tools">
        <button data-page-engine-menu=""><PanelLeft className="h-4 w-4" /> Herramientas</button>
        <button><Eye className="h-4 w-4" /> Preview</button>
        <button><Save className="h-4 w-4" /> Guardar</button>
        <button><Share2 className="h-4 w-4" /> Compartir</button>
      </div>
    </div>
    <style jsx global>{`
      html.sf-page-engine-shopify body { background:#050403; }
      .sf-shopify-topbar{position:sticky;top:0;z-index:58;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(245,158,11,.16);background:rgba(7,6,4,.88);color:#fff7e8;backdrop-filter:blur(20px);box-shadow:0 16px 50px rgba(0,0,0,.38)}
      .sf-shopify-brand{display:flex;align-items:center;gap:10px;font-weight:1000;letter-spacing:-.03em}.sf-shopify-brand svg{color:#facc15;filter:drop-shadow(0 0 12px rgba(250,204,21,.5))}.sf-shopify-tools{display:flex;gap:8px;align-items:center}.sf-shopify-tools button{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(245,158,11,.22);background:rgba(245,158,11,.08);color:#fde68a;border-radius:16px;padding:10px 12px;font-size:12px;font-weight:900}.sf-shopify-tools button:last-child{background:linear-gradient(135deg,#facc15,#f97316);color:#140900;border-color:transparent}
      html.sf-page-engine-shopify main.min-h-screen>div.mx-auto{max-width:none!important;width:100%!important;padding:12px!important;gap:12px!important;grid-template-columns:300px minmax(0,1fr)340px!important;align-items:start!important}
      html.sf-page-engine-shopify main.min-h-screen>div.mx-auto>aside:first-child{display:block!important;position:sticky!important;top:84px!important;max-height:calc(100dvh - 96px)!important;overflow:auto!important;border-radius:26px!important;background:linear-gradient(180deg,rgba(12,9,5,.9),rgba(2,2,2,.96))!important;box-shadow:0 26px 80px rgba(0,0,0,.45)}
      html.sf-page-engine-shopify main.min-h-screen>div.mx-auto>aside:last-child{position:sticky!important;top:84px!important;max-height:calc(100dvh - 96px)!important;overflow:auto!important;border-radius:26px!important;background:linear-gradient(180deg,rgba(12,9,5,.9),rgba(2,2,2,.96))!important;box-shadow:0 26px 80px rgba(0,0,0,.45)}
      html.sf-page-engine-shopify main.min-h-screen>div.mx-auto>section{border-radius:28px!important;background:linear-gradient(180deg,rgba(12,10,7,.86),rgba(5,4,3,.97))!important;box-shadow:0 30px 110px rgba(0,0,0,.48)}
      html.sf-page-engine-shopify textarea{background:#090806!important;border-color:rgba(245,158,11,.18)!important}html.sf-page-engine-shopify iframe{background:white!important}
      @media(max-width:1279px){.sf-shopify-tools button:not(:first-child){display:none}html.sf-page-engine-shopify main.min-h-screen>div.mx-auto{grid-template-columns:1fr!important;padding:10px!important}html.sf-page-engine-shopify main.min-h-screen>div.mx-auto>aside:first-child{display:none!important}html.sf-page-engine-shopify main.min-h-screen>div.mx-auto>aside:last-child{position:static!important;max-height:none!important}.sf-shopify-topbar{padding:9px 10px}html.sf-page-engine-drawer-open.sf-page-engine-shopify main.min-h-screen>div.mx-auto>aside:first-child{display:block!important;position:fixed!important;z-index:90!important;top:72px!important;bottom:12px!important;left:12px!important;width:min(88vw,330px)!important;max-height:calc(100dvh - 84px)!important;overflow:auto!important}}
      @media(max-width:760px){.sf-shopify-brand{font-size:13px}.sf-shopify-tools button{padding:9px 10px}html.sf-page-engine-shopify footer.sticky{position:static!important;grid-template-columns:1fr!important}}
    `}</style>
  </>;
}
