'use client';
import { Html } from '@react-three/drei';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type Texture } from 'three';
import { useEffect, useMemo, type ReactNode } from 'react';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';
import type { MetalconLabLayer } from './metalconLabData';
import { clipIntervals, perimeterWallOpenings, wallCutSegments, type WallFace, type WallOpeningSlice } from './metalconOpeningGeometry';
import { useTextureMaterial, useViewerTextures, viewerTextureVariant, usePbrMaps } from './monitoring/useViewerTextures';

const visible=(timeline:number,start:number)=>timeline>=100?1:Math.min(1,Math.max(0,(timeline-start)/7));
export default function MetalconLabFinishesV2({preset,timeline,layers,cutaway}:{preset:MetalconHousePreset;timeline:number;layers:Record<MetalconLabLayer,boolean>;cutaway:boolean}){
 const scale=Math.min(1,8.4/Math.max(preset.widthM,preset.depthM+(preset.terraceDepthM??0)));
 const textures=useViewerTextures();
 const floorMap=textures.pisoMadera?viewerTextureVariant('pisoMadera',1,1):null;
 return <group scale={scale}>
<Foundation preset={preset} opacity={visible(timeline,0)}/>
  {layers.osb?<Shell preset={preset} offset={.055} thickness={.028} color="#b9824c" opacity={visible(timeline,40)*.9} cutaway={cutaway}/>:null}
  {layers.membrane?<Shell preset={preset} offset={.078} thickness={.012} color="#243b50" opacity={visible(timeline,49)*.62} cutaway={cutaway}/>:null}
  {layers.battens?<Battens preset={preset} opacity={visible(timeline,56)} cutaway={cutaway}/>:null}
  {layers.insulation?<Shell preset={preset} offset={-.025} thickness={.065} color="#e5c761" opacity={visible(timeline,62)*.52} cutaway={cutaway}/>:null}
  {layers.electrical?<Electrical preset={preset} opacity={visible(timeline,66)}/>:null}
  {layers.gypsum?<Shell preset={preset} offset={-.082} thickness={.016} color="#e7e3d8" opacity={visible(timeline,72)*.92} cutaway={cutaway} map={textures.intDrywall} roughness={.95}/>:null}
  {layers.floor?<Floor preset={preset} opacity={visible(timeline,78)} map={floorMap}/>:null}
  {layers.ceiling?<Ceiling preset={preset} opacity={visible(timeline,83)}/>:null}
   
   {layers.fixtures?<Fixtures preset={preset} opacity={visible(timeline,87)}/>:null}
  {layers.sanitary?<Sanitary preset={preset} opacity={visible(timeline,91)}/>:null}
  {layers.siding?<Siding preset={preset} opacity={visible(timeline,95)} cutaway={cutaway}/>:null}
  {(layers.osb||layers.siding)?<OpeningsFill preset={preset} opacity={visible(timeline,40)} cutaway={cutaway}/>:null}
  {layers.roof?<Roof preset={preset} opacity={visible(timeline,98)} cutaway={cutaway} map={textures.techoCalamina}/>:null}
 </group>
}
function mat(color:string,opacity:number,metalness=0,roughness=.78){return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} transparent={opacity<.99} opacity={opacity}/>}
function Foundation({preset,opacity}:{preset:MetalconHousePreset;opacity:number}){return <group><mesh position={[0,-.17,0]} receiveShadow><boxGeometry args={[preset.widthM+1,.18,preset.depthM+1]}/>{mat('#6c4b34',opacity*.72)}</mesh><mesh position={[0,-.04,0]} receiveShadow><boxGeometry args={[preset.widthM+.28,.22,preset.depthM+.28]}/>{mat('#747a7e',opacity*.7)}</mesh></group>}
type FaceAxis='x'|'z';
const FACE_GEOM:Record<WallFace,{axis:FaceAxis}>={n:{axis:'x'},s:{axis:'x'},e:{axis:'z'},w:{axis:'z'}};
function faceCenter(preset:MetalconHousePreset,face:WallFace,offset:number):[number,number,number]{
 if(face==='n')return [0,0,-preset.depthM/2-offset];
 if(face==='s')return [0,0,preset.depthM/2+offset];
 if(face==='e')return [preset.widthM/2+offset,0,0];
 return [-preset.widthM/2-offset,0,0];
}
function faceLength(preset:MetalconHousePreset,face:WallFace){return face==='n'||face==='s'?preset.widthM:preset.depthM;}
function CutBoxWall({axis,center,length,height,thickness,openings,color,opacity,map,roughness=.7}:{axis:FaceAxis;center:[number,number,number];length:number;height:number;thickness:number;openings:WallOpeningSlice[];color:string;opacity:number;map?:Texture|null;roughness?:number}){
 const segs=wallCutSegments(length,height,openings);
 const material=useTextureMaterial(map??null,{color:map?'#ffffff':color,roughness,metalness:0,envMapIntensity:.6},opacity);
 return <>{segs.map((s,i)=>{
  if(s.w<=.01||s.h<=.01)return null;
  const position:[number,number,number]=axis==='x'?[center[0]+s.cx,s.cy,center[2]]:[center[0],s.cy,center[2]+s.cx];
  const args:[number,number,number]=axis==='x'?[s.w,s.h,thickness]:[thickness,s.h,s.w];
  return <mesh key={i} position={position} castShadow material={material}><boxGeometry args={args}/></mesh>;
 })}</>;
}
function Shell({preset,offset,thickness,color,opacity,cutaway,map,roughness}:{preset:MetalconHousePreset;offset:number;thickness:number;color:string;opacity:number;cutaway:boolean;map?:Texture|null;roughness?:number}){if(opacity<=.01)return null;const h=preset.heightM;const faces:WallFace[]=cutaway?['n','e','w']:['n','s','e','w'];return <group>{faces.map(face=>{const axis=FACE_GEOM[face].axis;return <CutBoxWall key={face} axis={axis} center={faceCenter(preset,face,offset)} length={faceLength(preset,face)} height={h} thickness={thickness} openings={perimeterWallOpenings(preset,face)} color={color} opacity={opacity} map={map} roughness={roughness}/>;})}</group>}
function Battens({preset,opacity,cutaway}:{preset:MetalconHousePreset;opacity:number;cutaway:boolean}){const xs=Array.from({length:Math.ceil(preset.widthM/.6)+1},(_,i)=>-preset.widthM/2+i*preset.widthM/Math.ceil(preset.widthM/.6));const zs=Array.from({length:Math.ceil(preset.depthM/.6)+1},(_,i)=>-preset.depthM/2+i*preset.depthM/Math.ceil(preset.depthM/.6));return <group>{xs.map(x=><mesh key={`n${x}`} position={[x,preset.heightM/2,-preset.depthM/2-.098]}><boxGeometry args={[.04,preset.heightM,.04]}/>{mat('#8b5a35',opacity)}</mesh>)}{!cutaway?xs.map(x=><mesh key={`s${x}`} position={[x,preset.heightM/2,preset.depthM/2+.098]}><boxGeometry args={[.04,preset.heightM,.04]}/>{mat('#8b5a35',opacity)}</mesh>):null}{zs.flatMap(z=>[<mesh key={`w${z}`} position={[-preset.widthM/2-.098,preset.heightM/2,z]}><boxGeometry args={[.04,preset.heightM,.04]}/>{mat('#8b5a35',opacity)}</mesh>,<mesh key={`e${z}`} position={[preset.widthM/2+.098,preset.heightM/2,z]}><boxGeometry args={[.04,preset.heightM,.04]}/>{mat('#8b5a35',opacity)}</mesh>])}</group>}
function Floor({preset,opacity,map}:{preset:MetalconHousePreset;opacity:number;map?:Texture|null}){
  const oakMaps = usePbrMaps('woodOak');
  const sx=Math.max(1,Math.floor(preset.widthM/.6)),sz=Math.max(1,Math.floor(preset.depthM/.6));
  // Dos materiales compartidos por paridad (antes un material por baldosa).
  const oddMat=useTextureMaterial(
    oakMaps.color ?? map ?? null,
    {color:(oakMaps.color ? '#ffffff' : (map ? '#efeae3' : '#d2d4d3')),roughness:.5,metalness:0,envMapIntensity:.65,normalMap:oakMaps.normal,roughnessMap:oakMaps.roughness},
    opacity,
  );
  const evenMat=useTextureMaterial(
    oakMaps.color ?? map ?? null,
    {color:(oakMaps.color ? '#ffffff' : (map ? '#ffffff' : '#c5c8c8')),roughness:.5,metalness:0,envMapIntensity:.65,normalMap:oakMaps.normal,roughnessMap:oakMaps.roughness},
    opacity,
  );
 return <group>{Array.from({length:sx},(_,x)=>Array.from({length:sz},(_,z)=><mesh key={`${x}-${z}`} position={[-preset.widthM/2+.3+x*.6,.045,-preset.depthM/2+.3+z*.6]} receiveShadow material={(x+z)%2?oddMat:evenMat}><boxGeometry args={[.585,.035,.585]}/></mesh>))}</group>;
}
function Ceiling({preset,opacity}:{preset:MetalconHousePreset;opacity:number}){const n=Math.ceil(preset.widthM/.6);return <group>{Array.from({length:n+1},(_,i)=>-preset.widthM/2+i*preset.widthM/n).map(x=><mesh key={x} position={[x,preset.heightM-.12,0]}><boxGeometry args={[.035,.035,preset.depthM]}/>{mat('#bcc4ca',opacity,.7,.3)}</mesh>)}<mesh position={[0,preset.heightM-.17,0]}><boxGeometry args={[preset.widthM-.08,.025,preset.depthM-.08]}/>{mat('#e9e5db',opacity*.9)}</mesh></group>}
function Electrical({preset,opacity}:{preset:MetalconHousePreset;opacity:number}){if(opacity<=.01)return null;const w=preset.widthM,d=preset.depthM,h=preset.heightM,outlets:Array<[number,number,number]>=[[-w*.31,.34,-d/2+.11],[0,.34,-d/2+.11],[w*.31,.34,-d/2+.11],[-w/2+.11,.34,-d*.18],[w/2-.11,.34,d*.14]],switches:Array<[number,number,number]>=[[-w*.34,1.12,-d/2+.11],[w*.34,1.12,-d/2+.11]],lights:Array<[number,number,number]>=[[-w*.22,h-.2,-d*.12],[w*.22,h-.2,d*.12]];return <group>{outlets.map((p,i)=><group key={`o${i}`} position={p}><mesh><boxGeometry args={[.13,.095,.035]}/>{mat('#f4f0df',opacity,0,.45)}</mesh><mesh position={[0,0,.021]}><boxGeometry args={[.055,.025,.008]}/>{mat('#252b2e',opacity)}</mesh><mesh position={[0,(h-p[1])/2-.02,-.02]}><cylinderGeometry args={[.018,.018,h-p[1]-.18,8]}/>{mat('#f6c64a',opacity*.9,.15,.45)}</mesh></group>)}{switches.map((p,i)=><group key={`s${i}`} position={p}><mesh><boxGeometry args={[.11,.16,.035]}/>{mat('#f4f0df',opacity)}</mesh><mesh position={[0,.01,.021]}><boxGeometry args={[.045,.075,.008]}/>{mat('#596168',opacity)}</mesh><mesh position={[0,(h-p[1])/2-.03,-.02]}><cylinderGeometry args={[.016,.016,h-p[1]-.16,8]}/>{mat('#f6c64a',opacity*.85,.15,.45)}</mesh></group>)}{lights.map((p,i)=><group key={`l${i}`} position={p}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.07,.07,.025,16]}/>{mat('#f6c64a',opacity,.15,.35)}</mesh><mesh position={[0,.03,0]}><sphereGeometry args={[.035,12,8]}/>{mat('#fff3b0',opacity)}</mesh></group>)}<mesh position={[0,h-.28,-d/2+.12]}><boxGeometry args={[w*.78,.025,.025]}/>{mat('#f6c64a',opacity*.72,.1,.5)}</mesh><Html center distanceFactor={9} position={[0,h-.54,-d/2+.06]}><Tag>Puntos eléctricos · referencia visual SEC</Tag></Html></group>}
function Siding({preset,opacity,cutaway}:{preset:MetalconHousePreset;opacity:number;cutaway:boolean}){
 if(opacity<=.01)return null;
 const h=.19,rows=Math.ceil(preset.heightM/h),off=.135,rowYs=Array.from({length:rows},(_,i)=>Math.min(preset.heightM-.095,.095+i*h));
 const faces:WallFace[]=cutaway?['n','e','w']:['n','s','e','w'];
 return <group>{faces.map(face=>{
  const openings=perimeterWallOpenings(preset,face);
  const center=faceCenter(preset,face,off);
  const rot=FACE_GEOM[face].axis==='z'?Math.PI/2:0;
  const length=faceLength(preset,face);
  return <group key={face}>{rowYs.map((y,i)=>{const lift=(i%2)*.004;const zLift=face==='n'?-lift:face==='s'?lift:face==='e'?lift:-lift;return <StripWall key={i} length={length} pos={[center[0],y,center[2]+(face==='n'||face==='s'?zLift:0)]} xLift={face==='e'?lift:face==='w'?-lift:0} rot={rot} opacity={opacity} openings={openings}/>})}</group>;
 })}<CornerTrim preset={preset} opacity={opacity}/><Html center distanceFactor={10} position={[0,preset.heightM+.22,-preset.depthM/2-.2]}><Tag>Siding ref. 6×190×3.660 mm · traslape visual</Tag></Html></group>
}
function StripWall({length,pos,rot,opacity,openings,xLift=0}:{length:number;pos:[number,number,number];rot:number;opacity:number;openings:WallOpeningSlice[];xLift?:number}){
 const max=3.66,count=Math.ceil(length/max),segment=length/count,y0=pos[1]-.088,y1=pos[1]+.088;
 return <group>{Array.from({length:count},(_,i)=>{
  const a=-length/2+i*segment,b=a+segment;
  const intervals=clipIntervals(a,b,openings,y0,y1);
  return intervals.map(([ia,ib],j)=>{
   const w=Math.max(.02,ib-ia-.012);
   const u=(ia+ib)/2;
   const position: [number,number,number] = rot ? [pos[0]+xLift, pos[1], u] : [u, pos[1], pos[2]];
   return <mesh key={`${i}-${j}`} position={position} rotation={[0,rot,0]} castShadow receiveShadow><boxGeometry args={[w,.176,.032]}/>{mat(i%2?'#aeb6b3':'#c3c9c6',opacity,0,.68)}</mesh>;
  });
 })}</group>
}
function CornerTrim({preset,opacity}:{preset:MetalconHousePreset;opacity:number}){const x=preset.widthM/2+.155,z=preset.depthM/2+.155,y=preset.heightM/2;return <group>{[[-x,-z],[-x,z],[x,-z],[x,z]].map(([px,pz],i)=><mesh key={i} position={[px,y,pz]} castShadow><boxGeometry args={[.065,preset.heightM+.04,.065]}/>{mat('#767f80',opacity,.1,.55)}</mesh>)}</group>}
function OpeningFillAt({axis,center,opening,opacity}:{axis:FaceAxis;center:[number,number,number];opening:WallOpeningSlice;opacity:number}){
 const w=opening.u1-opening.u0,h=opening.y1-opening.y0;
 if(w<=.05||h<=.05)return null;
 const u=(opening.u0+opening.u1)/2,cy=(opening.y0+opening.y1)/2;
 const position: [number,number,number] = axis==='x'?[center[0]+u,cy,center[2]]:[center[0],cy,center[2]+u];
 const doorArgs: [number,number,number] = axis==='x'?[w-.05,Math.max(.05,h-.04),.032]:[.032,Math.max(.05,h-.04),w-.05];
 const knobPos: [number,number,number] = axis==='x'?[w/2-.14,0,.026]:[.026,0,w/2-.14];
 const glassArgs: [number,number,number] = axis==='x'?[Math.max(.04,w-.12),Math.max(.04,h-.12),.01]:[.01,Math.max(.04,h-.12),Math.max(.04,w-.12)];
 const frameH: [number,number,number] = axis==='x'?[w,.045,.036]:[.036,.045,w];
 const frameV: [number,number,number] = axis==='x'?[.045,h,.036]:[.036,h,.045];
 const halfW=w/2,halfH=h/2;
 const offTop: [number,number,number] = axis==='x'?[0,halfH-.022,0]:[0,halfH-.022,0];
 const offBot: [number,number,number] = axis==='x'?[0,-halfH+.022,0]:[0,-halfH+.022,0];
 const offL: [number,number,number] = axis==='x'?[-halfW+.022,0,0]:[0,0,-halfW+.022];
 const offR: [number,number,number] = axis==='x'?[halfW-.022,0,0]:[0,0,halfW-.022];
 return <group position={position}>
  {opening.kind==='door'?<>
   <mesh castShadow><boxGeometry args={doorArgs}/>{mat('#8a6a48',opacity,0,.55)}</mesh>
   <mesh position={knobPos}><sphereGeometry args={[.022,10,8]}/>{mat('#c9ccd0',opacity,.65,.28)}</mesh>
  </>:<>
   <mesh position={offTop}><boxGeometry args={frameH}/>{mat('#e8ecef',opacity,.15,.4)}</mesh>
   <mesh position={offBot}><boxGeometry args={frameH}/>{mat('#e8ecef',opacity,.15,.4)}</mesh>
   <mesh position={offL}><boxGeometry args={frameV}/>{mat('#e8ecef',opacity,.15,.4)}</mesh>
   <mesh position={offR}><boxGeometry args={frameV}/>{mat('#e8ecef',opacity,.15,.4)}</mesh>
   <mesh><boxGeometry args={glassArgs}/><meshPhysicalMaterial color="#d7ecf7" roughness={.08} metalness={0} transparent opacity={.35} depthWrite={false} side={DoubleSide}/></mesh>
  </>}
 </group>
}
function OpeningsFill({preset,opacity,cutaway}:{preset:MetalconHousePreset;opacity:number;cutaway:boolean}){
 if(opacity<=.01)return null;
 const off=.095;
 const faces:WallFace[]=cutaway?['n','e','w']:['n','s','e','w'];
 return <group>{faces.map(face=>{const center=faceCenter(preset,face,off);const openings=perimeterWallOpenings(preset,face);return <group key={face}>{openings.map((opening,index)=><OpeningFillAt key={`${face}-${index}`} axis={FACE_GEOM[face].axis} center={center} opening={opening} opacity={opacity}/>)}</group>;})}</group>
}
function Roof({preset,opacity,cutaway,map}:{preset:MetalconHousePreset;opacity:number;cutaway:boolean;map?:Texture|null}){
  if(opacity<=.01)return null;
  const run=(preset.depthM+.7)/2,rise=Math.max(.65,preset.depthM*.18),eaveY=preset.heightM+.02,ridgeY=eaveY+rise,panelWidth=preset.widthM+.7;
  const slope=Math.sqrt(run*run+rise*rise),angle=Math.atan2(rise,run),midY=eaveY+rise/2;
  const ribSteps=Math.max(5,Math.ceil(panelWidth/.52)),ribXs=Array.from({length:ribSteps+1},(_,i)=>-panelWidth/2+i*panelWidth/ribSteps);
  const halfW=panelWidth/2;
  return <group>
   {/* Capas apiladas por encima del deck estructural (SteelRoofPanel en midY+0.04): tablero → membrana → cubierta. */}
   <RoofPlane side="far-board" width={panelWidth} slope={slope} angle={-angle} y={midY+.068} z={-run/2} opacity={opacity} color="#a66f3d" thickness={.026}/>
   {!cutaway?<RoofPlane side="near-board" width={panelWidth} slope={slope} angle={angle} y={midY+.068} z={run/2} opacity={opacity} color="#a66f3d" thickness={.026}/>:null}
   <RoofPlane side="far-membrane" width={panelWidth} slope={slope} angle={-angle} y={midY+.087} z={-run/2} opacity={opacity} color="#263a45" thickness={.012}/>
   {!cutaway?<RoofPlane side="near-membrane" width={panelWidth} slope={slope} angle={angle} y={midY+.087} z={run/2} opacity={opacity} color="#263a45" thickness={.012}/>:null}
   <RoofPlane side="far-cover" width={panelWidth} slope={slope} angle={-angle} y={midY+.111} z={-run/2} opacity={opacity} color="#59666b" thickness={.035} metalness={.5} map={map}/>
   <RoofPlane side="near-cover" width={panelWidth} slope={slope} angle={angle} y={midY+.111} z={run/2} opacity={opacity} color="#59666b" thickness={.035} metalness={.5} map={map}/>
   {/* Frontones forrados en el borde de la cubierta (X = ±halfW): prisma triangular
 opaco que cierra exactamente el triángulo cumbrera–alero, con el texturado del muro. */}
   <RoofGable x={-halfW} run={run} eaveY={eaveY} ridgeY={ridgeY} opacity={opacity}/>
   <RoofGable x={halfW} run={run} eaveY={eaveY} ridgeY={ridgeY} opacity={opacity}/>
   {ribXs.map(x=><mesh key={`rf${x}`} position={[x,midY+.141,-run/2]} rotation={[-angle,0,0]}><boxGeometry args={[.018,.026,slope]}/>{mat('#849197',opacity,.65,.28)}</mesh>)}
   {!cutaway?ribXs.map(x=><mesh key={`rn${x}`} position={[x,midY+.141,run/2]} rotation={[angle,0,0]}><boxGeometry args={[.018,.026,slope]}/>{mat('#849197',opacity,.65,.28)}</mesh>):null}
   <mesh position={[0,ridgeY+.155,0]} castShadow><boxGeometry args={[panelWidth+.08,.095,.2]}/>{mat('#737f84',opacity,.65,.28)}</mesh>
   <mesh position={[0,eaveY-.02,-run]}><boxGeometry args={[panelWidth,.2,.065]}/>{mat('#657176',opacity,.62,.38)}</mesh>
   {!cutaway?<mesh position={[0,eaveY-.02,run]}><boxGeometry args={[panelWidth,.2,.065]}/>{mat('#657176',opacity,.62,.38)}</mesh>:null}
   <mesh position={[0,eaveY-.15,-run-.1]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.055,.055,panelWidth,12]}/>{mat('#606c71',opacity,.7,.3)}</mesh>
   {!cutaway?<mesh position={[0,eaveY-.15,run+.1]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.055,.055,panelWidth,12]}/>{mat('#606c71',opacity,.7,.3)}</mesh>:null}
   <mesh position={[panelWidth/2-.08,preset.heightM/2,-run-.1]}><cylinderGeometry args={[.038,.038,preset.heightM,10]}/>{mat('#606c71',opacity,.7,.3)}</mesh>
   <Html center distanceFactor={10} position={[0,ridgeY+.5,0]}><Tag>Cumbrera · cerchas/cabios ~0,60 m</Tag></Html>
   <Html center distanceFactor={10} position={[0,eaveY+rise*.5+.42,-run*.5]}><Tag>Correas + tablero + membrana + cubierta</Tag></Html>
   <Html center distanceFactor={10} position={[0,eaveY-.42,-run-.1]}><Tag>Alero · tapacán · canaleta</Tag></Html>
  </group>
}
/**
 * Frontón cerrado (forrado): prisma triangular de ~4,5 cm de espesor que tapa
 * por completo el hueco entre cumbrera y alero en el borde de la cubierta.
 * - Base exacta en la línea de alero (z = ±run, antes solo llegaba a ±run/2 y
 *   dejaba las cuñas laterales abiertas, dejando ver cerchas y correas).
 * - Ápice 8 cm sobre la cumbrera: la punta queda oculta bajo el tapa-cumbrera
 *   y el borde superior se enrasa contra la cara inferior de la cubierta
 *   (sin huecos ni z-fighting con el canto de las planchas).
 * - Acabado con la textura de siding de la casa, opaco (solo se vuelve
 *   transparente mientras corre la animación de la línea de tiempo).
 */
