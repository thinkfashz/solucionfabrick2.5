'use client';
import { Html, OrbitControls, Sky, Stars } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { DataTexture, RGBAFormat, RepeatWrapping, SRGBColorSpace, UnsignedByteType, type Texture } from 'three';
import type { RadierShape } from '@/lib/radierCalculator';

export type RadierLabLayer='excavation'|'fill'|'base'|'gravel'|'barrier'|'mesh'|'concrete'|'formwork'|'vegetation';
export type RadierLightMode='day'|'sunset'|'night';
type Piece={x:number;z:number;w:number;d:number;key:string};
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const vis=(t:number,s:number)=>clamp((t-s)/8);
const pseudo=(i:number,s:number)=>{const v=Math.sin(i*12.9898+s*78.233)*43758.5453;return v-Math.floor(v)};

function texture(kind:'grass'|'soil'|'base'|'gravel'|'concrete'){
  const size=64,data=new Uint8Array(size*size*4),colors={grass:[72,112,57],soil:[107,73,45],base:[116,94,69],gravel:[148,143,133],concrete:[185,188,188]} as const;
  const seed=['grass','soil','base','gravel','concrete'].indexOf(kind)+5,rgb=colors[kind];
  for(let i=0;i<size*size;i++){const f=pseudo(i+781,seed)>(kind==='gravel'?.88:.95)?34:0,n=(pseudo(i,seed)-.5)*(kind==='concrete'?25:52)+f;data[i*4]=Math.max(0,Math.min(255,rgb[0]+n));data[i*4+1]=Math.max(0,Math.min(255,rgb[1]+n*.82));data[i*4+2]=Math.max(0,Math.min(255,rgb[2]+n*.62));data[i*4+3]=255}
  const t=new DataTexture(data,size,size,RGBAFormat,UnsignedByteType);t.needsUpdate=true;t.colorSpace=SRGBColorSpace;t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(8,8);return t;
}
function layout(shape:RadierShape,l:number,w:number):Piece[]{
  if(shape==='rectangular')return[{x:0,z:0,w:l,d:w,key:'r'}];
  if(shape==='l')return[{x:-l*.275,z:0,w:l*.45,d:w,key:'la'},{x:l*.225,z:w*.16,w:l*.55,d:w*.68,key:'lb'}];
  if(shape==='u')return[{x:-l*.38,z:0,w:l*.24,d:w,key:'ua'},{x:l*.38,z:0,w:l*.24,d:w,key:'ub'},{x:0,z:w*.27,w:l*.52,d:w*.46,key:'uc'}];
  if(shape==='t')return[{x:0,z:-w*.36,w:l,d:w*.28,key:'ta'},{x:0,z:w*.14,w:l*.5,d:w*.72,key:'tb'}];
  if(shape==='h')return[{x:-l*.39,z:0,w:l*.22,d:w,key:'ha'},{x:l*.39,z:0,w:l*.22,d:w,key:'hb'},{x:0,z:0,w:l*.56,d:w*.43,key:'hc'}];
  return[{x:0,z:-w*.41,w:l,d:w*.18,key:'ia'},{x:0,z:0,w:l*.44,d:w*.64,key:'ib'},{x:0,z:w*.41,w:l,d:w*.18,key:'ic'}];
}

