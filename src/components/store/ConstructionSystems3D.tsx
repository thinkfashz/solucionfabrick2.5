'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';

export type StructuralSystem = 'metalcon' | 'wood';
export type ConstructionLayer = 'structure' | 'osb' | 'membrane' | 'insulation' | 'interior' | 'cladding' | 'roof';

export type ConstructionVisibility = Record<ConstructionLayer, boolean> & {
  sanitary: boolean;
  fixtures: boolean;
};

const layerColors: Record<ConstructionLayer, string> = {
  structure: '#dce5eb', osb: '#b77a42', membrane: '#37a6d8', insulation: '#f0c94f',
  interior: '#e9e5dd', cladding: '#7d4537', roof: '#30363b',
};

export function ConstructionSystems3D({ preset, system, visibility, exploded = false }: {
  preset: MetalconHousePreset;
  system: StructuralSystem;
  visibility: ConstructionVisibility;
  exploded?: boolean;
}) {
  return <group>
    <RoofAssembly preset={preset} system={system} visible={visibility.roof} exploded={exploded} />
    <EnvelopeLayers preset={preset} visibility={visibility} exploded={exploded} />
    {visibility.sanitary ? <SanitaryNetwork preset={preset} showFixtures={visibility.fixtures} /> : null}
  </group>;
}

function RoofAssembly({ preset, system, visible, exploded }: { preset: MetalconHousePreset; system: StructuralSystem; visible: boolean; exploded: boolean }) {
  const width = preset.widthM;
  const depth = preset.depthM;
  const eave = 0.42;
  const rise = Math.max(1.05, width * 0.24);
  const slope = Math.sqrt((width / 2 + eave) ** 2 + rise ** 2);
  const pitch = Math.atan2(rise, width / 2 + eave);
  const frameColor = system === 'metalcon' ? '#dce5eb' : '#9b673e';
  const roofY = preset.heightM + rise / 2;
  const rafters = useMemo(() => Array.from({ length: Math.floor((depth + eave * 2) / 0.6) + 1 }, (_, i) => -depth / 2 - eave + i * 0.6), [depth]);
  if (!visible) return null;
  return <group>
    <Beam position={[0, preset.heightM + rise, 0]} size={[0.08, 0.1, depth + eave * 2]} color={frameColor} />
    {rafters.map((z) => <group key={z}>
      <Beam position={[-width / 4 - eave / 2, roofY, z]} size={[slope, 0.075, 0.075]} rotation={[0, 0, pitch]} color={frameColor} />
      <Beam position={[width / 4 + eave / 2, roofY, z]} size={[slope, 0.075, 0.075]} rotation={[0, 0, -pitch]} color={frameColor} />
    </group>)}
    {[-0.72, 0, 0.72].map((ratio) => <group key={ratio}>
      <Beam position={[-width / 4 - eave / 2, roofY + ratio * 0.04, ratio * depth / 2]} size={[slope, 0.045, 0.06]} rotation={[0, 0, pitch]} color="#aeb8c1" />
      <Beam position={[width / 4 + eave / 2, roofY + ratio * 0.04, ratio * depth / 2]} size={[slope, 0.045, 0.06]} rotation={[0, 0, -pitch]} color="#aeb8c1" />
    </group>)}
    <RoofPlane side="left" width={slope} depth={depth + eave * 2} y={roofY + (exploded ? .34 : .08)} x={-width / 4 - eave / 2} pitch={pitch} />
    <RoofPlane side="right" width={slope} depth={depth + eave * 2} y={roofY + (exploded ? .34 : .08)} x={width / 4 + eave / 2} pitch={pitch} />
    <Html position={[0, preset.heightM + rise + .28, 0]} center distanceFactor={10}><span className="whitespace-nowrap rounded-full bg-black/75 px-2 py-1 text-[7px] font-black text-white/70">cumbrera · pares/cerchas · costaneras · alero · fascia</span></Html>
  </group>;
}

function RoofPlane({ side, width, depth, y, x, pitch }: { side: 'left'|'right'; width:number; depth:number; y:number; x:number; pitch:number }) {
  return <mesh position={[x,y,0]} rotation={[0,0,side === 'left' ? pitch : -pitch]} castShadow receiveShadow>
    <boxGeometry args={[width,.055,depth]} /><meshStandardMaterial color={layerColors.roof} metalness={.48} roughness={.48} transparent opacity={.88} />
  </mesh>;
}