function RoofGable({x,run,eaveY,ridgeY,opacity}:{x:number;run:number;eaveY:number;ridgeY:number;opacity:number}){
  const sign=x<0?-1:1;
  const halfThick=.045;
  // Cara exterior 2,5 cm por dentro del borde (halfW) para no coplanear con el
  // canto de las planchas de cubierta (evita parpadeo/z-fighting).
  const xOuter=sign*(Math.abs(x)-.025);
  const xInner=xOuter-sign*halfThick;
  const yBase=eaveY;
  const yApex=ridgeY+.08;
  const textures=useViewerTextures();
  const material=useTextureMaterial(
    textures.extMetalcon??null,
    {color:textures.extMetalcon?'#ffffff':'#b9c1be',roughness:.82,metalness:.06,envMapIntensity:.7,side:DoubleSide},
    opacity,
  );
  const geometry=useMemo(()=>{
    const g=new BufferGeometry();
    const outerA:[number,number,number]=[xOuter,yBase,-run];
    const outerB:[number,number,number]=[xOuter,yBase,run];
    const outerC:[number,number,number]=[xOuter,yApex,0];
    const innerA:[number,number,number]=[xInner,yBase,-run];
    const innerB:[number,number,number]=[xInner,yBase,run];
    const innerC:[number,number,number]=[xInner,yApex,0];
    const positions:number[]=[];
    const tri=(a:[number,number,number],b:[number,number,number],c:[number,number,number])=>{positions.push(...a,...b,...c);};
    // Caras grandes del prisma (DoubleSide cubre ambos sentidos de normal).
    tri(outerA,outerB,outerC);
    tri(innerB,innerA,innerC);
    // Canto perimetral: base del alero y los dos cantos de faldón.
    tri(innerA,outerB,innerB); tri(outerB,outerA,innerA);
    tri(innerA,innerC,outerA); tri(innerC,outerC,outerA);
    tri(innerB,outerC,innerC); tri(outerB,innerB,outerC);
    g.setAttribute('position',new Float32BufferAttribute(positions,3));
    // UV planos: u a lo largo del alero, v desde alero hasta cumbrera.
    const uvs:number[]=[];
    for(let i=0;i<positions.length;i+=3){
      uvs.push((positions[i+2]+run)/(2*run),(positions[i+1]-yBase)/(yApex-yBase));
    }
    g.setAttribute('uv',new Float32BufferAttribute(uvs,2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  },[run,xOuter,xInner,yBase,yApex]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh name={`gable-${sign<0?'west':'east'}`} geometry={geometry} material={material} castShadow receiveShadow/>;
}
function RoofPlane({side,width,slope,angle,y,z,opacity,color,thickness,metalness=0,map}:{side:string;width:number;slope:number;angle:number;y:number;z:number;opacity:number;color:string;thickness:number;metalness?:number;map?:Texture|null}){
 const material=useTextureMaterial(map??null,{color:map?'#ffffff':color,roughness:metalness>.2?.42:.7,metalness,envMapIntensity:.75},opacity);
 return <mesh name={side} position={[0,y,z]} rotation={[angle,0,0]} castShadow receiveShadow material={material}><boxGeometry args={[width,thickness,slope]}/></mesh>;
}
function Fixtures({preset,opacity}:{preset:MetalconHousePreset;opacity:number}){const bx=preset.widthM/2-.85,bz=-preset.depthM/2+Math.min(2.05,preset.depthM*.34),kx=-preset.widthM/2+Math.min(1.25,preset.widthM*.28),kz=-preset.depthM/2+.42;return <group><mesh position={[bx,.28,bz]}><cylinderGeometry args={[.22,.28,.34,20]}/>{mat('#f2f3ef',opacity)}</mesh><mesh position={[bx-.95,.06,bz+.2]}><boxGeometry args={[.88,.1,.88]}/>{mat('#d6d8d7',opacity)}</mesh><mesh position={[kx,.46,kz]}><boxGeometry args={[2.1,.9,.62]}/>{mat('#8c755f',opacity)}</mesh><mesh position={[kx+.35,.94,kz]}><boxGeometry args={[.7,.07,.42]}/>{mat('#a7b0b5',opacity,.5,.3)}</mesh><Html center distanceFactor={9} position={[bx,1,bz]}><Tag>Baño</Tag></Html><Html center distanceFactor={9} position={[kx,1.25,kz]}><Tag>Mesón + grifería</Tag></Html></group>}
function Sanitary({preset,opacity}:{preset:MetalconHousePreset;opacity:number}){const tx=preset.widthM/2+2.3,tz=preset.depthM/2-1.15;return <group><mesh position={[0,-.16,.45]}><boxGeometry args={[preset.widthM+1.8,.08,.12]}/>{mat('#d9e3e8',opacity)}</mesh><mesh position={[preset.widthM/2+.72,-.08,.45]}><boxGeometry args={[.55,.38,.55]}/>{mat('#737c80',opacity)}</mesh><mesh position={[-preset.widthM/2-.8,-.1,-preset.depthM/2+.8]}><boxGeometry args={[.58,.42,.58]}/>{mat('#8a7a61',opacity)}</mesh><group position={[tx,-.18,tz]}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.58,.58,1.35,28]}/>{mat('#568896',opacity)}</mesh><Html center distanceFactor={10} position={[0,.9,0]}><Tag>Fosa 800 L · visual</Tag></Html></group></group>}
function Tag({children}:{children:ReactNode}){return <span className="w-max whitespace-nowrap rounded-full border border-white/10 bg-black/82 px-2 py-1 text-[7px] font-black uppercase tracking-[.07em] text-white/78">{children}</span>}
