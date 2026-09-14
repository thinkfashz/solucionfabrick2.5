"use client";

import { useEffect, useRef, useState } from "react";
import type * as Three from "three";

type Vec = [number, number, number];
const views: { name: string; position: Vec; target: Vec; photo: string }[] = [
  { name: "Entrada · living", position: [-4,1.65,3.8], target: [-3,1.2,0], photo: "01-entrada-living" },
  { name: "Sala", position: [-.3,1.65,1.8], target: [-4,1,1.2], photo: "02-sala-principal" },
  { name: "Comedor", position: [-4,1.65,-.7], target: [-2,1,-2.5], photo: "03-comedor" },
  { name: "Pasillo", position: [2,1.65,3.8], target: [2,1.6,-4], photo: "04-pasillo-habitaciones" },
  { name: "Dormitorio", position: [4,1.65,3.6], target: [4.6,1,1.8], photo: "05-dormitorio-principal" },
  { name: "Baño", position: [4,1.65,-3.1], target: [5.3,1,-4.3], photo: "06-bano" },
  { name: "Cocina", position: [-.1,1.65,-2.6], target: [-3,1,-4.4], photo: "07-cocina" },
  { name: "Hacia el jardín", position: [-4.5,1.65,2.6], target: [-4.5,1.6,6], photo: "08-vista-exterior" },
];
const photoUrl = (i: number) => "https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_2048,q_auto/soluciones-fabrick/recorrido-interior-360/" + views[i].photo + ".webp";
type Engine = { select: (i: number) => void; pause: (v: boolean) => void; photo: (v: boolean) => void; security: (v: boolean) => void; tour: (v: boolean) => void; light: () => void; zoom: (n: number) => void; move: (x:number,z:number) => void; turn: (n:number) => void };

