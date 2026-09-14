'use client';
import { Html } from '@react-three/drei';

export type WallAssemblyVariant='metalcon'|'wood';

const layerNames=['Volcanita','Estructura + aislación','OSB','Membrana hidrófuga','Listones verticales','Cámara ventilada','Siding exterior'];

export default function WallAssemblyExploded3D({variant,exploded=true}:{variant:WallAssemblyVariant;exploded?:boolean}){
 const gap=exploded?.34:.055;
 const z=[-3,-2,-.8,.35,1.25,2.05,2.75].map(v=>v*gap);
 return <group rotation={[0,-.18,0]} scale={.92}>
  <Panel width={3.45} height={2.5} depth={.045} z={z[0]} color="#e7e3d8" roughness={.9}/>
  <Frame variant={variant} z={z[1]}/>
  <Panel width={3.45} height={2.5} depth={.055} z={z[2]} color="#b9824c" roughness={.82}/>
  <Panel width={3.5} height={2.54} depth={.018} z={z[3]} color="#263a45" opacity={.72} roughness={.72}/>
  <Battens z={z[4]}/>
  <AirCavity z={z[5]} exploded={exploded}/>
  <Siding z={z[6]}/>
  {exploded?layerNames.map((name,i)=><Html key={name} center distanceFactor={7.5} position={[0,1.55,z[i]]}><span className="whitespace-nowrap rounded-full border border-white/10 bg-black/85 px-2 py-1 text-[7px] font-black uppercase tracking-[.05em] text-white/80">{name}</span></Html>):null}
 </group>
}
function Panel({width,height,depth,z,color,opacity=1,roughness=.75}:{width:number;height:number;depth:number;z:number;color:string;opacity?:number;roughness?:number}){return <mesh position={[0,height/2,z]} castShadow receiveShadow><boxGeometry args={[width,height,depth]}/><meshStandardMaterial color={color} roughness={roughness} transparent={opacity<1} opacity={opacity}/></mesh>}
function Frame({variant,z}:{variant:WallAssemblyVariant;z:number}){const wood=variant==='wood',studColor=wood?'#9d6f42':'#aeb8bf',metalness=wood?0:.78;const xs=Array.from({length:7},(_,i)=>-1.5+i*.5);return <group position={[0,0,z]}><mesh position={[0,.055,0]}><boxGeometry args={[3.45,.11,.105]}/><meshStandardMaterial color={studColor} metalness={metalness} roughness={wood?.72:.32}/></mesh><mesh position={[0,2.445,0]}><boxGeometry args={[3.45,.11,.105]}/><meshStandardMaterial color={studColor} metalness={metalness} roughness={wood?.72:.32}/></mesh>{xs.map(x=><mesh key={x} position={[x,1.25,0]} castShadow><boxGeometry args={[.085,2.3,.105]}/><meshStandardMaterial color={studColor} metalness={metalness} roughness={wood?.72:.32}/></mesh>)}{xs.slice(0,-1).map((x,i)=><mesh key={`ins-${x}`} position={[x+.25,1.25,.005]}><boxGeometry args={[.39,2.12,.075]}/><meshStandardMaterial color={i%2?'#d9bb55':'#e4ca68'} roughness={1}/></mesh>)}<Html center distanceFactor={7.5} position={[0,2.82,0]}><span className="whitespace-nowrap rounded-full border border-[#F6C64A]/25 bg-black/85 px-2 py-1 text-[7px] font-black uppercase tracking-[.06em] text-[#F6C64A]">{wood?'Entramado madera':'Perfilería Metalcon'}</span></Html></group>}
function Battens({z}:{z:number}){return <group position={[0,0,z]}>{Array.from({length:7},(_,i)=>-1.5+i*.5).map(x=><mesh key={x} position={[x,1.25,0]} castShadow><boxGeometry args={[.055,2.5,.075]}/><meshStandardMaterial color="#8b5a35" roughness={.78}/></mesh>)}</group>}
function AirCavity({z,exploded}:{z:number;exploded:boolean}){return <group position={[0,0,z]}><mesh position={[0,1.25,0]}><boxGeometry args={[3.42,2.46,.075]}/><meshStandardMaterial color="#57c7df" transparent opacity={exploded?.12:.035} roughness={.5}/></mesh>{exploded?<Html center distanceFactor={7.5} position={[1.55,.22,0]}><span className="rounded-full border border-cyan-300/20 bg-black/85 px-2 py-1 text-[7px] font-black uppercase text-cyan-100/80">aire</span></Html>:null}</group>}
function Siding({z}:{z:number}){const rows=Array.from({length:12},(_,i)=>.12+i*.205);return <group position={[0,0,z]}>{rows.map((y,i)=><mesh key={i} position={[0,y,(i%2)*.008]} castShadow receiveShadow><boxGeometry args={[3.6,.19,.07]}/><meshStandardMaterial color={i%2?'#59605f':'#686f6e'} roughness={.72}/></mesh>)}<mesh position={[-1.79,1.25,.02]}><boxGeometry args={[.075,2.54,.09]}/><meshStandardMaterial color="#454b4b" roughness={.62}/></mesh><mesh position={[1.79,1.25,.02]}><boxGeometry args={[.075,2.54,.09]}/><meshStandardMaterial color="#454b4b" roughness={.62}/></mesh></group>}