function EnvelopeLayers({ preset, visibility, exploded }: { preset: MetalconHousePreset; visibility: ConstructionVisibility; exploded:boolean }) {
  const layers = [
    { id:'interior' as const, offset:-.09, thickness:.018 }, { id:'insulation' as const, offset:0, thickness:.055 },
    { id:'osb' as const, offset:.075, thickness:.012 }, { id:'membrane' as const, offset:.095, thickness:.006 },
    { id:'cladding' as const, offset:.125, thickness:.018 },
  ];
  return <group>{preset.walls.filter(w=>w.role==='perimeter').map(w=>{
    const dx=w.end.x-w.start.x,dz=w.end.z-w.start.z,length=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx);
    const mx=(w.start.x+w.end.x)/2-preset.widthM/2,mz=(w.start.z+w.end.z)/2-preset.depthM/2;
    return <group key={w.id} position={[mx,preset.heightM/2,mz]} rotation={[0,yaw,0]}>{layers.map((layer,index)=>visibility[layer.id]?<mesh key={layer.id} position={[0,0,layer.offset+(exploded?(index-2)*.12:0)]}>
      <boxGeometry args={[length,preset.heightM,layer.thickness]} /><meshStandardMaterial color={layerColors[layer.id]} transparent opacity={layer.id==='insulation'?.34:.58} roughness={.72} depthWrite={false}/>
    </mesh>:null)}</group>;
  })}</group>;
}

function SanitaryNetwork({ preset, showFixtures }: { preset: MetalconHousePreset; showFixtures:boolean }) {
  const outletX=preset.widthM/2+1.2,outletZ=preset.depthM/2-.9;
  return <group>
    <Pipe from={[preset.widthM*.18,.16,-preset.depthM*.08]} to={[preset.widthM*.18,.16,outletZ]} color="#ff9f43" radius={.055}/>
    <Pipe from={[-preset.widthM*.2,.16,preset.depthM*.12]} to={[preset.widthM*.18,.16,preset.depthM*.12]} color="#ff9f43" radius={.055}/>
    <Pipe from={[preset.widthM*.18,.16,outletZ]} to={[outletX,.16,outletZ]} color="#ff9f43" radius={.07}/>
    <Pipe from={[-preset.widthM*.32,.22,-preset.depthM*.28]} to={[-preset.widthM*.32,.22,preset.depthM*.2]} color="#36a8ff" radius={.025}/>
    <Pipe from={[-preset.widthM*.32,.22,preset.depthM*.2]} to={[preset.widthM*.12,.22,preset.depthM*.2]} color="#ef5350" radius={.021}/>
    <Chamber position={[outletX,.02,outletZ]} label="Cámara inspección" />
    <Chamber position={[outletX+1.05,.02,outletZ]} label="Desgrasadora" small />
    <SepticTank position={[outletX+2.35,-.25,outletZ]} />
    <Pipe from={[outletX,.12,outletZ]} to={[outletX+1.05,.12,outletZ]} color="#ff9f43" radius={.07}/>
    <Pipe from={[outletX+1.05,.12,outletZ]} to={[outletX+1.75,.12,outletZ]} color="#ff9f43" radius={.07}/>
    <Pipe from={[outletX+2.95,-.18,outletZ]} to={[outletX+4.25,-.18,outletZ]} color="#8bc34a" radius={.06}/>
    {showFixtures?<Fixtures preset={preset}/>:null}
  </group>;
}

function Fixtures({preset}:{preset:MetalconHousePreset}) { return <group>
  <mesh position={[preset.widthM*.18,.22,-preset.depthM*.08]}><boxGeometry args={[.42,.44,.62]}/><meshStandardMaterial color="#f2f6f7"/></mesh>
  <mesh position={[-preset.widthM*.2,.42,preset.depthM*.12]}><boxGeometry args={[.78,.08,.48]}/><meshStandardMaterial color="#d9e2e5"/></mesh>
</group> }

function Chamber({position,label,small=false}:{position:[number,number,number];label:string;small?:boolean}) { return <group position={position}><mesh><boxGeometry args={[small?.55:.72,.45,small?.55:.72]}/><meshStandardMaterial color="#707a80" transparent opacity={.72}/></mesh><Html position={[0,.45,0]} center distanceFactor={10}><span className="whitespace-nowrap rounded bg-black/75 px-1.5 py-1 text-[6px] font-bold text-white/70">{label}</span></Html></group> }
function SepticTank({position}:{position:[number,number,number]}) { return <group position={position} rotation={[0,0,Math.PI/2]}><mesh><cylinderGeometry args={[.55,.55,1.25,24]}/><meshStandardMaterial color="#dde6dc" transparent opacity={.72}/></mesh><Html position={[0,0.85,0]} center distanceFactor={10}><span className="whitespace-nowrap rounded bg-black/75 px-2 py-1 text-[6px] font-bold text-lime-100">Fosa · entrada/salida PVC Ø110 referencial</span></Html></group> }

function Pipe({from,to,color,radius}:{from:[number,number,number];to:[number,number,number];color:string;radius:number}) {
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a),length=dir.length();
  const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
  return <mesh position={mid.toArray()} quaternion={quaternion}><cylinderGeometry args={[radius,radius,length,12]}/><meshStandardMaterial color={color} roughness={.38}/></mesh>;
}

function Beam({position,size,color,rotation=[0,0,0]}:{position:[number,number,number];size:[number,number,number];color:string;rotation?:[number,number,number]}) { return <mesh position={position} rotation={rotation} castShadow><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={color.startsWith('#dc')?.7:.08} roughness={.42}/></mesh> }
