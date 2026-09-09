'use client';

import { useEffect, useRef, useState } from 'react';
import type { MetalconInput } from '@/lib/metalconCalculator';

type View = 'frame' | 'osb' | 'reinforcement';

export function MetalconCinematicViewer({input}:{input:MetalconInput}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view,setView] = useState<View>('frame');

  useEffect(()=>{
    const node=canvas.current;if(!node)return;const ctx=node.getContext('2d');if(!ctx)return;let frame=0;
    const draw=(time=0)=>{
      const rect=node.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),pw=Math.max(1,Math.round(rect.width*dpr)),ph=Math.max(1,Math.round(rect.height*dpr));
      if(node.width!==pw||node.height!==ph){node.width=pw;node.height=ph;}ctx.setTransform(dpr,0,0,dpr,0,0);const w=pw/dpr,h=ph/dpr;
      const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#142129');bg.addColorStop(1,'#030609');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      const glow=ctx.createRadialGradient(w*.53,h*.42,5,w*.53,h*.42,w*.7);glow.addColorStop(0,'rgba(246,198,74,.18)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
      const left=w*.08,right=w*.92,top=h*.16,bottom=h*.78,panelW=right-left,panelH=bottom-top;
      ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;for(let y=bottom;y<h;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      const metal=ctx.createLinearGradient(left,0,right,0);metal.addColorStop(0,'#89959b');metal.addColorStop(.5,'#e8edef');metal.addColorStop(1,'#758188');
      const bar=(x:number,y:number,bw:number,bh:number,color:string|CanvasGradient=metal)=>{ctx.fillStyle=color;ctx.fillRect(x,y,bw,bh);ctx.strokeStyle='rgba(255,255,255,.32)';ctx.strokeRect(x,y,bw,bh);};
      bar(left,top,panelW,9);bar(left,bottom-9,panelW,9);
      const count=Math.max(3,Math.floor(input.widthM*100/input.spacingCm)+1),step=panelW/(count-1);
      const door={x:left+panelW*.18,w:panelW*.19,top:top+panelH*.27}; const win={x:left+panelW*.60,w:panelW*.22,top:top+panelH*.31,bottom:bottom-panelH*.25};
      for(let i=0;i<count;i++){const x=left+i*step;if((x>door.x-4&&x<door.x+door.w+4)||(x>win.x-4&&x<win.x+win.w+4))continue;bar(x-3,top+9,6,panelH-18);}
      const accent=view==='reinforcement'?'#F6C64A':metal;
      [door.x-7,door.x,door.x+door.w,door.x+door.w+7,win.x-7,win.x,win.x+win.w,win.x+win.w+7].forEach(x=>bar(x,top+9,5,panelH-18,accent));
      bar(door.x,door.top,door.w,7,accent);bar(win.x,win.top,win.w,7,accent);bar(win.x,win.bottom,win.w,7,accent);
      if(view==='osb'){ctx.fillStyle='rgba(215,157,76,.67)';ctx.fillRect(left,top,panelW,panelH);ctx.strokeStyle='#F6C64A';ctx.lineWidth=2;const osbStep=panelW/(input.widthM/(input.osbWidthCm/100));for(let x=left;x<right;x+=osbStep){ctx.strokeRect(x,top,Math.min(osbStep,right-x),panelH);}}
      ctx.fillStyle='#fff';ctx.font='900 10px system-ui';ctx.fillText(`${input.widthM.toFixed(1)} m`,w*.47,bottom+28);ctx.save();ctx.translate(left-25,h*.54);ctx.rotate(-Math.PI/2);ctx.fillText(`${input.heightM.toFixed(1)} m`,0,0);ctx.restore();
      ctx.fillStyle='#F6C64A';ctx.font='800 9px system-ui';ctx.fillText(`MONTANTES @ ${input.spacingCm} CM`,left,top-18);
      ctx.fillStyle='rgba(255,255,255,.78)';ctx.fillText('PUERTA · 2C + 2C',door.x,door.top-9);ctx.fillText('VENTANA · 2C + 2C',win.x,win.top-9);
      const scan=(time*.04)%(panelW+60)-30;ctx.fillStyle='rgba(87,212,255,.1)';ctx.fillRect(left+scan,top,2,panelH);
      frame=requestAnimationFrame(draw);
    };draw();const resize=new ResizeObserver(()=>draw(performance.now()));resize.observe(node);return()=>{cancelAnimationFrame(frame);resize.disconnect();};
  },[input,view]);

  return <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#05090c] shadow-2xl">
    <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 sm:px-5"><div><p className="text-[8px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Vista 01 · panel completo</p><b className="text-xs">Modelo constructivo interactivo</b></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[8px] font-black text-emerald-300">EN VIVO</span></div>
    <canvas ref={canvas} className="h-[330px] w-full sm:h-[470px]" role="img" aria-label="Simulación de panel Metalcon con puerta, ventana, montantes y refuerzos" />
    <div className="grid grid-cols-3 gap-1 border-t border-white/10 p-2">{([['frame','Estructura'],['reinforcement','Refuerzos 2C'],['osb','Plancha OSB']] as const).map(([id,label])=><button key={id} onClick={()=>setView(id)} className={`min-h-11 rounded-xl px-2 text-[9px] font-black ${view===id?'bg-[#F6C64A] text-black':'bg-white/[.04] text-white/55'}`}>{label}</button>)}</div>
  </div>;
}
