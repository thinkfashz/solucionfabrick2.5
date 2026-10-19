'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

export type LabMovement={forward:boolean;back:boolean;left:boolean;right:boolean;turnLeft:boolean;turnRight:boolean};
export default function MetalconWalkRig({active,movement,bounds,spawn,analog}:{active:boolean;movement:LabMovement;bounds:{x:number;z:number};spawn?:{x:number;z:number}|null;analog?:{move:{x:number;y:number};turn:number}|null}){
 const{camera}=useThree(),keys=useRef<Record<string,boolean>>({}),yaw=useRef(0),lastSpawn=useRef<string>(null);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true},up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[]);
 useEffect(()=>{
  if(!active)return;
  camera.position.y=1.62;
  if(spawn){
   const key=`${spawn.x.toFixed(3)}|${spawn.z.toFixed(3)}`;
   if(lastSpawn.current!==key){lastSpawn.current=key;camera.position.x=spawn.x;camera.position.z=spawn.z;yaw.current=0}
   else{yaw.current=camera.rotation.y}
  }
  else{yaw.current=camera.rotation.y}
 },[active,spawn,camera]);
 useFrame((_,delta)=>{if(!active)return;const k=keys.current,kT=(movement.turnLeft||k.q||k.arrowleft?-1:0)+(movement.turnRight||k.e||k.arrowright?1:0),kF=(movement.forward||k.w||k.arrowup?1:0)-(movement.back||k.s||k.arrowdown?1:0),kS=(movement.right||k.d?1:0)-(movement.left||k.a?1:0),amt=analog?analog.move:{x:0,y:0};const f=Math.max(-1,Math.min(1,kF+amt.y)),side=Math.max(-1,Math.min(1,kS+amt.x)),turn=Math.max(-1,Math.min(1,kT+(analog?analog.turn:0)));yaw.current-=turn*delta*1.65;const speed=2.25*delta,dir=new Vector3(Math.sin(yaw.current),0,-Math.cos(yaw.current)),right=new Vector3(Math.cos(yaw.current),0,Math.sin(yaw.current));camera.position.addScaledVector(dir,f*speed).addScaledVector(right,side*speed);camera.position.x=Math.max(-bounds.x,Math.min(bounds.x,camera.position.x));camera.position.z=Math.max(-bounds.z,Math.min(bounds.z,camera.position.z));camera.position.y=1.62;camera.rotation.set(0,yaw.current,0,'YXZ')});
 return null;
}
