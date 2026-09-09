'use client';

import { useEffect, useRef } from 'react';

type ToolKind = 'air' | 'radier';

function polygon(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, fill: string, stroke?: string) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function roundedRect(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, radius:number) {
  ctx.beginPath(); ctx.roundRect(x,y,w,h,radius);
}

function drawAir(ctx:CanvasRenderingContext2D,w:number,h:number,t:number) {
  const glow=ctx.createRadialGradient(w*.62,h*.38,8,w*.62,h*.38,w*.58); glow.addColorStop(0,'rgba(68,210,255,.22)'); glow.addColorStop(1,'rgba(4,10,14,0)'); ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;
  for(let x=0;x<w;x+=34){ctx.beginPath();ctx.moveTo(x,h*.62);ctx.lineTo(w*.5+(x-w*.5)*1.55,h);ctx.stroke();}
  for(let y=h*.62;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  const unitW=Math.min(w*.68,340),unitH=unitW*.24,x=(w-unitW)/2,y=h*.20;
  ctx.shadowColor='rgba(65,211,255,.28)';ctx.shadowBlur=28;roundedRect(ctx,x,y,unitW,unitH,14);const body=ctx.createLinearGradient(x,y,x,y+unitH);body.addColorStop(0,'#fcfdfe');body.addColorStop(.72,'#cad3d8');body.addColorStop(1,'#7e8b92');ctx.fillStyle=body;ctx.fill();ctx.shadowBlur=0;
  roundedRect(ctx,x+12,y+10,unitW-24,unitH*.48,9);ctx.fillStyle='rgba(255,255,255,.72)';ctx.fill();
  ctx.fillStyle='#18252c';ctx.fillRect(x+15,y+unitH*.73,unitW-30,4);ctx.fillStyle='#56dcff';ctx.beginPath();ctx.arc(x+unitW-25,y+20,3,0,Math.PI*2);ctx.fill();
  ctx.font='800 10px system-ui';ctx.fillStyle='#18323d';ctx.fillText('FABRICK CLIMA',x+20,y+27);
  for(let i=0;i<9;i++){const p=(t*.00016+i/9)%1;const sx=x+unitW*(.18+i*.08);const sy=y+unitH*.82;ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+Math.sin(t*.001+i)*18,sy+45,sx-32,sy+80,sx+Math.sin(p*6.28)*44,sy+125);ctx.strokeStyle=`rgba(78,213,255,${.42*(1-p)+.08})`;ctx.lineWidth=2.3;ctx.stroke();}
  ctx.font='900 11px system-ui';ctx.fillStyle='rgba(255,255,255,.82)';ctx.fillText('FLUJO 3D · INVERTER',18,h-32);ctx.font='700 9px system-ui';ctx.fillStyle='rgba(87,212,255,.72)';ctx.fillText('BTU  ·  CONSUMO  ·  CONFORT',18,h-17);
}

function drawRadier(ctx:CanvasRenderingContext2D,w:number,h:number,t:number) {
  const pulse=(Math.sin(t*.0017)+1)/2;const glow=ctx.createRadialGradient(w*.5,h*.45,10,w*.5,h*.45,w*.6);glow.addColorStop(0,`rgba(246,198,74,${.17+pulse*.05})`);glow.addColorStop(1,'rgba(5,9,12,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  const cx=w*.5,top=h*.20,ww=Math.min(w*.66,320),depth=ww*.34,lift=10+pulse*3;
  const layers=[
    {name:'HORMIGÓN',color:'#d9dde0',edge:'#8d969c'},
    {name:'MALLA ACMA',color:'#6c7478',edge:'#333a3e'},
    {name:'BARRERA',color:'#e9bc36',edge:'#9b7212'},
    {name:'GRAVILLA',color:'#8a735b',edge:'#514234'},
    {name:'BASE',color:'#6f5945',edge:'#3c3026'},
  ];
  layers.slice().reverse().forEach((layer,reverseIndex)=>{const index=layers.length-1-reverseIndex;const y=top+index*(22+lift);const a:[number,number]=[cx,y],b:[number,number]=[cx+ww/2,y+depth/2],c:[number,number]=[cx,y+depth],d:[number,number]=[cx-ww/2,y+depth/2];polygon(ctx,[a,b,c,d],layer.color,'rgba(255,255,255,.16)');polygon(ctx,[d,c,[c[0],c[1]+12],[d[0],d[1]+12]],layer.edge);polygon(ctx,[b,c,[c[0],c[1]+12],[b[0],b[1]+12]],layer.edge);ctx.font='800 8px system-ui';ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillText(layer.name,cx+ww*.35,y+depth*.42);});
  const y=top+(22+lift);ctx.strokeStyle='rgba(246,198,74,.72)';ctx.lineWidth=1;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx-ww*.32+i*12,y+depth*.25);ctx.lineTo(cx+ww*.20+i*12,y+depth*.78);ctx.stroke();}
  ctx.font='900 11px system-ui';ctx.fillStyle='rgba(255,255,255,.84)';ctx.fillText('SISTEMA CONSTRUCTIVO 4D',18,h-32);ctx.font='700 9px system-ui';ctx.fillStyle='rgba(246,198,74,.76)';ctx.fillText('CAPAS  ·  VOLUMEN  ·  MATERIALES',18,h-17);
}

export function StoreToolCanvas({kind,className=''}:{kind:ToolKind;className?:string}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const render=(time=0)=>{const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.5);const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}ctx.setTransform(dpr,0,0,dpr,0,0);const w=width/dpr,h=height/dpr;ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#10191e');bg.addColorStop(1,'#030608');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);kind==='air'?drawAir(ctx,w,h,time):drawRadier(ctx,w,h,time);if(!reduced)raf=requestAnimationFrame(render);};render();const resize=new ResizeObserver(()=>render(performance.now()));resize.observe(canvas);return()=>{cancelAnimationFrame(raf);resize.disconnect();};},[kind]);
  return <canvas ref={ref} role="img" aria-label={kind==='air'?'Simulación animada del flujo de aire acondicionado':'Visualización animada de las capas de un radier'} className={`h-full w-full ${className}`} />;
}
