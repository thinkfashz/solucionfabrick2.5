import type * as Three from 'three';

type TextureKind='wood'|'plaster'|'tile'|'gravel'|'grass'|'fabric'|'metal';
type RemoteAsset={id:string;diffuse:string;displacement:string;roughness:string};

// Web-sized CC0 sources from Poly Haven, mirrored to the project's Cloudinary CDN.
// The procedural maps remain the immediate fallback, so first paint does not wait for network assets.
// License: https://polyhaven.com/license (CC0).
const POLYHAVEN:Partial<Record<TextureKind,RemoteAsset>>={
 wood:{id:'wooden_planks',diffuse:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745510/fabrick/recorrido-3d/pbr/wood/diff.jpg',displacement:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745516/fabrick/recorrido-3d/pbr/wood/disp.jpg',roughness:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745521/fabrick/recorrido-3d/pbr/wood/rough.jpg'},
 plaster:{id:'white_plaster_02',diffuse:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745526/fabrick/recorrido-3d/pbr/plaster/diff.jpg',displacement:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745532/fabrick/recorrido-3d/pbr/plaster/disp.jpg',roughness:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745536/fabrick/recorrido-3d/pbr/plaster/rough.jpg'},
 tile:{id:'floor_tiles_08',diffuse:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745542/fabrick/recorrido-3d/pbr/tile/diff.jpg',displacement:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745547/fabrick/recorrido-3d/pbr/tile/disp.jpg',roughness:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745553/fabrick/recorrido-3d/pbr/tile/rough.jpg'},
 gravel:{id:'gravel',diffuse:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745557/fabrick/recorrido-3d/pbr/gravel/diff.jpg',displacement:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745562/fabrick/recorrido-3d/pbr/gravel/disp.jpg',roughness:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745567/fabrick/recorrido-3d/pbr/gravel/rough.jpg'},
 grass:{id:'sparse_grass',diffuse:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745572/fabrick/recorrido-3d/pbr/grass/diff.jpg',displacement:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745578/fabrick/recorrido-3d/pbr/grass/disp.jpg',roughness:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745583/fabrick/recorrido-3d/pbr/grass/rough.jpg'},
 metal:{id:'corrugated_iron',diffuse:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745588/fabrick/recorrido-3d/pbr/metal/diff.jpg',displacement:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745592/fabrick/recorrido-3d/pbr/metal/disp.jpg',roughness:'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_768/f_auto,q_auto:eco/v1789745597/fabrick/recorrido-3d/pbr/metal/rough.jpg'},
};

function cover(ctx:CanvasRenderingContext2D,img:HTMLImageElement,size:number){
 const scale=Math.max(size/img.naturalWidth,size/img.naturalHeight);
 const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
 ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
}

function asyncOverlay(canvas:HTMLCanvasElement,url:string,onReady:()=>void,tint?:string){
 const start=()=>{const img=new Image();img.crossOrigin='anonymous';img.decoding='async';img.fetchPriority='low';
  img.onload=()=>{const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);cover(ctx,img,canvas.width);if(tint){ctx.save();ctx.globalAlpha=.06;ctx.globalCompositeOperation='multiply';ctx.fillStyle=tint;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore()}onReady()};
  img.onerror=()=>{};img.src=url;
 };
 const idle=(window as typeof window & {requestIdleCallback?:(cb:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
 if(idle)idle(start,{timeout:1400});else window.setTimeout(start,450);
}

// Deterministic seamless base maps + progressive CC0 photographic overlays.
// This keeps first paint fast while noticeably improving material fidelity when images arrive.
export function materialTexture(T:typeof Three,kind:TextureKind,color:string){
 const lowDetail=window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;const size=lowDetail?384:512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d');
 const bumpCanvas=document.createElement('canvas');bumpCanvas.width=bumpCanvas.height=size;const bc=bumpCanvas.getContext('2d');
 const roughCanvas=document.createElement('canvas');roughCanvas.width=roughCanvas.height=size;const rc=roughCanvas.getContext('2d');
 if(!c||!bc||!rc)return null;c.fillStyle=color;c.fillRect(0,0,size,size);bc.fillStyle='#808080';bc.fillRect(0,0,size,size);
 const roughBase=kind==='metal'?92:kind==='tile'?86:kind==='wood'?112:kind==='fabric'?225:kind==='grass'||kind==='gravel'?238:190;rc.fillStyle=`rgb(${roughBase},${roughBase},${roughBase})`;rc.fillRect(0,0,size,size);
 let seed=731;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<(lowDetail?7500:15000);i++){const x=random()*size,y=random()*size,a=random()>.5?'rgba(255,255,255,.08)':'rgba(0,0,0,.07)';c.fillStyle=a;c.fillRect(x,y,1+random()*3,1+random()*3);bc.fillStyle=random()>.5?'#999':'#666';bc.fillRect(x,y,1+random()*3,1+random()*3);const rv=Math.max(30,Math.min(250,roughBase+(random()-.5)*28));rc.fillStyle=`rgb(${rv},${rv},${rv})`;rc.fillRect(x,y,2+random()*5,2+random()*5)}
 if(kind==='wood')for(let i=0;i<600;i++){const y=random()*size;c.strokeStyle=i%2?'rgba(65,37,17,.14)':'rgba(241,216,163,.22)';c.lineWidth=.4+random()*1.4;c.beginPath();for(let x=0;x<=size;x+=8)c.lineTo(x,y+Math.sin(x/size*Math.PI*2+i)*2);c.stroke()}
 if(kind==='tile'){c.strokeStyle='#a99e8e';c.lineWidth=2;c.strokeRect(0,0,size,size);for(let i=0;i<35;i++){c.strokeStyle='rgba(135,126,110,.07)';c.beginPath();c.moveTo(0,random()*size);c.bezierCurveTo(150,random()*size,300,random()*size,size,random()*size);c.stroke()}}
 if(kind==='gravel')for(let i=0;i<1300;i++){const x=random()*size,y=random()*size,r=2+random()*7;c.fillStyle=['#a6a39a','#cecabd','#8b8c88','#b9b5aa'][i%4];c.beginPath();c.ellipse(x,y,r,r*.65,random()*Math.PI,0,Math.PI*2);c.fill();c.strokeStyle='#62676066';c.lineWidth=.7;c.stroke()}
 if(kind==='grass')for(let i=0;i<(lowDetail?3200:6800);i++){const x=random()*size,y=random()*size;c.strokeStyle=['#6f8056','#8b9c68','#526b48'][i%3];c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*4-2,y-3-random()*6);c.stroke()}
 if(kind==='fabric')for(let i=0;i<size;i+=3){c.strokeStyle='rgba(255,255,255,.12)';c.beginPath();c.moveTo(0,i);c.lineTo(size,i);c.moveTo(i,0);c.lineTo(i,size);c.stroke()}
 if(kind==='metal')for(let x=0;x<size;x+=64){c.fillStyle='#ffffff14';c.fillRect(x,0,3,size);c.fillStyle='#00000033';c.fillRect(x+3,0,2,size)}
 const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const bump=new T.CanvasTexture(bumpCanvas);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.colorSpace=T.NoColorSpace;bump.anisotropy=4;
 const roughness=new T.CanvasTexture(roughCanvas);roughness.wrapS=roughness.wrapT=T.RepeatWrapping;roughness.colorSpace=T.NoColorSpace;roughness.anisotropy=4;
 const remote=POLYHAVEN[kind];if(remote){asyncOverlay(canvas,remote.diffuse,()=>{map.needsUpdate=true},color);if(!lowDetail){asyncOverlay(bumpCanvas,remote.displacement,()=>{bump.needsUpdate=true});asyncOverlay(roughCanvas,remote.roughness,()=>{roughness.needsUpdate=true})}}
 return {map,bump,roughness,source:remote?.id??'procedural'};
}