export default function Walkthrough() {
  const host = useRef<HTMLDivElement>(null);
  const inset = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [status,setStatus] = useState("Preparando la vivienda…");
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [selected,setSelected] = useState(0);
  const [paused,setPaused] = useState(false);
  const [photo,setPhoto] = useState(false);
  const [security,setSecurity] = useState(true);
  const [tour,setTour] = useState(false);
  const [menu,setMenu] = useState(false);
  const [notice,setNotice] = useState("");
  const [action,setAction] = useState("");
  const [position,setPosition] = useState("-4.0 / 3.8");

  useEffect(() => {
    let disposed=false;
    let cleanup=()=>{};
    setError(""); setStatus("Preparando la vivienda…");
    setPhoto(false);setTour(false);setPaused(false);setSelected(0);setSecurity(true);
    import("three").then(THREE => {
      if(disposed || !host.current) return;
      const container=host.current;
      const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"default"});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.25));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.setClearColor("#b5c6c9");
      container.appendChild(renderer.domElement);
      renderer.domElement.style.touchAction="none";
      renderer.domElement.setAttribute("aria-label","Vivienda 3D: arrastra para mirar");
      renderer.domElement.setAttribute("role","img");
      const scene=new THREE.Scene();
      const house=new THREE.Group();scene.add(house);
      const camera=new THREE.PerspectiveCamera(68,1,.08,90);
      const securityCamera=new THREE.PerspectiveCamera(64,1,.1,90);
      securityCamera.position.set(0,15,10);securityCamera.lookAt(0,0,0);
      const marker=new THREE.Mesh(new THREE.ConeGeometry(.2,.5,10),new THREE.MeshBasicMaterial({color:"#ef4444"}));
      scene.add(marker);
      const hemi=new THREE.HemisphereLight("#f3f5ff","#847660",2.5);scene.add(hemi);
      const sun=new THREE.DirectionalLight("#fff0d7",2.4);sun.position.set(-4,9,5);scene.add(sun);
      const lights: Three.PointLight[]=[];
      const materials: Three.Material[]=[];
      const meshes: Three.Mesh[]=[];
      const colliders: {x:number;z:number;w:number;d:number}[]=[];
      const interact: Three.Mesh[]=[];
      const doors: {pivot:Three.Group;open:boolean;angle:number;collider:{x:number;z:number;w:number;d:number}}[]=[];
      function box(p:Vec,s:Vec,color:string,parent:Three.Object3D=house,solid=false) {
        const material=new THREE.MeshStandardMaterial({color,roughness:.82});materials.push(material);
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(...s),material);mesh.position.set(...p);parent.add(mesh);meshes.push(mesh);
        if(solid)colliders.push({x:p[0],z:p[2],w:s[0]/2+.22,d:s[2]/2+.22});
        return mesh;
      }
      const wall=(x:number,z:number,w:number,d:number)=>box([x,1.4,z],[w,2.8,d],"#eee9df",house,true);
      // Continuous floor plan: social area, corridor and two rooms with actual openings.
      box([0,-.12,0],[12.4,.24,10.4],"#8e9188");
      box([0,.02,0],[12,.05,10],"#d6cbbb");
      box([0,-.27,0],[65,.15,65],"#778b65",scene);
      wall(-6,0,.16,10);wall(6,0,.16,10);wall(0,-5,12,.16);
      wall(-5.7,5,.6,.16);wall(-1.35,5,4.7,.16);wall(4.5,5,3,.16);
      box([-4.25,.48,5],[2.3,.95,.16],"#eee9df");box([-4.25,2.65,5],[2.3,.3,.16],"#eee9df");
      const pane=box([-4.25,1.7,5],[2.3,1.5,.05],"#a3c7d0");
      (pane.material as Three.MeshStandardMaterial).transparent=true;(pane.material as Three.MeshStandardMaterial).opacity=.2;
      for(const x of [-5.4,-4.25,-3.1])box([x,1.7,4.96],[.06,1.6,.07],"#343e3c");
      box([-4.25,.88,4.96],[2.4,.06,.07],"#343e3c");box([-4.25,2.5,4.96],[2.4,.06,.07],"#343e3c");
      // Door opening at z=3 in the dividing wall.
      wall(1,-1.3,.14,7.4);wall(1,4.3,.14,1.4);box([1,2.5,3],[.14,.6,1.2],"#eee9df");
      wall(3,-4.3,.14,1.4);wall(3,-.6,.14,3.6);wall(3,3.7,.14,2.6);
      box([3,2.5,-3],[.14,.6,1.2],"#eee9df");box([3,2.5,1.8],[.14,.6,1.2],"#eee9df");
      wall(4.5,-1.5,3,.14);
      // Exterior deck, shrubs and distant silhouettes visible through the window.
      box([-3,.02,7],[6,.12,3],"#ad8860",scene);
      for(let i=0;i<9;i++)box([-12+i*3,1.4,13],[1.3,2.8,1.3],"#536c48",scene);
      // Furniture leaves a clear circulation route.
      box([-4,.4,1],[2.7,.65,1],"#738179",house,true);
      box([-4,.95,.55],[2.7,.9,.22],"#65756d");
      for(const x of [-5.4,-2.6])box([x,.65,1],[.2,.6,1],"#65756d");
      box([-3.5,.32,2.45],[1.3,.55,.6],"#b08b61",house,true);
      box([-1.2,1.25,.1],[.07,.85,1.4],"#293832");box([-1.2,.35,.1],[.4,.6,1.8],"#aa855c");
      box([-3, .82,-2.3],[2.1,.12,1.2],"#a47c50",house,true);
      for(const x of [-3.8,-2.2])for(const z of [-2.7,-1.9])box([x,.4,z],[.08,.8,.08],"#393f38");
      for(const x of [-3.7,-2.3])for(const z of [-3.25,-1.35]){box([x,.47,z],[.45,.12,.45],"#917350");box([x,.8,z+(z<-2?-.2:.2)],[.45,.65,.07],"#917350");}
      box([-2.7,.47,-4.55],[4.5,.9,.7],"#7b897b",house,true);box([-2.7,.96,-4.55],[4.6,.08,.76],"#f2e7d5");
      for(let x=-4.7;x<-.4;x+=.75){box([x,.5,-4.18],[.02,.8,.03],"#46594b");box([x+.3,.76,-4.14],[.23,.025,.04],"#d6c29b");}
      box([-3.9,1.01,-4.5],[.8,.025,.43],"#444e4a");box([-3.9,1.22,-4.75],[.04,.4,.04],"#aeb6af");
      box([-1,1,-4.5],[.8,.03,.5],"#292e2b");
      box([-5.45,1,-4.4],[.8,2,.8],"#c8ccc3",house,true);
      box([4.8,.35,.1],[1.65,.6,2.25],"#b49a7d",house,true);box([4.8,.71,.1],[1.65,.13,2.2],"#e5d9c4");
      box([4.8,.86,-.55],[1.25,.15,.4],"#fff7e8");box([4.8,1,-1.05],[1.8,1.5,.12],"#a27e53");
      box([5.45,.45,3.9],[.7,.9,1.3],"#b89b72",house,true);
      box([4.4,.35,-4.3],[.65,.65,.7],"#f7f4e9",house,true);box([4.4,.8,-4.6],[.62,.6,.17],"#f7f4e9");
      box([5.45,.52,-2.1],[.8,1,.6],"#bdab92",house,true);box([5.45,1.03,-2.1],[.8,.07,.65],"#f5f1e7");
      box([5.89,1.7,-2.1],[.04,.85,.6],"#a8c5c4");
      function door(z:number) {
        const pivot=new THREE.Group();pivot.position.set(3,0,z-.55);house.add(pivot);
        const leaf=box([0,1.08,.55],[.08,2.16,1.1],"#a7835d",pivot);
        const handle=box([-.09,1.02,.97],[.2,.04,.04],"#313d36",pivot);
        const d={pivot,open:true,angle:-Math.PI/2,collider:{x:3,z,w:.27,d:.77}};
        pivot.rotation.y=d.angle;doors.push(d);
        for(const m of [leaf,handle]){m.userData.action=()=>{d.open=!d.open;setAction(d.open?"Puerta abierta":"Puerta cerrada")};interact.push(m)}
      }
      door(1.8);door(-3);
      for(const p of [[-3,2.6,1],[-2,2.6,-3],[4.5,2.6,1],[4.5,2.6,-3]] as Vec[]){
        const light=new THREE.PointLight("#ffdda7",3.5,7,2);light.position.set(...p);house.add(light);lights.push(light);
        const bulb=box(p,[.24,.08,.24],"#ffe2a0");
        bulb.userData.action=()=>{light.intensity=light.intensity?0:3.5;setAction(light.intensity?"Luz encendida":"Luz apagada")};interact.push(bulb);
      }
      const panoScene=new THREE.Scene();
      const panoMaterial=new THREE.MeshBasicMaterial({side:THREE.BackSide,color:"#fff"});
      const panoSphere=new THREE.Mesh(new THREE.SphereGeometry(30,48,24),panoMaterial);panoSphere.scale.x=-1;panoScene.add(panoSphere);
      let photoMode=false,photoRequest=0,photoTexture:Three.Texture|undefined;
      let paused=false,tour=false,cctv=true,view=0,yaw=0,pitch=0,moveX=0,moveZ=0,elapsed=0;
      let dragging:number|null=null,lastX=0,lastY=0,travel=0,frame=0,last=0,lastUi=0,lost=false;
      const keys=new Set<string>();const ray=new THREE.Raycaster();const direction=new THREE.Vector3();
      function resetInput(){keys.clear();moveX=0;moveZ=0;dragging=null}
      function select(i:number){
        view=i;camera.position.set(...views[i].position);camera.lookAt(...views[i].target);
        camera.rotation.order="YXZ";yaw=camera.rotation.y;pitch=camera.rotation.x;
        camera.fov=68;camera.updateProjectionMatrix();setSelected(i);resetInput();elapsed=0;
        if(photoMode)loadPhoto();
      }
      function loadPhoto(){
        const request=++photoRequest;setStatus("Cargando panorama…");
        new THREE.TextureLoader().load(photoUrl(view),texture=>{
          if(disposed||request!==photoRequest){texture.dispose();return}
          texture.colorSpace=THREE.SRGBColorSpace;photoTexture?.dispose();photoTexture=texture;
          panoMaterial.map=texture;panoMaterial.needsUpdate=true;setStatus("");
        },undefined,()=>{
          if(disposed||request!==photoRequest)return;
          photoMode=false;setPhoto(false);setStatus("");setNotice("No se pudo cargar esta fotografía. El modelo 3D sigue disponible.");
        });
      }
      const isBlocked=(x:number,z:number)=>{
        if(Math.abs(x)>5.7||Math.abs(z)>4.7)return true;
        const hit=(c:{x:number;z:number;w:number;d:number})=>Math.abs(x-c.x)<c.w&&Math.abs(z-c.z)<c.d;
        return colliders.some(hit)||doors.some(d=>!d.open&&hit(d.collider));
      };
      function down(e:PointerEvent){if(paused||tour)return;dragging=e.pointerId;lastX=e.clientX;lastY=e.clientY;travel=0;renderer.domElement.setPointerCapture(e.pointerId)}
      function drag(e:PointerEvent){if(dragging!==e.pointerId||paused)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;travel+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.2,1.2);lastX=e.clientX;lastY=e.clientY}
      function up(e:PointerEvent){
        if(dragging!==e.pointerId)return;dragging=null;
        if(travel<8&&!photoMode&&!paused){
          const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
          const hit=ray.intersectObjects(house.children,true)[0];
          if(hit&&hit.distance<3&&hit.object.userData.action)hit.object.userData.action();
        }
      }
      const keyDown=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest("button,select,input,a"))return;if(["KeyW","KeyS","KeyA","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)){e.preventDefault();keys.add(e.code)}};
      const keyUp=(e:KeyboardEvent)=>keys.delete(e.code);
      const hidden=()=>{if(document.hidden){paused=true;setPaused(true);resetInput()}};
      const contextLost=(e:Event)=>{e.preventDefault();lost=true;resetInput();setError("El navegador perdió el contexto gráfico. Pulsa Reiniciar visor para recuperarlo.")};
      const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix()};
      const observer=new ResizeObserver(resize);observer.observe(container);
      renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",drag);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",resetInput);
      renderer.domElement.addEventListener("webglcontextlost",contextLost);
      window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp);window.addEventListener("blur",resetInput);document.addEventListener("visibilitychange",hidden);
      engine.current={
        select, pause(v){paused=v;resetInput()},photo(v){photoMode=v;resetInput();tour=false;setTour(false);photoRequest++;setStatus("");if(v)loadPhoto();else select(view)},
        security(v){cctv=v},tour(v){tour=v;elapsed=0;resetInput()},light(){lights.forEach(l=>l.intensity=l.intensity?0:3.5)},
        zoom(n){camera.fov=THREE.MathUtils.clamp(camera.fov+n,35,85);camera.updateProjectionMatrix()},
        move(x,z){if(!paused&&!photoMode&&!tour){moveX=x;moveZ=z}},turn(n){if(!paused&&!tour)yaw+=n}
      };
      select(0);resize();
      function render(now:number){
        if(disposed||lost)return;
        frame=requestAnimationFrame(render);
        if(now-last<33)return;
        const dt=Math.min((now-last)/1000,.05);last=now;
        if(!paused){
          if(tour){elapsed+=dt;yaw-=dt*.045;if(elapsed>7)select((view+1)%views.length)}
          if(!photoMode&&!tour){
            const f=moveZ+(keys.has("KeyW")||keys.has("ArrowUp")?1:0)-(keys.has("KeyS")||keys.has("ArrowDown")?1:0);
            const r=moveX+(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);
            if(keys.has("ArrowLeft"))yaw+=dt*1.3;if(keys.has("ArrowRight"))yaw-=dt*1.3;
            const norm=Math.max(1,Math.hypot(f,r)),speed=dt*2;
            const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed/norm,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed/norm;
            if(!isBlocked(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
            if(!isBlocked(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
            camera.position.y=1.65;
          }
          doors.forEach(d=>d.pivot.rotation.y=THREE.MathUtils.damp(d.pivot.rotation.y,d.open?d.angle:0,10,dt));
        }
        camera.rotation.set(pitch,yaw,0,"YXZ");
        const w=container.clientWidth,h=container.clientHeight;
        renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);marker.visible=false;
        if(photoMode){
          panoSphere.position.copy(camera.position);renderer.render(panoScene,camera);
        }else renderer.render(scene,camera);
        if(cctv&&!photoMode&&inset.current){
          const r=inset.current.getBoundingClientRect(),root=container.getBoundingClientRect();
          const x=r.left-root.left,y=h-(r.bottom-root.top);
          renderer.setViewport(x,y,r.width,r.height);renderer.setScissor(x,y,r.width,r.height);renderer.setScissorTest(true);renderer.clearDepth();
          securityCamera.aspect=r.width/r.height;securityCamera.updateProjectionMatrix();
          marker.position.set(camera.position.x,3.4,camera.position.z);marker.visible=true;
          renderer.render(scene,securityCamera);marker.visible=false;renderer.setScissorTest(false);
        }
        if(now-lastUi>500){setPosition(camera.position.x.toFixed(1)+" / "+camera.position.z.toFixed(1));lastUi=now}
      }
      frame=requestAnimationFrame(render);setStatus("");
      cleanup=()=>{
        cancelAnimationFrame(frame);observer.disconnect();photoRequest++;resetInput();engine.current=null;
        window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp);window.removeEventListener("blur",resetInput);document.removeEventListener("visibilitychange",hidden);
        renderer.domElement.removeEventListener("webglcontextlost",contextLost);
        renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",drag);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",resetInput);
        meshes.forEach(m=>m.geometry.dispose());materials.forEach(m=>m.dispose());panoSphere.geometry.dispose();panoMaterial.dispose();photoTexture?.dispose();marker.geometry.dispose();(marker.material as Three.Material).dispose();
        renderer.dispose();renderer.domElement.remove();
      };
    }).catch(e=>{if(!disposed){setError("No se pudo iniciar el visor 3D. "+(e instanceof Error?e.message:"Prueba reiniciar el visor."));setStatus("")}});
    return()=>{disposed=true;cleanup()};
  },[retry]);

  const choose=(i:number)=>{setTour(false);engine.current?.tour(false);engine.current?.select(i);setNotice("")};
  const stop=()=>engine.current?.move(0,0);
  const pad=(label:string,x:number,z:number,symbol:string)=><button aria-label={label} disabled={paused||photo||tour} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.move(x,z)}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>{symbol}</button>;
  return <main className="fw">
    <div ref={host} className="fw-scene"/>
    <header className="fw-top"><a href="/herramientas/metalcon">← Volver</a><strong>FABRICK <span>HOME</span></strong><button onClick={()=>setMenu(!menu)} aria-expanded={menu}>☰ Menú</button></header>
    <div className="fw-title"><small>{photo?"PANORAMA FOTOGRÁFICO":"RECORRIDO INTERACTIVO · MODELO CONCEPTUAL"}</small><h1>{views[selected].name}</h1><span>{String(selected+1).padStart(2,"0")} / 08 · {paused?"En pausa":tour?"Secuencia de cámaras":"Exploración libre"}</span></div>
    <nav className="fw-views" aria-label="Vistas de la vivienda">{views.map((v,i)=><button key={v.name} onClick={()=>choose(i)} aria-pressed={selected===i}>{String(i+1).padStart(2,"0")} {v.name}</button>)}</nav>
    {menu&&<aside className="fw-menu"><h2>Opciones del recorrido</h2><button onClick={()=>{engine.current?.light()}}>Encender / apagar luces</button><button onClick={()=>{engine.current?.security(!security);setSecurity(!security)}}>{security?"Ocultar":"Mostrar"} cámara de seguridad</button><button onClick={()=>choose(0)}>Volver a la entrada</button><p>Modelo conceptual hecho en Three.js. Las fotografías son referencias 360; no son una reconstrucción de Blender.</p><p>Calidad ligera · sin sombras dinámicas · una sola escena gráfica.</p></aside>}
    {!photo&&security&&!error&&<aside className="fw-security"><div>● CAM 01 · VISTA ELEVADA <span>SIMULACIÓN</span></div><div ref={inset} className="fw-inset"/><small>El marcador rojo indica tu posición · {position}</small></aside>}
    <div className="fw-toolbar">
      <button onClick={()=>{setPaused(!paused);engine.current?.pause(!paused)}}>{paused?"▶ Continuar":"Ⅱ Pausar"}</button>
      <button aria-pressed={tour} disabled={photo} onClick={()=>{setTour(!tour);setPaused(false);engine.current?.pause(false);engine.current?.tour(!tour)}}>{tour?"■ Detener recorrido":"▶ Recorrido de cámaras"}</button>
      <button aria-pressed={photo} onClick={()=>{setPhoto(!photo);setTour(false);engine.current?.photo(!photo)}}>{photo?"Volver al modelo 3D":"Ver foto 360"}</button>
    </div>
    <div className="fw-controls">
      <div className="fw-pad"><small>CAMINAR</small><div><span/>{pad("Avanzar",0,1,"↑")}<span/>{pad("Mover izquierda",-1,0,"←")}{pad("Retroceder",0,-1,"↓")}{pad("Mover derecha",1,0,"→")}</div></div>
      <p className="fw-help">Arrastra para mirar · WASD para caminar<br/>Toca puertas o luces a menos de 3 m</p>
      <div className="fw-look"><small>MIRAR / ZOOM</small><div><button aria-label="Girar izquierda" onClick={()=>engine.current?.turn(.3)}>↶</button><button aria-label="Girar derecha" onClick={()=>engine.current?.turn(-.3)}>↷</button></div><div><button aria-label="Acercar vista" onClick={()=>engine.current?.zoom(-5)}>＋</button><button aria-label="Alejar vista" onClick={()=>engine.current?.zoom(5)}>−</button></div></div>
    </div>
    {action&&<output className="fw-action" onClick={()=>setAction("")}>{action}</output>}
    {notice&&<div className="fw-notice" role="alert">{notice}<button onClick={()=>setNotice("")}>Cerrar</button></div>}
    {(status||error)&&<div className="fw-loading" role="status"><strong>{error?"No se pudo mostrar el recorrido":status}</strong>{error&&<><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>Reiniciar visor</button><a href={photoUrl(selected)} target="_blank" rel="noreferrer">Abrir fotografía de referencia</a></>}</div>}
    <style>{`
      .fw{position:fixed;inset:0;z-index:10000;background:#b5c6c9;color:#f7f5ee;font-family:system-ui,sans-serif;isolation:isolate;overflow:hidden}
      .fw *{box-sizing:border-box}.fw button,.fw a{min-height:42px;border:1px solid #ffffff36;background:#172923ed;color:#fff;border-radius:14px;padding:9px 13px;text-decoration:none;font:inherit;cursor:pointer;touch-action:none}
      .fw button:focus-visible,.fw a:focus-visible{outline:3px solid #ffd66c;outline-offset:2px}.fw button:disabled{opacity:.4;cursor:default}.fw button[aria-pressed=true]{background:#ffd36a;color:#17251f}.fw-scene{position:absolute;inset:0}.fw-top{position:absolute;top:max(12px,env(safe-area-inset-top));left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}.fw-top strong{letter-spacing:.15em;text-shadow:0 2px 8px #000}.fw-top span{color:#ffd36a}
      .fw-title{position:absolute;top:82px;left:20px;background:#172923e8;border:1px solid #ffffff30;border-radius:18px;padding:14px 18px;pointer-events:none}.fw-title h1{font-size:24px;line-height:1.25;margin:5px 0}.fw-title small{font-size:9px;letter-spacing:.14em;color:#ffd36a}.fw-title span{font-size:12px;color:#cad9cf}.fw-views{position:absolute;top:193px;left:20px;right:20px;display:flex;gap:6px;overflow:auto;padding-bottom:5px}.fw-views button{white-space:nowrap;font-size:12px}
      .fw-menu{position:absolute;z-index:4;top:66px;right:16px;width:min(330px,calc(100% - 32px));max-height:65%;overflow:auto;background:#16251ff5;border:1px solid #ffffff40;border-radius:18px;padding:18px;box-shadow:0 10px 40px #0005}.fw-menu h2{font-size:18px}.fw-menu button{display:block;width:100%;margin:8px 0;text-align:left}.fw-menu p{font-size:12px;line-height:1.5;color:#d0dace}
      .fw-security{position:absolute;right:20px;bottom:215px;width:230px;border:2px solid #ffffff90;border-radius:12px;overflow:hidden;pointer-events:none;background:transparent}.fw-security>div:first-child,.fw-security small{display:block;background:#172923ed;padding:6px 8px;font-size:9px;letter-spacing:.03em}.fw-security span{float:right;color:#ffd36a;font-size:8px}.fw-inset{height:130px}.fw-security small{font-size:9px}
      .fw-toolbar{position:absolute;bottom:155px;left:20px;right:20px;display:flex;justify-content:center;gap:8px}.fw-toolbar button{font-size:12px;white-space:nowrap}
      .fw-controls{position:absolute;bottom:max(14px,env(safe-area-inset-bottom));left:20px;right:20px;display:flex;align-items:end;justify-content:space-between;pointer-events:none}.fw-controls button{pointer-events:auto;width:46px;height:43px;font-size:21px;padding:5px;background:#172923f5}.fw-controls small{display:block;font-size:9px;letter-spacing:.12em;text-align:center;background:#172923e8;border-radius:6px;padding:3px}.fw-pad>div{display:grid;grid-template-columns:repeat(3,46px);gap:4px}.fw-look>div{display:flex;gap:4px;margin-top:4px}.fw-help{background:#172923ed;border-radius:12px;padding:8px 12px;text-align:center;font-size:12px;color:#e5ede4}
      .fw-action{position:absolute;top:250px;left:20px;background:#172923ef;border-radius:12px;padding:8px 12px;font-size:13px}.fw-notice{position:absolute;z-index:6;top:35%;left:8%;right:8%;background:#172923f5;padding:22px;border-radius:18px}.fw-notice button{margin-left:10px}.fw-loading{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#152a23f5;padding:30px;text-align:center;gap:16px}.fw-loading strong{font-size:22px;color:#ffd36a}
      @media(max-width:600px){.fw-title{top:72px;left:12px;padding:10px 13px}.fw-title h1{font-size:19px}.fw-title small{font-size:8px}.fw-top{left:12px;right:12px}.fw-top strong{font-size:12px}.fw-top button,.fw-top a{font-size:12px}.fw-views{top:168px;left:12px;right:12px}.fw-security{width:154px;right:12px;bottom:215px}.fw-inset{height:88px}.fw-security span{display:none}.fw-security small{font-size:8px}.fw-toolbar{left:10px;right:10px;gap:5px;bottom:145px}.fw-toolbar button{font-size:10px;padding:8px}.fw-controls{left:12px;right:12px}.fw-help{display:none}}
      @media(max-height:500px){.fw-title{top:65px}.fw-views{top:155px;right:200px}.fw-security{top:65px;bottom:auto;width:170px}.fw-inset{height:95px}.fw-toolbar{bottom:18px;left:175px;right:125px}.fw-help{display:none}.fw-title small{display:none}}
    `}</style>
  </main>;
}
