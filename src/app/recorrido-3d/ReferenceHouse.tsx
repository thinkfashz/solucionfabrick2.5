"use client";
import {useEffect,useRef,useState} from 'react';
import type * as T from 'three';
import {layers,rooms,walls,width,depth} from './reference-house';
import './reference-house.css';
type V=[number,number,number];
type Controls={view:(v:string)=>void;zoom:(d:number)=>void};

function Plan({dimensions}:{dimensions:boolean}){
  return <svg viewBox="-9 -8.5 18 17" role="img" aria-label="Planta interpretada de la referencia, 14,51 por 13,41 metros">
    <rect x="-7.255" y="-6.705" width={width} height={depth} fill="#b49871" rx=".08"/>
    <rect x="-7.255" y="-4" width={width} height="9.7" fill="#e1d9c8"/>
    <rect x="-2.85" y="-5.7" width="6.355" height="1.7" fill="#e1d9c8"/>
    {rooms.map(r=><g key={r.name}><rect x={r.x} y={r.z} width={r.w} height={r.d} fill={r.name.includes('Baño')?'#c0d8d8':'#f1eadc'} stroke="#b7ae9d" strokeWidth=".025"/><text x={r.x+r.w/2} y={r.z+r.d/2} textAnchor="middle" fill="#22323b" fontSize=".26">{r.name}<tspan x={r.x+r.w/2} dy=".4">{r.area} m² ref.</tspan></text></g>)}
    {walls.map((w,i)=><line key={i} x1={w.x-(w.axis==='x'?w.length/2:0)} y1={w.z-(w.axis==='z'?w.length/2:0)} x2={w.x+(w.axis==='x'?w.length/2:0)} y2={w.z+(w.axis==='z'?w.length/2:0)} stroke="#36444b" strokeWidth={w.outside?.15:.09}/>)}
    {walls.flatMap((w,i)=>(w.open||[]).filter(o=>o[2]===0).map((o,j)=><line key={`${i}-${j}`} x1={w.axis==='x'?o[0]-o[1]/2:w.x} x2={w.axis==='x'?o[0]+o[1]/2:w.x} y1={w.axis==='z'?o[0]-o[1]/2:w.z} y2={w.axis==='z'?o[0]+o[1]/2:w.z} stroke="#e1d9c8" strokeWidth=".19"/>))}
    <text x="0" y="-6.2" textAnchor="middle" fontSize=".3" fill="#26373a">TERRAZA · 30,71 m² ref.</text>
    {dimensions&&<g stroke="#91dded" fill="#dbf7ff" strokeWidth=".035"><path d="M-7.255 7V7.6M7.255 7V7.6M-7.255 7.3H7.255M-8 -6.705H-7.6M-8 6.705H-7.6M-7.8 -6.705V6.705"/><text stroke="none" x="0" y="7.9" textAnchor="middle" fontSize=".4">14,51 m</text><text stroke="none" x="-8.1" y="0" textAnchor="middle" fontSize=".4" transform="rotate(-90 -8.1 0)">13,41 m</text></g>}
  </svg>;
}
export default function ReferenceHouse({previous}:{previous:()=>void}){
 const host=useRef<HTMLDivElement>(null),api=useRef<Controls|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [menu,setMenu]=useState(false),[explosion,setExplosion]=useState(0),[visible,setVisible]=useState(layers.map(()=>true));
 const [selected,setSelected]=useState<number|null>(null),[hover,setHover]=useState<number|null>(null),[dimensions,setDimensions]=useState(true),[plan,setPlan]=useState(false),[view,setView]=useState('exterior');
 const settings=useRef({explosion,visible,selected,dimensions});settings.current={explosion,visible,selected,dimensions};
 useEffect(()=>{
  let disposed=false,cleanup=()=>{};setReady(false);setError('');
  Promise.all([import('three'),import('three/examples/jsm/controls/OrbitControls.js'),import('three/examples/jsm/utils/BufferGeometryUtils.js')]).then(([THREE,{OrbitControls},{mergeGeometries}])=>{
   if(disposed||!host.current)return;const root=host.current;
   const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'default'});
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.setClearColor('#b9c9ce');root.appendChild(renderer.domElement);
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(46,1,.1,180);
   scene.add(new THREE.HemisphereLight('#fff6e6','#637163',2.8));
   const sun=new THREE.DirectionalLight('#fff2db',3);sun.position.set(-10,20,-12);scene.add(sun);
   const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=2;orbit.maxDistance=65;orbit.maxPolarAngle=Math.PI*.49;
   const groups=layers.map((_,i)=>{const g=new THREE.Group();g.userData.layer=i;scene.add(g);return g});
   const geometry:T.BufferGeometry[]=[],materials:T.Material[]=[],textures:T.Texture[]=[];
   const mat=(color:string,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.4:.85,side:THREE.DoubleSide});materials.push(m);return m};
   const steel=mat('#b8c5cf',.8),concrete=mat('#a8aaa3'),wood=mat('#b58c5e'),white=mat('#e7e3d9'),roof=mat('#38434b',.5),osb=mat('#c49b60'),wool=mat('#d8c695'),membrane=mat('#859f9c'),black=mat('#29373f',.4),glass=mat('#91acb3',.15);
   glass.transparent=true;glass.opacity=.3;glass.depthWrite=false;
   const cv=document.createElement('canvas');cv.width=cv.height=256;const cx=cv.getContext('2d');
   if(cx){cx.fillStyle='#c3a071';cx.fillRect(0,0,256,256);let seed=12;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let i=0;i<1600;i++){cx.save();cx.translate(random()*256,random()*256);cx.rotate(random()*Math.PI);cx.fillStyle=['#8d6f47','#d9bb8b','#b18b54'][i%3];cx.fillRect(0,0,3+random()*18,1+random()*3);cx.restore()}const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);textures.push(tex);osb.map=tex;}
   function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D){geometry.push(g);const a=new THREE.Mesh(g,m);parent.add(a);return a}
   function box(p:V,size:V,m:T.Material,parent:T.Object3D){const b=mesh(new THREE.BoxGeometry(...size),m,parent);b.position.set(...p);return b}
   function beam(a:V,b:V,r:number,m:T.Material,parent:T.Object3D){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const o=box([0,0,0],[r,av.distanceTo(bv),r],m,parent);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return o}
   function surface(points:V[],m:T.Material,parent:T.Object3D){const a:number[]=[];for(let i=1;i<points.length-1;i++)a.push(...points[0],...points[i],...points[i+1]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.computeVertexNormals();return mesh(g,m,parent)}
   box([0,-.32,0],[48,.3,48],mat('#81917a'),scene);
   box([0,-.06,.85],[width,.24,9.7],concrete,groups[0]);box([.3275,-.06,-4.85],[6.355,.24,1.7],concrete,groups[0]);
   box([0,-.08,-5.35],[width,.18,2.7],wood,groups[0]);box([1.3,-.05,6.15],[3.6,.18,1.11],concrete,groups[0]);
   for(let z=-6.6;z<-4;z+=.16)box([0,.017,z],[width,.015,.012],black,groups[0]);
   for(let i=0;i<5;i++)box([0,-.13,-8-i*1.1],[2.3,.09,.65],concrete,scene);
   // Layers share openings; only pieces outside each opening are constructed.
   for(const w of walls){
    const origin=w.axis==='x'?w.x:w.z,start=origin-w.length/2,end=origin+w.length/2;
    const cuts=[start,end,...(w.open||[]).flatMap(o=>[o[0]-o[1]/2,o[0]+o[1]/2])].filter(x=>x>=start&&x<=end).sort((a,b)=>a-b);
    const outward=w.axis==='x'?(w.z<0?-1:1):(w.x<0?-1:1);
    function panel(a:number,b:number,lo:number,hi:number,layer:number,offset:number,thickness:number,m:T.Material){
     if(b-a<.005||hi-lo<.005)return;
     const sub=new THREE.Group();sub.userData.offset=new THREE.Vector3(w.axis==='z'?outward:0,0,w.axis==='x'?outward:0).multiplyScalar(offset===0?0:Math.sign(offset)*(layer+1)*.32);groups[layer].add(sub);
     box(w.axis==='x'?[(a+b)/2,(hi+lo)/2,w.z+offset*outward]:[w.x+offset*outward,(hi+lo)/2,(a+b)/2],w.axis==='x'?[b-a,hi-lo,thickness]:[thickness,hi-lo,b-a],m,sub);
    }
    for(let c=0;c<cuts.length-1;c++){
     const a=cuts[c],b=cuts[c+1],mid=(a+b)/2,o=(w.open||[]).find(o=>Math.abs(mid-o[0])<o[1]/2);
     const segments=o?[[.12,o[2]],[o[3],2.85]]:[[.12,2.85]];
     for(const [lo,hi]of segments){
      if(w.outside){panel(a,b,lo,hi,3,.07,.018,osb);panel(a,b,lo,hi,5,.1,.009,membrane);panel(a,b,lo,hi,7,.17,.03,white)}
      panel(a,b,lo,hi,4,0,.08,wool);panel(a,b,lo,hi,6,-.075,.015,white);
     }
    }
    for(let t=start;t<=end+.001;t+=.4){const o=(w.open||[]).find(o=>Math.abs(t-o[0])<o[1]/2);for(const [lo,hi] of o?[[.12,o[2]],[o[3],2.85]]:[[.12,2.85]])panel(t-.02,t+.02,lo,hi,2,0,.09,steel)}
    panel(start,end,.1,.15,2,0,.1,steel);panel(start,end,2.8,2.85,2,0,.1,steel);
    for(const o of w.open||[]){
     for(const t of [o[0]-o[1]/2,o[0]+o[1]/2])panel(t-.025,t+.025,.12,2.85,2,0,.1,steel);
     panel(o[0]-o[1]/2,o[0]+o[1]/2,o[3],o[3]+.1,2,0,.1,steel);
     if(w.outside){panel(o[0]-o[1]/2,o[0]+o[1]/2,Math.max(.12,o[2]),o[3],7,.14,.018,glass);for(const t of [o[0]-o[1]/2,o[0],o[0]+o[1]/2])panel(t-.03,t+.03,Math.max(.12,o[2]),o[3],7,.14,.065,black);for(const y of [Math.max(.12,o[2]),o[3]])panel(o[0]-o[1]/2,o[0]+o[1]/2,y,y+.045,7,.14,.065,black)}
    }
    if(w.outside)for(let t=start;t<end;t+=.6){if(!(w.open||[]).some(o=>Math.abs(t-o[0])<o[1]/2))panel(t-.025,t+.025,.15,2.8,5,.135,.035,wood)}
   }
   // Front-facing glazed gable and wood-edged porch matching supplied silhouette.
   surface([[-2.85,2.85,-5.72],[3.505,2.85,-5.72],[.3275,4.95,-5.72]],glass,groups[7]);
   beam([.3275,2.85,-5.75],[.3275,4.95,-5.75],.09,black,groups[7]);
   for(const x of [-7,-2.85,3.5,7])beam([x,0,-6.15],[x,2.85,-6.15],.16,wood,groups[7]);
   box([-5.03,2.77,.85],[4.1,.08,9.7],white,groups[6]);box([5.42,2.77,.85],[3.35,.08,9.7],white,groups[6]);
   // Three roof volumes: two lateral wings and central projecting gable.
   const roofFaces:V[][]=[
    [[-7.7,2.95,-4.5],[-3,4.9,.8],[-3,4.9,1.4],[-7.7,2.95,6.15]],
    [[7.7,2.95,-4.5],[7.7,2.95,6.15],[3.65,4.9,1.4],[3.65,4.9,.8]],
    [[-7.7,2.95,6.15],[-3,4.9,1.4],[3.65,4.9,1.4],[7.7,2.95,6.15]],
    [[-7.7,2.95,-4.5],[-3,4.9,.8],[-3,2.95,-4.5]],
    [[3.65,2.95,-4.5],[3.65,4.9,.8],[7.7,2.95,-4.5]],
    [[-3,2.95,-6.2],[.3275,5.1,-6.2],[.3275,5.1,1.4],[-3,4.9,1.4],[-3,2.95,.8]],
    [[.3275,5.1,-6.2],[3.65,2.95,-6.2],[3.65,2.95,.8],[3.65,4.9,1.4],[.3275,5.1,1.4]],
   ];
   for(const pts of roofFaces){surface(pts.map(p=>[p[0],p[1]-.08,p[2]] as V),osb,groups[9]);surface(pts,roof,groups[9]);for(let i=0;i<pts.length;i++)beam(pts[i],pts[(i+1)%pts.length],.09,steel,groups[8]);}
   for(let z=-6;z<1.5;z+=.65){const a:V=[-3,2.91,z],b:V=[.3275,5.03,z],c:V=[3.65,2.91,z];beam(a,b,.08,steel,groups[8]);beam(b,c,.08,steel,groups[8]);beam(a,c,.08,steel,groups[8]);beam([.3275,2.91,z],b,.07,steel,groups[8]);beam(a,[.3275,4,z],.06,steel,groups[8]);beam(c,[.3275,4,z],.06,steel,groups[8]);}
   for(const side of [-1,1])for(let z=-4.2;z<6;z+=.65){const edge=side<0?-7.6:7.6,inner=side<0?-3:3.65;const apex=4.85-Math.max(0,z-1.4)*.4;beam([edge,2.9,z],[inner,apex,z],.09,steel,groups[8]);beam([edge,2.9,z],[inner,2.9,z],.08,steel,groups[8]);beam([inner,2.9,z],[inner,apex,z],.07,steel,groups[8]);}
   beam([-3,3,-6.2],[.3275,5.15,-6.2],.18,wood,groups[9]);beam([.3275,5.15,-6.2],[3.65,3,-6.2],.18,wood,groups[9]);
   for(const x of [-7.7,7.7]){beam([x,2.91,-4.5],[x,2.91,6.15],.13,roof,groups[9]);beam([x,2.91,6],[x,.1,6],.1,roof,groups[9]);}
   beam([-7.7,2.91,6.15],[7.7,2.91,6.15],.13,roof,groups[9]);
   // Schematic pipes are below the slab, lowered separately in exploded mode.
   const blue=mat('#249fcd'),red=mat('#e16950'),drain=mat('#9aafb9');
   for(const [x,z]of [[-5.7,1.8],[3.4,2.4],[6.3,-.7],[-.6,4.5]]){beam([x,.7,z],[x,-.45,z],.085,blue,groups[1]);beam([x+.15,.7,z],[x+.15,-.36,z],.06,red,groups[1]);beam([x,-.5,z],[8.6,-.5,z],.12,drain,groups[1]);}
   beam([8.6,-.5,-.7],[8.6,-.6,5],.14,drain,groups[1]);box([8.6,-.38,5],[.8,.65,.8],concrete,groups[1]);beam([8.6,-.6,5],[10.4,-.6,5],.14,drain,groups[1]);
   const tank=mesh(new THREE.CylinderGeometry(.65,.65,2.3,16),mat('#4c646d'),groups[1]);tank.rotation.x=Math.PI/2;tank.position.set(10.4,-.5,5.8);box([10.4,.16,5.2],[.45,.12,.45],black,groups[1]);
   // Simple furniture for legible scale, attached to the finished layer.
   box([.6,.45,-1.2],[2.5,.7,.95],mat('#9ca99c'),groups[7]);box([.6,.9,-.8],[2.5,.8,.16],mat('#9ca99c'),groups[7]);box([.3,.42,-2.5],[1.2,.12,.65],wood,groups[7]);box([.1,.8,-4.4],[2.1,.12,1],wood,groups[7]);
   for(const [x,z]of [[-5,-1.9],[-4.8,4.15]]){box([x,.32,z],[1.8,.6,2],wood,groups[7]);box([x,.67,z],[1.8,.15,2],white,groups[7]);}
   box([6.65,.5,-.3],[.65,1,2.5],white,groups[7]);box([6.65,1.03,-.3],[.7,.08,2.6],black,groups[7]);
   const dims=new THREE.Group();scene.add(dims);
   function label(text:string,p:V){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');if(!ctx)return;ctx.fillStyle='#172c36';ctx.fillRect(0,0,512,96);ctx.fillStyle='#d3f7ff';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,64);const t=new THREE.CanvasTexture(c);textures.push(t);const m=new THREE.SpriteMaterial({map:t,depthTest:false});materials.push(m);const s=new THREE.Sprite(m);s.position.set(...p);s.scale.set(3.2,.6,1);dims.add(s)}
   const dimMat=mat('#b2ecf5');beam([-7.255,.1,8],[7.255,.1,8],.025,dimMat,dims);beam([-8.6,.1,-6.705],[-8.6,.1,6.705],.025,dimMat,dims);label('14,51 m',[0,.35,8.1]);label('13,41 m',[-8.6,.4,0]);
   for(const x of [-7.255,7.255])beam([x,.1,7.7],[x,.1,8.3],.025,dimMat,dims);for(const z of [-6.705,6.705])beam([-8.9,.1,z],[-8.3,.1,z],.025,dimMat,dims);
   // Merge static pieces by material and explosion direction to limit draw calls.
   const layerMaterials:T.MeshStandardMaterial[][]=[];
   scene.updateMatrixWorld(true);
   for(const group of groups){
    const batches=new Map<string,{parts:T.BufferGeometry[];material:T.MeshStandardMaterial;offset:T.Vector3}>();
    group.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const m=o.material as T.MeshStandardMaterial;const offset=(o.parent?.userData.offset as T.Vector3|undefined)||new THREE.Vector3();const key=m.uuid+offset.toArray().join(',');if(!batches.has(key))batches.set(key,{parts:[],material:m,offset});const copy=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();batches.get(key)!.parts.push(copy.applyMatrix4(o.matrixWorld))});
    group.clear();const clones=new Map<string,T.MeshStandardMaterial>();
    for(const {parts,material,offset}of batches.values()){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(!g)continue;if(!clones.has(material.uuid)){const clone=material.clone();materials.push(clone);clones.set(material.uuid,clone)}const sub=new THREE.Group();sub.userData.offset=offset;group.add(sub);mesh(g,clones.get(material.uuid)!,sub)}
    layerMaterials.push([...clones.values()]);
   }
   const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let hoverLayer:number|null=null,downX=0,downY=0,frame=0;
   const pick=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(groups.filter(g=>g.visible),true)[0];let o:T.Object3D|undefined=hit?.object;while(o&&o.userData.layer===undefined)o=o.parent||undefined;return o?.userData.layer??null};
   const move=(e:PointerEvent)=>{hoverLayer=pick(e);setHover(hoverLayer);renderer.domElement.style.cursor=hoverLayer===null?'grab':'pointer'};
   const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY};const up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)<5){const layer=pick(e);setSelected(layer);if(layer!==null)setMenu(true)}};
   const leave=()=>{hoverLayer=null;setHover(null)};
   renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointerleave',leave);
   const lost=(e:Event)=>{e.preventDefault();setError('El navegador perdió el contexto 3D. Puedes seguir viendo la planta o reiniciar.');setPlan(true);cancelAnimationFrame(frame)};renderer.domElement.addEventListener('webglcontextlost',lost);
   const size=()=>{const w=root.clientWidth,h=root.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix()};const observer=new ResizeObserver(size);observer.observe(root);
   const presets:Record<string,{p:V;t:V}>= {exterior:{p:[-19,14,-25],t:[0,1.8,0]},aerial:{p:[0,30,-.1],t:[0,0,0]},rear:{p:[20,13,24],t:[0,1,0]},inside:{p:[.4,1.65,-2.8],t:[.3,1.5,-5.8]}};
   const choose=(v:string)=>{const p=presets[v]||presets.exterior;camera.position.set(...p.p);orbit.target.set(...p.t);orbit.minDistance=v==='inside'?.3:2;orbit.update()};
   api.current={view:choose,zoom(d){const delta=camera.position.clone().sub(orbit.target);delta.multiplyScalar(d);const length=THREE.MathUtils.clamp(delta.length(),orbit.minDistance,orbit.maxDistance);delta.setLength(length);camera.position.copy(orbit.target).add(delta);orbit.update()}};
   choose('exterior');size();let last=0;
   const render=(now:number)=>{if(disposed)return;frame=requestAnimationFrame(render);if(now-last<32)return;last=now;const s=settings.current,e=s.explosion/100;
    for(let i=0;i<groups.length;i++){const g=groups[i];g.visible=s.visible[i];const y=i===1?-2*e:i>=8?(i===8?4:7)*e:i===6?1.5*e:0;g.position.y=THREE.MathUtils.lerp(g.position.y,y,.15);for(const child of g.children){if(child.userData.offset){const dest=child.userData.offset as T.Vector3;child.position.lerp(dest.clone().multiplyScalar(e),.15)}}}
    const highlighted=s.selected??hoverLayer;
    layerMaterials.forEach((list,i)=>list.forEach(m=>{m.emissive.set(highlighted===i?'#278ba3':'#000000');m.emissiveIntensity=highlighted===i?.3:0}));
    dims.visible=s.dimensions;orbit.update();renderer.render(scene,camera);
   };frame=requestAnimationFrame(render);setReady(true);
   cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();orbit.dispose();renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('webglcontextlost',lost);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();api.current=null};
  }).catch(()=>{if(!disposed){setError('Este dispositivo no pudo iniciar WebGL. La planta con medidas sigue disponible.');setPlan(true)}});
  return()=>{disposed=true;cleanup()};
 },[retry]);
 const cameraView=(v:string)=>{setView(v);setPlan(false);api.current?.view(v)};
 const reset=()=>{setExplosion(0);setVisible(layers.map(()=>true));setSelected(null);cameraView('exterior')};
 return <main className="rh">
  <div className="rh-canvas" ref={host}/>
  {(plan||error)&&<div className="rh-plan"><Plan dimensions={dimensions}/></div>}
  <header className="rh-top"><a href="/herramientas/metalcon">← Volver</a><strong>FABRICK <span>CASA REFERENCIA</span></strong><button onClick={()=>setMenu(!menu)} aria-expanded={menu}>☰ Capas</button></header>
  <section className="rh-title"><small>MODELO INTERACTIVO · INTERPRETACIÓN VISUAL</small><h1>Frontón central y alas laterales</h1><p>14,51 × 13,41 m · imagen de referencia: 165 m²</p></section>
  <nav className="rh-views" aria-label="Cámaras y planta">
   {[['exterior','Exterior'],['aerial','Aérea'],['rear','Posterior'],['inside','Interior']].map(([id,title])=><button key={id} disabled={!!error} aria-pressed={!plan&&view===id} onClick={()=>cameraView(id)}>{title}</button>)}
   <button aria-pressed={plan} onClick={()=>setPlan(!plan)}>Planta 2D</button><button aria-pressed={dimensions} onClick={()=>setDimensions(!dimensions)}>Medidas</button>
  </nav>
  {menu&&<aside className="rh-menu"><div className="rh-menu-head"><h2>Capas constructivas</h2><button aria-label="Cerrar capas" onClick={()=>setMenu(false)}>✕</button></div>
   <p>Señala o toca una pieza para identificarla. Marca las capas que quieres ver.</p>
   {layers.map(([name,color],i)=><div className="rh-layer" key={name} data-selected={selected===i}><label><input type="checkbox" checked={visible[i]} onChange={e=>setVisible(v=>v.map((x,j)=>j===i?e.target.checked:x))}/><i style={{background:color}}/><span>{String(i+1).padStart(2,'0')} · {name}</span></label><button aria-label={'Información de '+name} onClick={()=>setSelected(selected===i?null:i)}>ⓘ</button></div>)}
   {selected!==null&&<section className="rh-detail"><strong>{layers[selected][0]}</strong><p>{layers[selected][2]}</p><button onClick={()=>setVisible(layers.map((_,i)=>i===selected))}>Aislar esta capa</button></section>}
   <div className="rh-actions"><button onClick={()=>setVisible(layers.map(()=>true))}>Ver todas</button><button onClick={()=>setVisible(v=>v.map((x,i)=>i>=8||i===6?false:x))}>Retirar techo y cielo</button></div>
   <details><summary>Medidas y alcance</summary><p>Cotas generales copiadas de la imagen: 14,51 × 13,41 m. Los 165 m² son el dato publicado en ella; no se calculan multiplicando esas cotas, que abarcan espacios exteriores. Distribución, alturas y espesores modelados son aproximados.</p><p>La referencia combina un frontón central con faldones laterales. Se conserva esa silueta; la fotografía no permite confirmar una cubierta de exactamente tres faldones.</p><p>Es un modelo conceptual, no un plano de ejecución ni un cálculo estructural.</p></details>
   <button className="rh-previous" onClick={previous}>Abrir recorrido anterior</button>
  </aside>}
  {hover!==null&&!menu&&!plan&&<output className="rh-hover">{String(hover+1).padStart(2,'0')} · {layers[hover][0]} · Toca para inspeccionar</output>}
  {error&&<div className="rh-error" role="status">{error}<button onClick={()=>{setPlan(false);setRetry(x=>x+1)}}>Reintentar 3D</button></div>}
  {!ready&&!error&&<div className="rh-loading" role="status">Construyendo la casa de referencia…</div>}
  <footer className="rh-bottom"><div className="rh-slider"><label htmlFor="explode">Vista explotada <strong>{explosion}%</strong></label><input id="explode" aria-label="Separar capas" type="range" min="0" max="100" value={explosion} disabled={plan||!!error} onChange={e=>setExplosion(Number(e.target.value))}/></div><div className="rh-tools"><button disabled={plan||!!error} onClick={()=>setExplosion(explosion?0:75)}>{explosion?'Ensamblar':'Separar'}</button><button aria-label="Acercar" disabled={plan||!!error} onClick={()=>api.current?.zoom(.85)}>＋</button><button aria-label="Alejar" disabled={plan||!!error} onClick={()=>api.current?.zoom(1.18)}>−</button><button onClick={reset}>Restablecer</button></div><small>{plan?'Planta interpretada · áreas transcritas de la referencia':'Arrastra para girar · pellizca para acercar · dos dedos para desplazar'}</small></footer>
 </main>;
}
