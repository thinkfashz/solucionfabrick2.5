'use client';
import { Html } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';

export default function MetalconSanitaryNetworkV2({preset,visible=true}:{preset:MetalconHousePreset;visible?:boolean}){
 if(!visible)return null;
 const scale=Math.min(1,8.4/Math.max(preset.widthM,preset.depthM+(preset.terraceDepthM??0))),w=preset.widthM,d=preset.depthM,h=preset.heightM;
 const wc:[number,number,number]=[w/2-.8,.22,-d/2+Math.min(1.8,d*.32)],shower:[number,number,number]=[w/2-1.55,.08,-d/2+Math.min(1.8,d*.32)],kitchen:[number,number,number]=[-w/2+Math.min(1.25,w*.28),.48,-d/2+.42];
 const inspection:[number,number,number]=[w/2+.75,-.18,.3],grease:[number,number,number]=[-w/2-.78,-.13,-d/2+.72],tank:[number,number,number]=[w/2+2.35,-.28,d/2-1.05],distribution:[number,number,number]=[tank[0]+1.05,-.28,tank[2]];
 return <group scale={scale}>
  <Pipe from={wc} to={[wc[0],-.18,wc[2]]} color="#dce7eb" r={.055}/><Pipe from={shower} to={[shower[0],-.18,shower[2]]} color="#b9d8e5" r={.038}/><Pipe from={kitchen} to={[kitchen[0],-.16,kitchen[2]]} color="#dce7eb" r={.045}/>
  <Pipe from={[wc[0],-.18,wc[2]]} to={inspection} color="#dce7eb" r={.055}/><Pipe from={[shower[0],-.18,shower[2]]} to={inspection} color="#c5dce5" r={.04}/><Pipe from={[kitchen[0],-.16,kitchen[2]]} to={grease} color="#dce7eb" r={.045}/><Pipe from={grease} to={inspection} color="#dce7eb" r={.05}/><Pipe from={inspection} to={tank} color="#dce7eb" r={.06}/>
  <Chamber position={inspection} color="#707a80" label="Cámara de inspección"/><Chamber position={grease} color="#8b745c" label="Desgrasadora cocina"/>
  <group position={tank}><mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.58,.58,1.45,30]}/><meshStandardMaterial color="#568896" roughness={.58}/></mesh><mesh position={[0,.6,0]}><cylinderGeometry args={[.22,.22,.16,20]}/><meshStandardMaterial color="#405e69" roughness={.5}/></mesh><Html center distanceFactor={10} position={[0,.95,0]}><Tag>Fosa 800 L · representación visual</Tag></Html></group>
  <Pipe from={tank} to={distribution} color="#91c5d4" r={.055}/><Chamber position={distribution} color="#668c79" label="Distribución drenaje"/>{[-.5,0,.5].map((dz,i)=><Pipe key={i} from={[distribution[0],distribution[1],distribution[2]+dz]} to={[distribution[0]+2.4,distribution[1]-.06,distribution[2]+dz]} color="#80ad97" r={.035}/>) }
  <RainDownpipe x={-w/2-.16} z={-d/2-.2} h={h}/><RainDownpipe x={w/2+.16} z={-d/2-.2} h={h}/>
  <Html center distanceFactor={9} position={[0,.34,-d/2+.1]}><Tag>Colector sanitario PVC Ø110 mm · esquema</Tag></Html><Html center distanceFactor={9} position={[wc[0],.75,wc[2]]}><Tag>Bajada WC</Tag></Html><Html center distanceFactor={9} position={[kitchen[0],.95,kitchen[2]]}><Tag>Descarga cocina</Tag></Html>
 </group>
}
function Pipe({from,to,color,r}:{from:[number,number,number];to:[number,number,number];color:string;r:number}){const a=new Vector3(...from),b=new Vector3(...to),dir=b.clone().sub(a),len=dir.length(),mid=a.clone().add(b).multiplyScalar(.5),q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),dir.clone().normalize());return <mesh position={mid} quaternion={q} castShadow><cylinderGeometry args={[r,r,len,12]}/><meshStandardMaterial color={color} roughness={.46} metalness={.04}/></mesh>}
function Chamber({position,color,label}:{position:[number,number,number];color:string;label:string}){return <group position={position}><mesh castShadow><boxGeometry args={[.55,.4,.55]}/><meshStandardMaterial color={color} roughness={.72}/></mesh><mesh position={[0,.225,0]}><boxGeometry args={[.45,.04,.45]}/><meshStandardMaterial color="#30383d" roughness={.55}/></mesh><Html center distanceFactor={9} position={[0,.62,0]}><Tag>{label}</Tag></Html></group>}
function RainDownpipe({x,z,h}:{x:number;z:number;h:number}){return <group><Pipe from={[x,h+.2,z]} to={[x,.08,z]} color="#76a8c2" r={.035}/><Pipe from={[x,.08,z]} to={[x+.58,-.08,z]} color="#76a8c2" r={.035}/><Html center distanceFactor={10} position={[x,h*.55,z]}><Tag>Bajada aguas lluvia</Tag></Html></group>}
function Tag({children}:{children:React.ReactNode}){return <span className="whitespace-nowrap rounded-full border border-white/10 bg-black/82 px-2 py-1 text-[7px] font-black uppercase tracking-[.06em] text-white/78">{children}</span>}
