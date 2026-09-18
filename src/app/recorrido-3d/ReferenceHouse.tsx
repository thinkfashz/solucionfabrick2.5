"use client";
import {useEffect,useRef,useState} from 'react';
import type * as T from 'three';
import {layers,rooms,walls,width,depth} from './reference-house';
import './reference-house.css';
import {materialTexture} from './material-textures';
type V=[number,number,number];
type Controls={view:(v:string)=>void;zoom:(d:number)=>void;tour:(on:boolean)=>void};
type LightingDetail={mode?:'day'|'sunset'|'night';exposure?:number;temperature?:number;interiorLights?:boolean;exteriorLights?:boolean};

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
export default function ReferenceHouse(){
 const cameraFade=useRef<HTMLDivElement>(null);
 const host=useRef<HTMLDivElement>(null),api=useRef<Controls|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [menu,setMenu]=useState(false),[explosion,setExplosion]=useState(0),[visible,setVisible]=useState(layers.map(()=>true));
 const [selected,setSelected]=useState<number|null>(null),[hover,setHover]=useState<number|null>(null),[dimensions,setDimensions]=useState(false),[plan,setPlan]=useState(false),[view,setView]=useState('exterior');
 const [tour,setTour]=useState(false),[loadStep,setLoadStep]=useState(0),[quality,setQuality]=useState('balanced');
 const [technical,setTechnical]=useState('architecture');
 const cameraIds=['exterior','inside','dining','kitchen','primary-bedroom','primary-bath','bedroom2','bath2','guestbath','laundry','garden','rear','aerial'];
 const settings=useRef({explosion,visible,selected,dimensions,quality,technical});settings.current={explosion,visible,selected,dimensions,quality,technical};
 useEffect(()=>{
  const stageOrder=[0,2,3,1,4,5,7,6,8,9];
  const handler=(event:Event)=>{
   const detail=(event as CustomEvent<{mode?:string;stage?:number}>).detail||{};
   const mode=detail.mode||'architecture';setTechnical(mode);setTour(false);api.current?.tour(false);setSelected(null);setExplosion(mode==='explode'?58:0);setPlan(mode==='plan');
   if(mode==='architecture')setVisible(layers.map(()=>true));
   else if(mode==='structure')setVisible(layers.map((_,i)=>[0,2,3,8,9].includes(i)));
   else if(mode==='electric')setVisible(layers.map((_,i)=>[0,2,6,7].includes(i)));
   else if(mode==='water'||mode==='sanitary')setVisible(layers.map((_,i)=>[2,6].includes(i)));else if(mode==='underfloor')setVisible(layers.map((_,i)=>i===2));
   else if(mode==='stage'){const stage=Math.max(1,Math.min(12,detail.stage||12));const count=Math.ceil(stage/12*stageOrder.length);setVisible(layers.map((_,i)=>stageOrder.slice(0,count).includes(i)));}
  };
  window.addEventListener('fabrick:technical',handler);return()=>window.removeEventListener('fabrick:technical',handler);
 },[]);
 useEffect(()=>{
  let disposed=false,cleanup=()=>{};setReady(false);setError('');setLoadStep(0);setTour(false);
  Promise.all([import('three'),import('three/examples/jsm/controls/OrbitControls.js'),import('three/examples/jsm/utils/BufferGeometryUtils.js')]).then(async ([THREE,{OrbitControls},{mergeGeometries}])=>{
   if(disposed||!host.current)return;setLoadStep(1);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(disposed||!host.current)return;const root=host.current;
   THREE.Cache.enabled=true;
   const mobile=window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
   const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance',alpha:false});
   renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.05:1.35));renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#c5d3da');root.appendChild(renderer.domElement);
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(54,1,.08,500);
   const hemi=new THREE.HemisphereLight('#f7fbff','#52606a',.92);scene.add(hemi);
   const sun=new THREE.DirectionalLight('#fff4dc',3.15);sun.position.set(-10,20,-12);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:52});sun.shadow.bias=-.00065;sun.shadow.normalBias=.028;scene.add(sun);
   const indoorLights:T.PointLight[]=[],outdoorLights:T.PointLight[]=[];
   const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.065;orbit.rotateSpeed=.55;orbit.panSpeed=.65;orbit.zoomSpeed=.65;orbit.minDistance=2;orbit.maxDistance=65;orbit.maxPolarAngle=Math.PI*.49;
   const groups=layers.map((_,i)=>{const g=new THREE.Group();g.userData.layer=i;scene.add(g);return g});
   const electricGroup=new THREE.Group();electricGroup.name='electrical-plan';electricGroup.visible=false;scene.add(electricGroup);
   const waterGroup=new THREE.Group();waterGroup.name='water-plan';waterGroup.visible=false;scene.add(waterGroup);
   const sanitaryGroup=new THREE.Group();sanitaryGroup.name='sanitary-plan';sanitaryGroup.visible=false;scene.add(sanitaryGroup);
   const geometry:T.BufferGeometry[]=[],materials:T.Material[]=[],textures:T.Texture[]=[];
   const mat=(color:string,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness:metalness?.28:.55,side:THREE.DoubleSide});materials.push(m);return m};
   const steel=mat('#b8c5cf',.8),concrete=mat('#a8aaa3'),wood=mat('#b58c5e'),white=mat('#f5f3ec'),roof=mat('#38434b',.5),osb=mat('#c49b60'),wool=mat('#d8c695'),membrane=mat('#859f9c'),black=mat('#29373f',.4),glass=mat('#91acb3',.15);
   const textured=(m:T.MeshStandardMaterial,kind:Parameters<typeof materialTexture>[1],color:string,roughness:number,scale:number)=>{const t=materialTexture(THREE,kind,color);if(t){m.color.set('#ffffff');m.map=t.map;m.bumpMap=t.bump;m.roughnessMap=t.roughness;m.bumpScale=scale;textures.push(t.map,t.bump,t.roughness)}m.roughness=roughness;return m};
   textured(wood,'wood','#b18a5d',.34,.025);textured(white,'plaster','#f5f3ec',.72,.006);textured(concrete,'plaster','#aaa79e',.82,.02);textured(roof,'metal','#495059',.36,.026);
   const porcelain=textured(mat('#d4cec3'),'tile','#d4cec3',.24,.01),fabric=textured(mat('#8e9a8d'),'fabric','#8e9a8d',.88,.012),gravel=textured(mat('#b8b5ab'),'gravel','#b8b5ab',.92,.09),grass=textured(mat('#77865b'),'grass','#77865b',1,.045);
   const skyGeo=new THREE.SphereGeometry(180,32,16);geometry.push(skyGeo);
   const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){vec3 d=normalize(v);float h=max(d.y,0.);vec3 c=mix(vec3(.84,.89,.91),vec3(.24,.51,.76),pow(h,.55));float cloud=sin(d.x*18.+sin(d.z*13.))*sin(d.z*21.+sin(d.x*8.));float mask=smoothstep(.2,.7,cloud)*smoothstep(.05,.22,h)*(1.-smoothstep(.5,.85,h));c=mix(c,vec3(.98,.96,.92),mask*.7);float sun=pow(max(dot(d,normalize(vec3(-.5,.75,-.4))),0.),400.);gl_FragColor=vec4(c+vec3(1.,.8,.5)*sun,1.);}'});materials.push(skyMat);
   const sky=new THREE.Mesh(skyGeo,skyMat);scene.add(sky);scene.fog=new THREE.Fog('#c7d5d8',55,125);
   const skyScene=new THREE.Scene();skyScene.add(sky.clone());const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(skyScene,.05,.1,300);scene.environment=environment.texture;pmrem.dispose();
   glass.transparent=true;glass.opacity=.3;glass.depthWrite=false;
   const cv=document.createElement('canvas');cv.width=cv.height=256;const cx=cv.getContext('2d');
   if(cx){cx.fillStyle='#c3a071';cx.fillRect(0,0,256,256);let seed=12;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let i=0;i<1600;i++){cx.save();cx.translate(random()*256,random()*256);cx.rotate(random()*Math.PI);cx.fillStyle=['#8d6f47','#d9bb8b','#b18b54'][i%3];cx.fillRect(0,0,3+random()*18,1+random()*3);cx.restore()}const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);textures.push(tex);osb.map=tex;}
   function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D){geometry.push(g);const a=new THREE.Mesh(g,m);a.castShadow=!m.transparent;a.receiveShadow=true;parent.add(a);return a}
   function box(p:V,size:V,m:T.Material,parent:T.Object3D){const geo=new THREE.BoxGeometry(...size);const pos=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i));uv.setXY(i,nx>.5?pos.getZ(i):pos.getX(i),ny>.5?pos.getZ(i):pos.getY(i))}const b=mesh(geo,m,parent);b.position.set(...p);return b}
   function beam(a:V,b:V,r:number,m:T.Material,parent:T.Object3D){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const o=box([0,0,0],[r,av.distanceTo(bv),r],m,parent);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return o}
   function surface(points:V[],m:T.Material,parent:T.Object3D){const a:number[]=[];for(let i=1;i<points.length-1;i++)a.push(...points[0],...points[i],...points[i+1]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const uv:number[]=[];for(let i=0;i<a.length;i+=3)uv.push(a[i]*.2,a[i+2]*.2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return mesh(g,m,parent)}
   box([0,-.32,0],[240,.3,240],grass,scene);box([0,-.155,-10],[19,.04,7],gravel,scene);
   box([0,-.06,.85],[width,.24,9.7],concrete,groups[0]);box([.3275,-.06,-4.85],[6.355,.24,1.7],concrete,groups[0]);
   box([0,-.08,-5.35],[width,.18,2.7],wood,groups[0]);box([1.3,-.05,6.15],[3.6,.18,1.11],concrete,groups[0]);
   for(let z=-6.6;z<-4;z+=.16)box([0,.017,z],[width,.015,.012],black,groups[0]);
   for(let i=0;i<5;i++)box([0,-.13,-8-i*1.1],[2.3,.09,.65],concrete,scene);
   box([0,.07,.85],[14.1,.04,9.3],porcelain,groups[7]);box([.3275,.07,-4.8],[6,.04,1.7],porcelain,groups[7]);
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
   box([0,2.77,.85],[14.35,.09,9.56],white,groups[6]);
   box([.3275,2.77,-4.8],[6.2,.09,1.75],white,groups[6]);
   // Soffits over both covered terraces and continuous fascia.
   box([-5.35,2.78,-5.12],[4.7,.1,2.25],white,groups[9]);box([5.67,2.78,-5.12],[4.05,.1,2.25],white,groups[9]);
   box([.3275,2.78,-5.96],[6.65,.1,.48],white,groups[9]);
   // Three roof volumes: two lateral wings and central projecting gable.
   const roofFaces:V[][]=[
    [[-7.7,2.95,-6.2],[-2.6,4.95,1],[-7.7,2.95,6.15]],
    [[7.7,2.95,-6.2],[7.7,2.95,6.15],[3.3,4.95,1]],
    [[-7.7,2.95,6.15],[-2.6,4.95,1],[3.3,4.95,1],[7.7,2.95,6.15]],
    [[-7.7,2.95,-6.2],[-3,2.95,-6.2],[.3275,4.95,1],[-2.6,4.95,1]],
    [[3.65,2.95,-6.2],[7.7,2.95,-6.2],[3.3,4.95,1],[.3275,4.95,1]],
    [[-3,2.95,-6.2],[.3275,4.95,-6.2],[.3275,4.95,1]],
    [[.3275,4.95,-6.2],[3.65,2.95,-6.2],[.3275,4.95,1]],
   ];
   for(const pts of roofFaces){surface(pts.map(p=>[p[0],p[1]-.08,p[2]] as V),osb,groups[9]);surface(pts,roof,groups[9]);for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];beam([a[0],a[1]-.14,a[2]],[b[0],b[1]-.14,b[2]],.08,steel,groups[8]);surface([a,b,[b[0],b[1]-.13,b[2]],[a[0],a[1]-.13,a[2]]],roof,groups[9]);beam(a,b,.045,roof,groups[9])};}
   for(let z=-6;z<1;z+=.65){const a:V=[-3,2.91,z],b:V=[.3275,4.88,z],c:V=[3.65,2.91,z];beam(a,b,.08,steel,groups[8]);beam(b,c,.08,steel,groups[8]);beam(a,c,.08,steel,groups[8]);beam([.3275,2.91,z],b,.07,steel,groups[8]);beam(a,[.3275,4,z],.06,steel,groups[8]);beam(c,[.3275,4,z],.06,steel,groups[8]);}
   for(const pts of roofFaces){
    const a=pts[0],b=pts[1],c=pts[pts.length-1];
    for(let t=.08;t<1;t+=.08){const p=a.map((v,k)=>v+(b[k]-v)*t) as V;const q=c.map((v,k)=>v+(b[k]-v)*t) as V;p[1]-=.1;q[1]-=.1;beam(p,q,.055,steel,groups[8]);}
   }
   beam([-3,3,-6.2],[.3275,5,-6.2],.18,wood,groups[9]);beam([.3275,5,-6.2],[3.65,3,-6.2],.18,wood,groups[9]);
   for(const x of [-7.7,7.7]){beam([x,2.91,-6.2],[x,2.91,6.15],.13,roof,groups[9]);beam([x,2.91,6],[x,.1,6],.1,roof,groups[9]);}
   beam([-7.7,2.91,6.15],[7.7,2.91,6.15],.13,roof,groups[9]);
   beam([-7.7,2.87,-6.2],[-3,2.87,-6.2],.16,roof,groups[9]);beam([3.65,2.87,-6.2],[7.7,2.87,-6.2],.16,roof,groups[9]);
   for(const x of [-7.55,7.55])beam([x,.06,-6.08],[x,2.8,-6.08],.09,roof,groups[9]);
   // Schematic pipes are below the slab, lowered separately in exploded mode.
   const blue=mat('#249fcd'),hot=mat('#e4b94b'),drain=mat('#9aafb9');
   for(const [x,z]of [[-5.7,1.8],[3.4,2.4],[6.3,-.7],[-.6,4.5]]){
    beam([x,.7,z],[x,-.45,z],.085,blue,groups[1]);beam([x+.15,.7,z],[x+.15,-.36,z],.06,hot,groups[1]);beam([x,-.5,z],[8.6,-.5,z],.12,drain,groups[1]);
    beam([x,.12,z],[x,-.42,z],.055,blue,waterGroup);beam([x+.13,.12,z],[x+.13,-.34,z],.042,hot,waterGroup);
    beam([x,-.46,z],[8.6,-.46,z],.085,drain,sanitaryGroup);
   }
   beam([-6.3,-.4,4.6],[6.45,-.4,4.6],.045,blue,waterGroup);beam([-6.2,-.32,4.78],[6.35,-.32,4.78],.035,hot,waterGroup);
   beam([8.6,-.46,-.7],[8.6,-.54,5],.1,drain,sanitaryGroup);
   beam([8.6,-.5,-.7],[8.6,-.6,5],.14,drain,groups[1]);box([8.6,-.38,5],[.8,.65,.8],concrete,groups[1]);beam([8.6,-.6,5],[10.4,-.6,5],.14,drain,groups[1]);
   const tank=mesh(new THREE.CylinderGeometry(.65,.65,2.3,16),mat('#4c646d'),groups[1]);tank.rotation.x=Math.PI/2;tank.position.set(10.4,-.5,5.8);box([10.4,.16,5.2],[.45,.12,.45],black,groups[1]);
   // Simple furniture for legible scale, attached to the finished layer.
   box([.6,.45,-1.2],[2.5,.7,.95],fabric,groups[7]);box([.6,.9,-.8],[2.5,.8,.16],fabric,groups[7]);box([.3,.42,-2.5],[1.2,.12,.65],wood,groups[7]);box([.1,.8,-4.4],[2.1,.12,1],wood,groups[7]);
   for(const [x,z]of [[-5,-1.9],[-4.8,4.15]]){box([x,.32,z],[1.8,.6,2],wood,groups[7]);box([x,.67,z],[1.8,.15,2],white,groups[7]);}
   box([6.65,.5,-.3],[.65,1,2.5],white,groups[7]);box([6.65,1.03,-.3],[.7,.08,2.6],black,groups[7]);
   const dims=new THREE.Group();scene.add(dims);
   function label(text:string,p:V){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');if(!ctx)return;ctx.fillStyle='#172c36';ctx.fillRect(0,0,512,96);ctx.fillStyle='#d3f7ff';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,64);const t=new THREE.CanvasTexture(c);textures.push(t);const m=new THREE.SpriteMaterial({map:t,depthTest:false});materials.push(m);const s=new THREE.Sprite(m);s.position.set(...p);s.scale.set(3.2,.6,1);dims.add(s)}
   const dimMat=mat('#b2ecf5');beam([-7.255,.1,8],[7.255,.1,8],.025,dimMat,dims);beam([-8.6,.1,-6.705],[-8.6,.1,6.705],.025,dimMat,dims);label('14,51 m',[0,.35,8.1]);label('13,41 m',[-8.6,.4,0]);
   for(const x of [-7.255,7.255])beam([x,.1,7.7],[x,.1,8.3],.025,dimMat,dims);for(const z of [-6.705,6.705])beam([-8.9,.1,z],[-8.3,.1,z],.025,dimMat,dims);
   // Furnished interior: legs, seats, bedding, kitchen fronts and sanitary fixtures.
   for(const x of [-.8,1])for(const z of [-4.75,-4.05])beam([x,.08,z],[x,.74,z],.06,black,groups[7]);
   for(const x of [-.75,.05,.85])for(const z of [-5.25,-3.6]){box([x,.47,z],[.47,.1,.45],wood,groups[7]);box([x,.76,z+(z<-4?-.2:.2)],[.47,.6,.055],wood,groups[7]);for(const dx of [-.18,.18])for(const dz of [-.16,.16])beam([x+dx,.1,z+dz],[x+dx,.45,z+dz],.035,black,groups[7]);}
   for(const x of [-.5,.35,1.2]){box([x,.83,-1.15],[.77,.19,.76],fabric,groups[7]);box([x,1.14,-.87],[.7,.5,.16],fabric,groups[7]);}
   box([.4,.095,-2],[3.2,.02,2.6],textured(mat('#b5b0a1'),'fabric','#b5b0a1',1,.012),groups[7]);
   for(const [x,z]of [[-5,-1.9],[-4.8,4.15]]){box([x,.85,z-.7],[1.45,.19,.45],white,groups[7]);box([x,.79,z+.3],[1.85,.08,1.25],fabric,groups[7]);box([x,1.1,z-1.03],[1.9,1.3,.12],wood,groups[7]);box([x+1.3,.4,z-.65],[.6,.65,.55],wood,groups[7]);}
   for(let z=-1.4;z<.9;z+=.55){box([6.29,.52,z],[.025,.85,.51],wood,groups[7]);beam([6.26,.85,z-.12],[6.26,.85,z+.12],.022,steel,groups[7]);}
   // Cocina más completa: cubierta, módulos altos, refrigerador, lavaplatos y laterales.
   box([6.6,1.085,-.6],[.45,.035,.6],steel,groups[7]);beam([6.85,1.05,-.6],[6.85,1.42,-.6],.035,steel,groups[7]);beam([6.85,1.42,-.6],[6.6,1.42,-.6],.035,steel,groups[7]);
   for(const z of [-1.25,-.55,.15,.85])box([6.42,2.05,z],[.42,.58,.62],wood,groups[7]);
   box([6.16,2.43,-.2],[.12,.08,2.55],black,groups[7]);
   box([5.75,1.12,1],[.8,2.1,.6],steel,groups[7]);
   box([5.72,1.15,-1.45],[.7,2.15,.68],white,groups[7]);
   box([6.57,1.09,.55],[.48,.04,.58],black,groups[7]);
   // Red eléctrica conceptual: tablero, troncales y derivaciones a puntos de luz/enchufe.
   const cable=mat('#ffd400'),cable2=mat('#1f6fb2');box([4.95,1.55,4.8],[.45,.62,.12],black,electricGroup);
   beam([4.95,1.8,4.75],[4.95,2.55,-3.5],.025,cable,electricGroup);
   for(const [x,z] of [[0,-4.4],[0,-1],[-5,-1.9],[-4.8,4.1],[6,-.5]]){beam([4.95,2.55,z],[x,2.55,z],.018,cable,electricGroup);beam([x,2.55,z],[x,1.05,z],.014,cable2,electricGroup);box([x,1.05,z],[.12,.16,.05],white,electricGroup);}
   for(const [x,z]of [[-5.6,1.8],[3.5,2.5]]){box([x,.47,z],[.52,.64,.7],white,groups[7]);box([x,.92,z+.3],[.5,.58,.16],white,groups[7]);box([x+.85,.6,z],[.7,1,.5],wood,groups[7]);box([x+.85,1.13,z],[.74,.09,.55],porcelain,groups[7]);}
   for(const [index,[x,z]]of [[0,-4.4],[0,-1],[-5,-1.9],[-4.8,4.1],[6,-.5]].entries()){const light=new THREE.PointLight('#ffe2b5',18,8.5,2);light.position.set(x,2.55,z);if(!mobile&&index<2){light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.bias=-.002}indoorLights.push(light);groups[7].add(light);beam([x,2.8,z],[x,2.35,z],.025,black,groups[7]);box([x,2.32,z],[.38,.1,.38],white,groups[7]);}
   for(const x of [-6.8,6.8]){const lamp=new THREE.PointLight('#ffd39a',12,6,2);lamp.position.set(x,2.35,-4.2);outdoorLights.push(lamp);scene.add(lamp);}
   for(const w of walls){const a:V=w.axis==='x'?[w.x-w.length/2,2.66,w.z]:[w.x,2.66,w.z-w.length/2];const b:V=w.axis==='x'?[w.x+w.length/2,2.66,w.z]:[w.x,2.66,w.z+w.length/2];beam(a,b,.055,white,groups[6]);}
   box([-.1,1.3,.78],[1.65,.95,.055],black,groups[7]);box([-.1,.43,.63],[2,.5,.4],wood,groups[7]);
   for(const x of [-2.5,3.1]){box([x,1.35,-5.6],[.28,2.45,.09],fabric,groups[7]);}
   box([-1,1,4.7],[.62,1,.62],white,groups[7]);const washer=mesh(new THREE.CylinderGeometry(.21,.21,.045,20),black,groups[7]);washer.rotation.x=Math.PI/2;washer.position.set(-1,.95,4.36);
   for(const [x,z]of [[-5.6,1.8],[3.5,2.5]]){box([x+.85,1.7,z+.25],[.68,.7,.025],glass,groups[7]);beam([x+.85,1.15,z],[x+.85,1.4,z],.03,steel,groups[7]);}
   // Compact parked vehicle, scaled to metres, independent of construction layers.
   const car=new THREE.Group();car.position.set(5.9,.12,-10.4);car.rotation.y=-.18;scene.add(car);
   const paint=mat('#61727c',.65);paint.roughness=.23;const rubber=mat('#202425');rubber.roughness=.95;const tailLight=mat('#8f3030',.15);tailLight.roughness=.34;
   box([0,.65,0],[1.85,.65,4.15],paint,car);box([0,1.22,.15],[1.62,.62,2.15],paint,car);
   box([0,1.3,-.96],[1.47,.43,.04],glass,car);box([0,1.3,1.23],[1.47,.43,.04],glass,car);
   for(const x of [-.835,.835]){box([x,1.31,.13],[.035,.39,1.84],glass,car);box([x*1.14,1.07,-.85],[.22,.13,.3],paint,car);}
   for(const x of [-.94,.94])for(const z of [-1.32,1.33]){const wheel=mesh(new THREE.CylinderGeometry(.36,.36,.22,20),rubber,car);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.35,z);const hub=mesh(new THREE.CylinderGeometry(.21,.21,.235,16),steel,car);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);}
   for(const x of [-.62,.62]){box([x,.75,-2.085],[.4,.16,.035],white,car);box([x,.75,2.085],[.4,.15,.035],tailLight,car);}box([0,.5,-2.09],[.85,.18,.04],black,car);
   const applyLighting=(detail:LightingDetail={})=>{
    const mode=detail.mode||'day',exposure=(detail.exposure??100)/100,temp=detail.temperature??4200;
    renderer.toneMappingExposure=exposure*(mode==='night'?.82:mode==='sunset'?.96:1.08);
    const warm=THREE.MathUtils.clamp((6500-temp)/3800,0,1);
    if(mode==='day'){hemi.intensity=.92;hemi.color.set('#f7fbff');hemi.groundColor.set('#52606a');sun.intensity=3.15;sun.color.set('#fff4dc');sun.position.set(-10,20,-12);scene.fog=new THREE.Fog('#c7d5d8',58,128);renderer.setClearColor('#c5d3da');}
    else if(mode==='sunset'){hemi.intensity=.62;hemi.color.set('#ffd8a8');hemi.groundColor.set('#394654');sun.intensity=2.35;sun.color.set('#ffbd72');sun.position.set(-18,7,-10);scene.fog=new THREE.Fog('#d5aa86',50,118);renderer.setClearColor('#d6a77d');}
    else {hemi.intensity=.22;hemi.color.set('#8ab8df');hemi.groundColor.set('#101927');sun.intensity=.38;sun.color.set('#a8c8ea');sun.position.set(12,16,8);scene.fog=new THREE.Fog('#142538',42,102);renderer.setClearColor('#0d1c2c');}
    indoorLights.forEach(l=>{l.visible=detail.interiorLights!==false;l.intensity=(mode==='day'?10:mode==='sunset'?18:25)*(1+warm*.12)});
    outdoorLights.forEach(l=>{l.visible=detail.exteriorLights!==false;l.intensity=mode==='day'?5:mode==='sunset'?13:20});
    renderer.shadowMap.needsUpdate=true;
   };
   const lightingEvent=(event:Event)=>applyLighting((event as CustomEvent<LightingDetail>).detail||{});
   window.addEventListener('fabrick:lighting',lightingEvent);applyLighting();
   setLoadStep(2);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   if(disposed){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();orbit.dispose();renderer.dispose();renderer.domElement.remove();return;}
   // Merge static pieces by material and explosion direction to limit draw calls.
   const layerMaterials:T.MeshStandardMaterial[][]=[];
   scene.updateMatrixWorld(true);
   for(const group of groups){
    const batches=new Map<string,{parts:T.BufferGeometry[];material:T.MeshStandardMaterial;offset:T.Vector3}>();
    group.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const m=o.material as T.MeshStandardMaterial;const offset=(o.parent?.userData.offset as T.Vector3|undefined)||new THREE.Vector3();const key=m.uuid+offset.toArray().join(',');if(!batches.has(key))batches.set(key,{parts:[],material:m,offset});const copy=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();batches.get(key)!.parts.push(copy.applyMatrix4(o.matrixWorld))});
    const lamps=group.children.filter(o=>o instanceof THREE.Light);group.clear();lamps.forEach(o=>group.add(o));const clones=new Map<string,T.MeshStandardMaterial>();
    for(const {parts,material,offset}of batches.values()){const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(!g)continue;if(!clones.has(material.uuid)){const clone=material.clone();materials.push(clone);clones.set(material.uuid,clone)}const sub=new THREE.Group();sub.userData.offset=offset;group.add(sub);mesh(g,clones.get(material.uuid)!,sub)}
    layerMaterials.push([...clones.values()]);
   }
   const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let hoverLayer:number|null=null,downX=0,downY=0,frame=0;
   const pick=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(groups.filter(g=>g.visible),true)[0];let o:T.Object3D|undefined=hit?.object;while(o&&o.userData.layer===undefined)o=o.parent||undefined;return o?.userData.layer??null};
   let lastPick=0;const move=(e:PointerEvent)=>{if(e.buttons||performance.now()-lastPick<100)return;lastPick=performance.now();hoverLayer=pick(e);setHover(hoverLayer);renderer.domElement.style.cursor=hoverLayer===null?'grab':'pointer'};
   const down=(e:PointerEvent)=>{downX=e.clientX;downY=e.clientY};const up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)<5){const layer=pick(e);setSelected(layer);if(layer!==null)setMenu(true)}};
   const leave=()=>{hoverLayer=null;setHover(null)};
   renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointerleave',leave);
   const lost=(e:Event)=>{e.preventDefault();setError('El navegador perdió el contexto 3D. Puedes seguir viendo la planta o reiniciar.');setPlan(true);cancelAnimationFrame(frame)};renderer.domElement.addEventListener('webglcontextlost',lost);
   const size=()=>{const w=root.clientWidth,h=root.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix()};const observer=new ResizeObserver(size);observer.observe(root);
   const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const presets:Record<string,{p:V;t:V;fov?:number}>={
    exterior:{p:[-18,9,-24],t:[0,1.65,0],fov:50},aerial:{p:[0,29,-.1],t:[0,0,0],fov:46},rear:{p:[18,9,23],t:[0,1.2,1],fov:50},
    inside:{p:[2,1.62,-2.7],t:[.2,1.18,-1],fov:64},dining:{p:[2.3,1.58,-3.45],t:[.05,1.08,-4.45],fov:62},kitchen:{p:[4.25,1.62,.15],t:[6.35,1.25,-.25],fov:62},
    'primary-bedroom':{p:[-3.25,1.6,-.25],t:[-5.2,1,-2],fov:62},'primary-bath':{p:[-4.65,1.58,1.15],t:[-5.75,1,1.95],fov:65},
    bedroom2:{p:[-2.7,1.62,4.45],t:[-5,1.05,4.05],fov:62},bath2:{p:[1.15,1.58,4.25],t:[2.9,1.02,4.35],fov:65},guestbath:{p:[1.1,1.58,2.05],t:[3.2,1.02,2.15],fov:65},laundry:{p:[-.15,1.6,3.85],t:[-1.15,1.05,4.35],fov:64},
    garden:{p:[.3,1.62,-4.85],t:[0,1.45,-12],fov:54}
   };
   let playing=false,tourElapsed=0,tourIndex=0;const stops=['inside','dining','kitchen','primary-bedroom','primary-bath','bedroom2','bath2','guestbath','laundry','garden'];
   type Transition={time:number;portal:boolean;fromP:T.Vector3;fromT:T.Vector3;toP:T.Vector3;toT:T.Vector3;fromFov:number;toFov:number;switched:boolean};
   let transition:Transition|null=null,currentView='exterior',zoomGoal:number|null=null;
   const cancelTour=()=>{playing=false;transition=null;zoomGoal=null;orbit.enabled=true;if(cameraFade.current)cameraFade.current.style.opacity='0';setTour(false)};
   orbit.addEventListener('start',cancelTour);const visibility=()=>{if(document.hidden)cancelTour()};document.addEventListener('visibilitychange',visibility);
   const choose=(v:string,instant=false)=>{const p=presets[v]||presets.exterior;const toFov=p.fov??(stops.includes(v)?64:52);zoomGoal=null;
    orbit.minDistance=stops.includes(v)?.3:2;
    if(instant||reducedMotion){camera.position.set(...p.p);orbit.target.set(...p.t);camera.fov=toFov;camera.updateProjectionMatrix();orbit.update();}
    else {transition={time:0,portal:stops.includes(v)||stops.includes(currentView),fromP:camera.position.clone(),fromT:orbit.target.clone(),toP:new THREE.Vector3(...p.p),toT:new THREE.Vector3(...p.t),fromFov:camera.fov,toFov,switched:false};orbit.enabled=false;}
    currentView=v;setView(v);
   };
   api.current={view(v){cancelTour();choose(v)},tour(on){cancelTour();playing=on;setTour(on);tourElapsed=0;tourIndex=0;if(on)choose(stops[0])},zoom(d){if(transition)return;const length=camera.position.distanceTo(orbit.target);zoomGoal=THREE.MathUtils.clamp((zoomGoal??length)*d,orbit.minDistance,orbit.maxDistance)}};
   choose('exterior',true);size();let last=0,lastQuality='',lastShadowState='';
   setLoadStep(3);
   const render=(now:number)=>{if(disposed)return;frame=requestAnimationFrame(render);if(now-last<16)return;const dt=Math.min((now-last)/1000,.05);last=now;
    if(transition){const tr=transition;tr.time+=dt;const duration=tr.portal?.62:.82;const t=Math.min(tr.time/duration,1),ease=t*t*(3-2*t);
     if(tr.portal){if(cameraFade.current)cameraFade.current.style.opacity=String(Math.sin(Math.PI*t)*.98);if(t>=.5&&!tr.switched){camera.position.copy(tr.toP);orbit.target.copy(tr.toT);camera.fov=tr.toFov;tr.switched=true;}}
     else {const start=new THREE.Spherical().setFromVector3(tr.fromP.clone().sub(tr.fromT)),end=new THREE.Spherical().setFromVector3(tr.toP.clone().sub(tr.toT));let angle=end.theta-start.theta;angle=Math.atan2(Math.sin(angle),Math.cos(angle));const pos=new THREE.Spherical(THREE.MathUtils.lerp(start.radius,end.radius,ease),THREE.MathUtils.lerp(start.phi,end.phi,ease),start.theta+angle*ease);orbit.target.lerpVectors(tr.fromT,tr.toT,ease);camera.position.setFromSpherical(pos).add(orbit.target);camera.fov=THREE.MathUtils.lerp(tr.fromFov,tr.toFov,ease);}
     camera.updateProjectionMatrix();if(t===1){transition=null;orbit.enabled=true;if(cameraFade.current)cameraFade.current.style.opacity='0';}
    } else if(playing){tourElapsed+=dt;const target=presets[stops[tourIndex]].t;orbit.target.set(target[0]+Math.sin(tourElapsed*.35)*.25,target[1],target[2]);if(tourElapsed>7){tourIndex=(tourIndex+1)%stops.length;choose(stops[tourIndex]);tourElapsed=0}}
    if(zoomGoal!==null){const offset=camera.position.clone().sub(orbit.target);const length=THREE.MathUtils.damp(offset.length(),zoomGoal,7,dt);camera.position.copy(orbit.target).add(offset.setLength(length));if(Math.abs(length-zoomGoal)<.01)zoomGoal=null;}
    const s=settings.current,e=s.explosion/100,alpha=reducedMotion?1:1-Math.exp(-6*dt);electricGroup.visible=s.technical==='electric';waterGroup.visible=s.technical==='water'||s.technical==='underfloor';sanitaryGroup.visible=s.technical==='sanitary'||s.technical==='underfloor';
    if(s.quality!==lastQuality){renderer.setPixelRatio(s.quality==='light'?1:Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=s.quality!=='light';lastQuality=s.quality;size();renderer.shadowMap.needsUpdate=true;}
    let moving=false;
    for(let i=0;i<groups.length;i++){const g=groups[i];g.visible=s.visible[i];const y=i===1?-2*e:i>=8?(i===8?4:7)*e:i===6?2*e:0;moving ||= Math.abs(g.position.y-y)>.005;g.position.y=THREE.MathUtils.lerp(g.position.y,y,alpha);for(const child of g.children){if(child.userData.offset){const dest=(child.userData.offset as T.Vector3).clone().multiplyScalar(e);moving ||= child.position.distanceToSquared(dest)>.0001;child.position.lerp(dest,alpha)}}}
    const shadowState=s.visible.join(',');renderer.shadowMap.autoUpdate=false;if(moving||shadowState!==lastShadowState){renderer.shadowMap.needsUpdate=true;lastShadowState=shadowState;}
    const highlighted=s.selected??hoverLayer;
    layerMaterials.forEach((list,i)=>list.forEach(m=>{m.emissive.set(highlighted===i?'#278ba3':'#000000');m.emissiveIntensity=highlighted===i?.3:0}));
    dims.visible=s.dimensions;orbit.update();renderer.render(scene,camera);
   };renderer.render(scene,camera);frame=requestAnimationFrame(render);setReady(true);
   cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();orbit.removeEventListener('start',cancelTour);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('fabrick:lighting',lightingEvent);orbit.dispose();renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('webglcontextlost',lost);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();api.current=null};
  }).catch(()=>{if(!disposed){setError('Este dispositivo no pudo iniciar WebGL. La planta con medidas sigue disponible.');setPlan(true)}});
  return()=>{disposed=true;cleanup()};
 },[retry]);
 const cameraView=(v:string)=>{setTour(false);setView(v);setPlan(false);if(!['exterior','aerial','rear'].includes(v)){setExplosion(0);setVisible(layers.map(()=>true));setSelected(null)}api.current?.view(v)};
 const startTour=()=>{setPlan(false);setExplosion(0);setVisible(layers.map(()=>true));setSelected(null);setTour(!tour);api.current?.tour(!tour);setMenu(false)};
 const inspect=(mode:string)=>{setTour(false);api.current?.tour(false);setSelected(null);setVisible(layers.map((_,i)=>mode==='structure'?[0,2,8].includes(i):mode==='interior'?![6,8,9].includes(i):true));setExplosion(mode==='explode'?65:0);setPlan(false);api.current?.view(mode==='interior'?'aerial':'exterior')};
 const nextCamera=(direction:number)=>{const index=cameraIds.indexOf(view);cameraView(cameraIds[(index+direction+cameraIds.length)%cameraIds.length])};
 const reset=()=>{setExplosion(0);setVisible(layers.map(()=>true));setSelected(null);cameraView('exterior')};
 return <main className="rh">
  <div className="rh-canvas" ref={host}/><div ref={cameraFade} className="rh-camera-fade" aria-hidden="true"/>
  {(plan||error)&&<div className="rh-plan"><Plan dimensions={dimensions}/></div>}
  <header className="rh-top"><a href="/herramientas/metalcon">← Volver</a><strong>FABRICK <span>CASA REFERENCIA</span></strong><button onClick={()=>setMenu(!menu)} aria-expanded={menu}>☰ Menú</button></header>
  <div className="rh-location">{({exterior:'Casa de referencia',inside:'Living',dining:'Comedor',kitchen:'Cocina','primary-bedroom':'Dormitorio principal','primary-bath':'Baño principal',bedroom2:'Dormitorio 2',bath2:'Baño dormitorio 2',guestbath:'Baño de visitas',laundry:'Logia',garden:'Hacia el jardín',aerial:'Vista aérea',rear:'Vista posterior'} as Record<string,string>)[view]||'Casa de referencia'} <span>14,51 × 13,41 m</span></div>
  {menu&&<aside className="rh-menu"><div className="rh-menu-head"><h2>Explorar la casa</h2><button aria-label="Cerrar capas" onClick={()=>setMenu(false)}>✕</button></div>
   <details open><summary>Cámaras y recorrido</summary><nav className="rh-camera-grid" aria-label="Cámaras y planta">{[['exterior','Exterior'],['inside','Living'],['dining','Comedor'],['kitchen','Cocina'],['primary-bedroom','Principal'],['primary-bath','Baño ppal.'],['bedroom2','Hab. 2'],['bath2','Baño hab. 2'],['guestbath','Visitas'],['laundry','Logia'],['garden','Jardín'],['rear','Posterior'],['aerial','Aérea']].map(([id,title])=><button key={id} disabled={!!error} aria-pressed={!plan&&view===id} onClick={()=>{cameraView(id);setMenu(false)}}>{title}</button>)}<button aria-pressed={plan} onClick={()=>{setTour(false);api.current?.tour(false);setPlan(!plan)}}>Planta 2D</button><button aria-pressed={dimensions} onClick={()=>setDimensions(!dimensions)}>Medidas</button><button disabled={!!error} aria-pressed={tour} onClick={startTour}>{tour?'Detener':'Recorrido automático'}</button></nav></details>
   <details open={selected!==null||undefined}><summary>Capas y vista explotada</summary><div className="rh-camera-grid">{[["finished","Terminada"],["structure","Estructura"],["interior","Corte interior"],["explode","Despiece"]].map(([id,name])=><button key={id} disabled={!!error} onClick={()=>inspect(id)}>{name}</button>)}</div><div className="rh-slider"><label htmlFor="explode">Separación <strong>{explosion}%</strong></label><input id="explode" aria-label="Separar capas" type="range" min="0" max="100" value={explosion} disabled={plan||!!error} onChange={e=>{setTour(false);api.current?.tour(false);setExplosion(Number(e.target.value))}}/></div>
   <p>{plan?'La planta 2D muestra la distribución. Las capas se separan y ocultan en las vistas 3D.':'Señala o toca una pieza para identificarla. Marca las capas que quieres ver.'}</p>
   {layers.map(([name,color],i)=><div className="rh-layer" key={name} data-selected={selected===i}><label><input type="checkbox" checked={visible[i]} onChange={e=>setVisible(v=>v.map((x,j)=>j===i?e.target.checked:x))}/><i style={{background:color}}/><span>{String(i+1).padStart(2,'0')} · {name}</span></label><button aria-label={'Información de '+name} onClick={()=>setSelected(selected===i?null:i)}>ⓘ</button></div>)}
   {selected!==null&&<section className="rh-detail"><strong>{layers[selected][0]}</strong><p>{layers[selected][2]}</p><button onClick={()=>setVisible(layers.map((_,i)=>i===selected))}>Aislar esta capa</button></section>}
   <div className="rh-actions"><button onClick={()=>setVisible(layers.map(()=>true))}>Ver todas</button><button onClick={()=>setVisible(v=>v.map((x,i)=>i>=8||i===6?false:x))}>Retirar techo y cielo</button></div>
   </details><details><summary>Movimiento y calidad</summary><label className="rh-quality">Calidad<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="balanced">Equilibrada · sombras suaves</option><option value="light">Ligera · mayor fluidez</option></select></label><p>Arrastra para girar. Pellizca para acercar. Usa dos dedos para desplazar. El movimiento manual pausa el recorrido.</p></details><details><summary>Medidas y alcance</summary><p>Cotas generales copiadas de la imagen: 14,51 × 13,41 m. Los 165 m² son el dato publicado en ella; no se calculan multiplicando esas cotas, que abarcan espacios exteriores. Distribución, alturas y espesores modelados son aproximados.</p><p>La referencia combina un frontón central con faldones laterales. Se conserva esa silueta; la fotografía no permite confirmar una cubierta de exactamente tres faldones.</p><p>Es un modelo conceptual, no un plano de ejecución ni un cálculo estructural.</p></details>
   <button className="rh-previous" onClick={reset}>Restablecer casa</button>
  </aside>}
  {hover!==null&&!menu&&!plan&&<output className="rh-hover">{String(hover+1).padStart(2,'0')} · {layers[hover][0]} · Toca para inspeccionar</output>}
  {error&&<div className="rh-error" role="status">{error}<button onClick={()=>{setPlan(false);setRetry(x=>x+1)}}>Reintentar 3D</button></div>}
  {!ready&&!error&&<div className="rh-loading" role="status"><div className="rh-load-card"><span className="rh-load-mark">F</span><small>FABRICK · RECORRIDO VIRTUAL</small><h1>Preparamos tu visita</h1><p>{['Cargando el motor del visor','Construyendo materiales y espacios','Organizando capas y mobiliario','Preparando cámaras e iluminación'][loadStep]}</p><div className="rh-load-track"><i style={{width:((loadStep+1)/4*100)+'%'}}/></div><ol>{['Motor','Casa','Capas','Cámaras'].map((label,i)=><li key={label} data-done={i<=loadStep}>{i<loadStep?'✓':i+1} {label}</li>)}</ol><p className="rh-load-tip">Gira la casa, recorre sus ambientes y descubre cada capa.</p></div></div>}
  <footer className="rh-dock"><button aria-label="Cámara anterior" disabled={!!error} onClick={()=>nextCamera(-1)}>‹</button><button disabled={!!error} aria-pressed={tour} onClick={startTour}>{tour?'Ⅱ Pausar':'▷ Recorrer'}</button><button aria-label="Cámara siguiente" disabled={!!error} onClick={()=>nextCamera(1)}>›</button><button aria-label="Acercar" disabled={plan||!!error} onClick={()=>api.current?.zoom(.85)}>＋</button><button aria-label="Alejar" disabled={plan||!!error} onClick={()=>api.current?.zoom(1.18)}>−</button><button onClick={()=>{setMenu(true)}}>Ajustes</button></footer>

 </main>;
}