export default function RadierLabSceneV2(p:{length:number;width:number;thickness:number;baseDepth:number;gravelDepth:number;shape:RadierShape;timeline:number;layers:Record<RadierLabLayer,boolean>;exploded:boolean;light:RadierLightMode;autoRotate:boolean}){
  const pieces=useMemo(()=>layout(p.shape,p.length,p.width),[p.shape,p.length,p.width]);
  const tx=useMemo(()=>({grass:texture('grass'),soil:texture('soil'),base:texture('base'),gravel:texture('gravel'),concrete:texture('concrete')}),[]);
  useEffect(()=>()=>Object.values(tx).forEach(t=>t.dispose()),[tx]);
  const max=Math.max(p.length,p.width),top=.30,ch=Math.max(.05,p.thickness/100),mh=.025,bh=.012,gh=Math.max(.03,p.gravelDepth/100),baseh=Math.max(.05,p.baseDepth/100),bottom=top-ch-mh-bh-gh-baseh,exc=-.16,fill=Math.max(.035,bottom-exc),gap=p.exploded?.10:0;
  const y={fill:exc+fill/2,base:bottom+baseh/2+gap,gravel:bottom+baseh+gh/2+gap*2,barrier:bottom+baseh+gh+bh/2+gap*3,mesh:bottom+baseh+gh+bh+mh/2+gap*4,concrete:top-ch/2+gap*5};
  const cfg=p.light==='night'?{bg:'#05070d',sun:[18,30,-22] as [number,number,number],a:.23,d:.85}:p.light==='sunset'?{bg:'#5b3840',sun:[-36,18,22] as [number,number,number],a:.35,d:1.8}:{bg:'#9bc8df',sun:[48,44,32] as [number,number,number],a:.54,d:2.2};
  return <><color attach="background" args={[cfg.bg]}/>{p.light==='night'?<Stars radius={80} depth={45} count={900} factor={2.2} fade/>:<Sky distance={450000} sunPosition={cfg.sun} turbidity={p.light==='sunset'?9:5} rayleigh={p.light==='sunset'?4:2.2}/>}<ambientLight intensity={cfg.a}/><hemisphereLight args={[p.light==='night'?'#60708d':'#dff3ff','#3c2d22',.55]}/><directionalLight position={cfg.sun} intensity={cfg.d} castShadow shadow-mapSize={[2048,2048]}/>
  <Terrain l={p.length} w={p.width} max={max} grass={tx.grass} soil={tx.soil} opacity={p.layers.excavation?vis(p.timeline,10):0}/>{p.layers.vegetation?<Vegetation w={p.length} d={p.width}/>:null}
  {p.layers.fill?<Pieces a={pieces} h={fill} y={y.fill} map={tx.soil} color="#77543a" o={vis(p.timeline,24)}/>:null}{p.layers.base?<Pieces a={pieces} h={baseh} y={y.base} map={tx.base} color="#82664a" o={vis(p.timeline,36)}/>:null}{p.layers.gravel?<Pieces a={pieces} h={gh} y={y.gravel} map={tx.gravel} color="#999186" o={vis(p.timeline,49)}/>:null}{p.layers.barrier?<Pieces a={pieces} h={bh} y={y.barrier} color="#38a9cf" o={vis(p.timeline,60)*.72}/>:null}{p.layers.mesh?<Mesh a={pieces} y={y.mesh} o={vis(p.timeline,70)}/>:null}{p.layers.formwork?<Formwork l={p.length} w={p.width} y={top-ch/2} o={vis(p.timeline,80)}/>:null}{p.layers.concrete?<Pieces a={pieces} h={ch} y={y.concrete} map={tx.concrete} color="#c8cbca" o={vis(p.timeline,89)}/>:null}
  <Html center distanceFactor={9} position={[p.length/2+.55,.34,p.width/2]}><span className="whitespace-nowrap rounded-full border border-[#F6C64A]/35 bg-black/80 px-2 py-1 text-[8px] font-black text-[#F6C64A]">+0,30 m cota superior</span></Html><Html center distanceFactor={9} position={[-p.length/2-.55,-.08,-p.width/2]}><span className="whitespace-nowrap rounded-full border border-cyan-300/25 bg-black/80 px-2 py-1 text-[8px] font-black text-cyan-200">Excavación −0,16 m visual</span></Html><OrbitControls makeDefault target={[0,.1,0]} enableDamping dampingFactor={.075} autoRotate={p.autoRotate} minDistance={Math.max(3,max*.72)} maxDistance={Math.max(14,max*3.2)} maxPolarAngle={Math.PI*.84}/></>;
}
function Terrain({l,w,max,grass,soil,opacity}:{l:number;w:number;max:number;grass:Texture;soil:Texture;opacity:number}){const world=Math.max(28,max*4),hw=l+1.1,hd=w+1.1,sw=(world-hw)/2,sd=(world-hd)/2;return <group><mesh position={[-(hw+sw)/2,-.08,0]} receiveShadow><boxGeometry args={[sw,.18,world]}/><meshStandardMaterial map={grass}/></mesh><mesh position={[(hw+sw)/2,-.08,0]} receiveShadow><boxGeometry args={[sw,.18,world]}/><meshStandardMaterial map={grass}/></mesh><mesh position={[0,-.08,-(hd+sd)/2]} receiveShadow><boxGeometry args={[hw,.18,sd]}/><meshStandardMaterial map={grass}/></mesh><mesh position={[0,-.08,(hd+sd)/2]} receiveShadow><boxGeometry args={[hw,.18,sd]}/><meshStandardMaterial map={grass}/></mesh>{opacity>.01?<mesh position={[0,-.15,0]} receiveShadow><boxGeometry args={[hw,.08,hd]}/><meshStandardMaterial map={soil} transparent opacity={opacity}/></mesh>:null}</group>}
function Pieces({a,h,y,map,color,o}:{a:Piece[];h:number;y:number;map?:Texture;color:string;o:number}){if(o<=.01)return null;return <>{a.map(q=><mesh key={q.key} position={[q.x,y,q.z]} castShadow receiveShadow><boxGeometry args={[q.w,h,q.d]}/><meshStandardMaterial map={map} color={color} roughness={.88} transparent opacity={o}/></mesh>)}</>}
function Mesh({a,y,o}:{a:Piece[];y:number;o:number}){if(o<=.01)return null;return <>{a.map(q=><group key={q.key} position={[q.x,y,q.z]}>{Array.from({length:Math.max(4,Math.ceil(q.w/.45))},(_,i)=>-q.w/2+i*q.w/Math.max(1,Math.ceil(q.w/.45)-1)).map(x=><mesh key={`x${x}`} position={[x,0,0]}><boxGeometry args={[.018,.02,q.d]}/><meshStandardMaterial color="#a6adb2" metalness={.82}/></mesh>)}{Array.from({length:Math.max(4,Math.ceil(q.d/.45))},(_,i)=>-q.d/2+i*q.d/Math.max(1,Math.ceil(q.d/.45)-1)).map(z=><mesh key={`z${z}`} position={[0,.01,z]}><boxGeometry args={[q.w,.02,.018]}/><meshStandardMaterial color="#a6adb2" metalness={.82}/></mesh>)}</group>)}</>}
function Formwork({l,w,y,o}:{l:number;w:number;y:number;o:number}){if(o<=.01)return null;return <group>{[[0,y,-w/2-.07,l+.15,.06],[0,y,w/2+.07,l+.15,.06],[-l/2-.07,y,0,.06,w+.15],[l/2+.07,y,0,.06,w+.15]].map((m,i)=><mesh key={i} position={[m[0],m[1],m[2]]}><boxGeometry args={[m[3],.34,m[4]]}/><meshStandardMaterial color="#c67635" transparent opacity={o}/></mesh>)}</group>}
function Vegetation({w,d}:{w:number;d:number}){const a=Array.from({length:28},(_,i)=>{const s=i%4,sp=(pseudo(i,22)-.5)*(s<2?d+12:w+12),off=2.2+pseudo(i+100,6)*4.2;return{x:s===0?-w/2-off:s===1?w/2+off:sp,z:s===2?-d/2-off:s===3?d/2+off:sp,k:.24+pseudo(i+300,2)*.62}});return <group>{a.map((q,i)=><group key={i} position={[q.x,0,q.z]} scale={q.k}><mesh position={[0,.22,0]}><cylinderGeometry args={[.035,.055,.44,8]}/><meshStandardMaterial color="#5d4934"/></mesh><mesh position={[0,.58,0]}><coneGeometry args={[.36,.82,9]}/><meshStandardMaterial color={i%3===0?'#4b7440':'#6a9157'}/></mesh></group>)}</group>}
