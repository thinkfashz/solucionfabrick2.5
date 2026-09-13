'use client';
import { Sky, Stars } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { DataTexture, RGBAFormat, RepeatWrapping, SRGBColorSpace, UnsignedByteType } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';
import type { MetalconLightMode } from './metalconLabData';

const pseudo=(i:number,s:number)=>{const v=Math.sin(i*12.9898+s*78.233)*43758.5453;return v-Math.floor(v)};
function grassTexture(){const size=64,data=new Uint8Array(size*size*4);for(let i=0;i<size*size;i++){const n=(pseudo(i,7)-.5)*52,f=pseudo(i+300,2)>.96?28:0;data[i*4]=Math.max(0,72+n*.5);data[i*4+1]=Math.max(0,108+n+f);data[i*4+2]=Math.max(0,58+n*.35);data[i*4+3]=255}const t=new DataTexture(data,size,size,RGBAFormat,UnsignedByteType);t.needsUpdate=true;t.colorSpace=SRGBColorSpace;t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(14,14);return t}

export default function MetalconLabEnvironmentV2({light,vegetation,preset}:{light:MetalconLightMode;vegetation:boolean;preset:MetalconHousePreset}){
 const grass=useMemo(grassTexture,[]);useEffect(()=>()=>grass.dispose(),[grass]);
 const cfg=light==='night'?{bg:'#05070d',sun:[16,30,-18] as [number,number,number],a:.24,d:.8}:light==='sunset'?{bg:'#57343c',sun:[-38,18,24] as [number,number,number],a:.36,d:1.7}:{bg:'#9bc5df',sun:[52,46,30] as [number,number,number],a:.52,d:2.1};
 const extent=Math.max(40,preset.widthM*6,preset.depthM*5);
 return <><color attach="background" args={[cfg.bg]}/>{light==='night'?<Stars radius={85} depth={45} count={1100} factor={2.2} fade/>:<><Sky distance={450000} sunPosition={cfg.sun} turbidity={light==='sunset'?9:4.5} rayleigh={light==='sunset'?4:2}/><CloudBank preset={preset}/></>}<ambientLight intensity={cfg.a}/><hemisphereLight args={[light==='night'?'#5f6d8a':'#dceffc','#3a2d25',.54]}/><directionalLight position={cfg.sun} intensity={cfg.d} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.14,0]} receiveShadow><planeGeometry args={[extent,extent]}/><meshStandardMaterial map={grass} roughness={1}/></mesh>{vegetation?<Vegetation width={preset.widthM} depth={preset.depthM}/>:null}</>
}
function CloudBank({preset}:{preset:MetalconHousePreset}){return <group>{Array.from({length:7},(_,i)=>{const x=(pseudo(i,13)-.5)*28,z=-12-pseudo(i+20,4)*18,y=7+pseudo(i+40,9)*5,s=.8+pseudo(i+90,1)*1.4;return <group key={i} position={[x,y,z]} scale={s}>{[-.8,0,.8].map((dx,j)=><mesh key={j} position={[dx,j===1?.15:0,0]}><sphereGeometry args={[.85,12,8]}/><meshStandardMaterial color="#ffffff" transparent opacity={.62} roughness={1}/></mesh>)}</group>})}</group>}
function Vegetation({width,depth}:{width:number;depth:number}){const a=Array.from({length:38},(_,i)=>{const side=i%4,spread=(pseudo(i,18)-.5)*(side<2?depth+15:width+15),off=2.4+pseudo(i+91,8)*5.4;return{x:side===0?-width/2-off:side===1?width/2+off:spread,z:side===2?-depth/2-off:side===3?depth/2+off:spread,s:.28+pseudo(i+200,3)*.75,t:pseudo(i+500,6)} });return <group>{a.map((q,i)=><group key={i} position={[q.x,0,q.z]} scale={q.s}><mesh position={[0,.25,0]} castShadow><cylinderGeometry args={[.045,.07,.5,8]}/><meshStandardMaterial color="#5e4935"/></mesh><mesh position={[0,.72,0]} castShadow>{q.t>.55?<sphereGeometry args={[.5,10,8]}/>:<coneGeometry args={[.42,1.0,9]}/>}<meshStandardMaterial color={i%3===0?'#466f3d':'#668d55'} roughness={1}/></mesh></group>)}</group>}
