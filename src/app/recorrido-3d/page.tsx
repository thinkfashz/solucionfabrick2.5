"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useCallback, useEffect, useRef, useState } from "react";

const panoramas = [
  ["01 · Entrada / Living","https://res.cloudinary.com/disghf6xc/image/upload/v1789388865/soluciones-fabrick/recorrido-interior-360/01-entrada-living.webp"],
  ["02 · Sala principal","https://res.cloudinary.com/disghf6xc/image/upload/v1789388870/soluciones-fabrick/recorrido-interior-360/02-sala-principal.webp"],
  ["03 · Comedor","https://res.cloudinary.com/disghf6xc/image/upload/v1789388874/soluciones-fabrick/recorrido-interior-360/03-comedor.webp"],
  ["04 · Pasillo","https://res.cloudinary.com/disghf6xc/image/upload/v1789388878/soluciones-fabrick/recorrido-interior-360/04-pasillo-habitaciones.webp"],
  ["05 · Dormitorio","https://res.cloudinary.com/disghf6xc/image/upload/v1789388882/soluciones-fabrick/recorrido-interior-360/05-dormitorio-principal.webp"],
  ["06 · Baño","https://res.cloudinary.com/disghf6xc/image/upload/v1789388886/soluciones-fabrick/recorrido-interior-360/06-bano.webp"],
  ["07 · Cocina","https://res.cloudinary.com/disghf6xc/image/upload/v1789388890/soluciones-fabrick/recorrido-interior-360/07-cocina.webp"],
  ["08 · Vista exterior","https://res.cloudinary.com/disghf6xc/image/upload/v1789388894/soluciones-fabrick/recorrido-interior-360/08-vista-exterior.webp"],
] as const;

const wallMat = { color:"#eeeae1", roughness:.78 };
const darkMat = { color:"#242824", roughness:.45, metalness:.15 };

function Box({p,s,c="#eeeae1",name}:{p:[number,number,number],s:[number,number,number],c?:string,name?:string}) {
  return <mesh position={p} castShadow receiveShadow name={name}><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.7}/></mesh>;
}

function Door({p,r=0,label}:{p:[number,number,number],r?:number,label:string}) {
  const group=useRef<THREE.Group>(null); const [open,setOpen]=useState(false);
  useFrame(()=>{if(group.current) group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,r+(open?-Math.PI/2:0),.12)});
  return <group ref={group} position={p} rotation-y={r}>
    <mesh position={[.48,1.05,0]} castShadow onClick={(e)=>{e.stopPropagation();setOpen(v=>!v)}}>
      <boxGeometry args={[.96,2.1,.08]}/><meshStandardMaterial color="#9a6840" roughness={.62}/>
      <mesh position={[.36,0,.085]} name={"Manilla "+label}><sphereGeometry args={[.065,18,12]}/><meshStandardMaterial {...darkMat}/></mesh>
    </mesh>
  </group>;
}

function Lamp({p}:{p:[number,number,number]}) {
 const [on,setOn]=useState(true);
 return <group position={p} onClick={(e)=>{e.stopPropagation();setOn(v=>!v)}}>
   <pointLight intensity={on?6:0} distance={7} color="#ffd78a" castShadow/>
   <mesh><sphereGeometry args={[.12,16,12]}/><meshStandardMaterial color={on?"#ffd36a":"#5b5b55"} emissive={on?"#ffb52c":"#000"} emissiveIntensity={on?2:0}/></mesh>
 </group>;
}

