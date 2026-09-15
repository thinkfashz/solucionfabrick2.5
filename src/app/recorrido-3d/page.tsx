"use client";
import {useState} from 'react';
import dynamic from 'next/dynamic';
import ReferenceHouse from './ReferenceHouse';
const PreviousWalkthrough=dynamic(()=>import('./PreviousWalkthrough'),{ssr:false});
export default function Walkthrough(){
 const [previous,setPrevious]=useState(false);
 return previous?<><PreviousWalkthrough/><button onClick={()=>setPrevious(false)} style={{position:'fixed',zIndex:10002,top:65,right:16,background:'#14252e',color:'white',border:'1px solid #b7dce6',borderRadius:12,padding:12}}>Volver a casa de referencia</button></>:<ReferenceHouse previous={()=>setPrevious(true)}/>;
}
