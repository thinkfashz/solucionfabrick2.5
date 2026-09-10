'use client';

import { useEffect, useRef } from 'react';

type ToolKind = 'air' | 'radier' | 'metalcon' | 'inspiration';

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

function drawMetalcon(ctx:CanvasRenderingContext2D,w:number,h:number,t:number) {
  const left=w*.10,right=w*.90,top=h*.16,bottom=h*.79,pw=right-left,ph=bottom-top;
  const glow=ctx.createRadialGradient(w*.55,h*.4,4,w*.55,h*.4,w*.65);glow.addColorStop(0,'rgba(246,198,74,.2)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  const metal=ctx.createLinearGradient(left,0,right,0);metal.addColorStop(0,'#738087');metal.addColorStop(.5,'#eef2f3');metal.addColorStop(1,'#6d797f');
  const bar=(x:number,y:number,bw:number,bh:number,color:string|CanvasGradient=metal)=>{ctx.fillStyle=color;ctx.fillRect(x,y,bw,bh);};bar(left,top,pw,7);bar(left,bottom-7,pw,7);
  for(let i=0;i<13;i++){const x=left+i*pw/12;if((x>left+pw*.2&&x<left+pw*.4)||(x>left+pw*.62&&x<left+pw*.82))continue;bar(x-2,top+7,4,ph-14);}
  const openings=[[left+pw*.2,pw*.2,top+ph*.28],[left+pw*.62,pw*.2,top+ph*.33]];
  openings.forEach(([x,ow,ot],index)=>{[x-5,x,x+ow,x+ow+5].forEach(px=>bar(px,top+7,4,ph-14,index===0?'#F6C64A':'#57D4FF'));bar(x,ot,ow,6,index===0?'#F6C64A':'#57D4FF');if(index)bar(x,bottom-ph*.24,ow,6,'#57D4FF');});
  const scan=(t*.035)%(pw+50)-25;ctx.fillStyle='rgba(87,212,255,.14)';ctx.fillRect(left+scan,top,2,ph);
  ctx.font='900 10px system-ui';ctx.fillStyle='rgba(255,255,255,.84)';ctx.fillText('METALCON · PANEL 01',18,h-30);ctx.font='700 8px system-ui';ctx.fillStyle='rgba(246,198,74,.76)';ctx.fillText('40 CM  ·  OSB 122  ·  REFUERZOS 2C',18,h-16);
}

function drawInspiration(ctx:CanvasRenderingContext2D,w:number,h:number,t:number) {
  const images=[['#9a765a','#25333a'],['#d7b788','#405c54'],['#79665d','#d7d2c8']];
  images.forEach(([a,b],i)=>{const x=w*(.08+i*.285),y=h*(.14+(i%2)*.07),cw=w*.27,ch=h*.62;ctx.save();ctx.translate(x+cw/2,y+ch/2);ctx.rotate((i-1)*.035+Math.sin(t*.0005+i)*.008);const g=ctx.createLinearGradient(-cw/2,-ch/2,cw/2,ch/2);g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(-cw/2,-ch/2,cw,ch);ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(-cw*.35,-ch*.32,cw*.7,ch*.28);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-cw*.35,ch*.08,cw*.7,ch*.27);ctx.strokeStyle='rgba(255,255,255,.2)';ctx.strokeRect(-cw/2,-ch/2,cw,ch);ctx.restore();});
  ctx.font='900 10px system-ui';ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillText('ESPACIOS QUE INSPIRAN',18,h-30);ctx.font='700 8px system-ui';ctx.fillStyle='rgba(187,154,255,.85)';ctx.fillText('IDEAS  ·  TERMINACIONES  ·  PROYECTOS',18,h-16);
}

export function StoreToolCanvas({kind,className=''}:{kind:ToolKind;className?:string}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const render=(time=0)=>{const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.5);const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}ctx.setTransform(dpr,0,0,dpr,0,0);const w=width/dpr,h=height/dpr;ctx.clearRect(0,0,w,h);const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#10191e');bg.addColorStop(1,'#030608');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);if(kind==='air')drawAir(ctx,w,h,time);else if(kind==='radier')drawRadier(ctx,w,h,time);else if(kind==='metalcon')drawMetalcon(ctx,w,h,time);else drawInspiration(ctx,w,h,time);if(!reduced)raf=requestAnimationFrame(render);};render();const resize=new ResizeObserver(()=>render(performance.now()));resize.observe(canvas);return()=>{cancelAnimationFrame(raf);resize.disconnect();};},[kind]);
  const labels:Record<ToolKind,string>={air:'Simulación animada del flujo de aire acondicionado',radier:'Visualización animada de las capas de un radier',metalcon:'Simulación de un panel Metalcon con aberturas reforzadas',inspiration:'Composición animada de ideas de arquitectura e interiores'};
  return <canvas ref={ref} role="img" aria-label={labels[kind]} className={`h-full w-full ${className}`} />;
}