function House() {
 return <group>
  <Box p={[0,-.16,0]} s={[15.6,.3,10.6]} c="#656962"/><Box p={[0,0,0]} s={[15.3,.12,10.3]} c="#d8d0c4"/>
  <Box p={[0,1.4,-5.05]} s={[15.5,2.8,.16]}/><Box p={[0,1.4,5.05]} s={[15.5,2.8,.16]}/>
  <Box p={[-7.65,1.4,0]} s={[.16,2.8,10.25]}/><Box p={[7.65,1.4,0]} s={[.16,2.8,10.25]}/>
  <Box p={[1.1,1.4,1]} s={[.16,2.8,8.05]}/><Box p={[4.25,1.4,-.75]} s={[6.2,2.8,.16]}/><Box p={[4.25,1.4,3.05]} s={[6.2,2.8,.16]}/>
  <Box p={[3,1.4,-3.05]} s={[.16,2.8,3.7]}/><Box p={[5.5,1.4,-3.05]} s={[.16,2.8,3.7]}/>
  <mesh position={[-3.7,1.45,-4.94]}><boxGeometry args={[3.5,1.45,.05]}/><meshPhysicalMaterial color="#a9d8eb" transparent opacity={.34} transmission={.45}/></mesh>
  <mesh position={[-6.95,1.45,4.94]}><boxGeometry args={[1.2,1.4,.05]}/><meshPhysicalMaterial color="#a9d8eb" transparent opacity={.34} transmission={.45}/></mesh>
  <Door p={[1,-.8,-1.7]} r={Math.PI/2} label="dormitorio"/><Door p={[3.05,0,-1]} label="baño"/><Door p={[1,0,3.7]} r={Math.PI/2} label="habitación"/>
  <RoundedBox args={[2.9,.55,1]} radius={.14} position={[-4.7,.38,1.7]} castShadow><meshStandardMaterial color="#5e6562"/></RoundedBox>
  <Box p={[-4.7,.9,2.12]} s={[2.9,.85,.28]} c="#5e6562"/><Box p={[-2,.76,1.2]} s={[1.35,.1,.72]} c="#a47748"/>
  <Box p={[-3.4,.76,-2]} s={[2.35,.1,1.08]} c="#a47748"/>
  <Box p={[-1.15,.48,-4.48]} s={[4.15,.92,.72]} c="#262925"/><Box p={[-1.25,.48,-3]} s={[2.45,.92,.92]} c="#d7d0c5"/>
  <RoundedBox args={[3.2,.5,2.1]} radius={.1} position={[4.25,.3,-1.85]} castShadow><meshStandardMaterial color="#ddd7cd"/></RoundedBox>
  <Box p={[4.25,.7,-2.86]} s={[3.2,1,.14]} c="#a47748"/><Box p={[4.1,.36,-4.08]} s={[.65,.72,.78]} c="#f3f1eb"/>
  <Box p={[6.65,.07,-4.2]} s={[1.25,.1,1.25]} c="#b8c1c3"/>
  {([[-4,2.58,1],[-3,2.58,-3],[3,2.58,1],[4,2.58,-2],[5,2.58,-4],[4,2.58,4]] as [number,number,number][]).map((p,i)=><Lamp p={p} key={i}/>)}
  <mesh position={[0,-.34,0]} receiveShadow><boxGeometry args={[45,.15,45]}/><meshStandardMaterial color="#4a7547"/></mesh>
 </group>;
}

type MoveState={f:number;b:number;l:number;r:number};
function Walker({move}:{move:React.MutableRefObject<MoveState>}) {
 const {camera}=useThree(); const keys=useRef<Record<string,boolean>>({});
 useEffect(()=>{const d=(e:KeyboardEvent)=>keys.current[e.code]=true,u=(e:KeyboardEvent)=>keys.current[e.code]=false;addEventListener("keydown",d);addEventListener("keyup",u);return()=>{removeEventListener("keydown",d);removeEventListener("keyup",u)}},[]);
 useFrame((_,dt)=>{const f=(keys.current.KeyW?1:0)-(keys.current.KeyS?1:0)+move.current.f-move.current.b;const r=(keys.current.KeyD?1:0)-(keys.current.KeyA?1:0)+move.current.r-move.current.l;if(!f&&!r)return;const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.y=0;dir.normalize();const side=new THREE.Vector3(-dir.z,0,dir.x);const next=camera.position.clone().addScaledVector(dir,f*dt*2.8).addScaledVector(side,r*dt*2.8);next.x=THREE.MathUtils.clamp(next.x,-7.15,7.15);next.z=THREE.MathUtils.clamp(next.z,-4.6,4.6);camera.position.copy(next)});
 return null;
}

function Scene({move}:{move:React.MutableRefObject<MoveState>}) {
 return <><color attach="background" args={["#9ca99a"]}/><fog attach="fog" args={["#9ca99a",20,48]}/><ambientLight intensity={1.2}/><directionalLight position={[-6,11,6]} intensity={2.5} castShadow/><House/><Walker move={move}/><OrbitControls target={[-3.8,1.1,0]} enablePan={false} minDistance={.2} maxDistance={9} maxPolarAngle={Math.PI*.64}/></>;
}

export default function Recorrido3DPage(){
 const move=useRef<MoveState>({f:0,b:0,l:0,r:0});const [gallery,setGallery]=useState(false);const [pano,setPano]=useState<string|null>(null);const [ready,setReady]=useState(false);const [error,setError]=useState("");
 const hold=useCallback((k:keyof MoveState,v:number)=>()=>{move.current[k]=v},[]);
 return <main style={{position:"fixed",inset:0,background:"#111",color:"#fff",fontFamily:"system-ui",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0}}><Canvas shadows dpr={[1,1.75]} camera={{position:[-4.8,1.65,2.6],fov:68,near:.05,far:80}} gl={{antialias:true,powerPreference:"high-performance"}} onCreated={()=>setReady(true)} fallback={<div/>}><Scene move={move}/></Canvas></div>
  {!ready&&!error&&<div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",background:"#111"}}><div><b style={{color:"#ffca45"}}>FABRICK HOME</b><p>Cargando recorrido 3D…</p></div></div>}
  {error&&<div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",padding:24}}><div><h2>No se pudo iniciar el visor 3D</h2><p>{error}</p><button onClick={()=>location.reload()}>Reintentar</button></div></div>}
  <header style={{position:"absolute",top:14,left:14,right:14,display:"flex",justifyContent:"space-between",gap:10,pointerEvents:"none"}}>
   <div style={glass}><b style={{color:"#ffca45"}}>FABRICK HOME</b><small style={{display:"block"}}>Recorrido 3D interactivo</small></div>
   <div style={{...glass,pointerEvents:"auto"}}><button style={button} onClick={()=>setGallery(true)}>Vistas 360</button></div>
  </header>
  <div style={{position:"absolute",bottom:22,left:18,display:"grid",gridTemplateColumns:"52px 52px 52px",gap:6,pointerEvents:"auto",touchAction:"none"}}>
   <span/><button style={pad} onPointerDown={hold("f",1)} onPointerUp={hold("f",0)} onPointerLeave={hold("f",0)}>▲</button><span/>
   <button style={pad} onPointerDown={hold("l",1)} onPointerUp={hold("l",0)} onPointerLeave={hold("l",0)}>◀</button>
   <button style={pad} onPointerDown={hold("b",1)} onPointerUp={hold("b",0)} onPointerLeave={hold("b",0)}>▼</button>
   <button style={pad} onPointerDown={hold("r",1)} onPointerUp={hold("r",0)} onPointerLeave={hold("r",0)}>▶</button>
  </div>
  <div style={{...glass,position:"absolute",bottom:25,left:"50%",transform:"translateX(-50%)",fontSize:13,textAlign:"center",maxWidth:"55%",pointerEvents:"none"}}>Arrastra para mirar · usa flechas o WASD · toca puertas y luces</div>
  {gallery&&<section style={{position:"fixed",inset:0,zIndex:20,background:"rgba(5,7,5,.96)",overflow:"auto",padding:18}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2>Recorrido fotográfico 360</h2><button style={button} onClick={()=>setGallery(false)}>Volver al 3D</button></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>{panoramas.map(([name,url])=><button key={url} onClick={()=>setPano(url)} style={{padding:0,border:"1px solid #ffffff30",borderRadius:16,overflow:"hidden",background:"#1b211b",color:"#fff",textAlign:"left"}}><img src={url} alt={name} style={{width:"100%",height:180,objectFit:"cover"}}/><b style={{display:"block",padding:12}}>{name}</b></button>)}</div>
  </section>}
  {pano&&<section style={{position:"fixed",inset:0,zIndex:30,background:"#000"}}><button style={{...button,position:"absolute",zIndex:2,right:16,top:16}} onClick={()=>setPano(null)}>Cerrar 360</button><iframe title="Panorama 360" allowFullScreen src={"https://cdn.pannellum.org/2.5/pannellum.htm#panorama="+encodeURIComponent(pano)+"&autoLoad=true&autoRotate=-2"} style={{width:"100%",height:"100%",border:0}}/></section>}
 </main>;
}
const glass:React.CSSProperties={background:"rgba(11,17,12,.78)",border:"1px solid rgba(255,255,255,.22)",backdropFilter:"blur(14px)",borderRadius:18,padding:"10px 14px",boxShadow:"0 12px 35px #0007"};
const button:React.CSSProperties={border:0,borderRadius:13,padding:"10px 13px",background:"#ffca45",color:"#171912",fontWeight:800,cursor:"pointer"};
const pad:React.CSSProperties={width:52,height:52,border:0,borderRadius:16,background:"rgba(255,202,69,.9)",fontWeight:900,fontSize:20,color:"#171912",touchAction:"none"};
