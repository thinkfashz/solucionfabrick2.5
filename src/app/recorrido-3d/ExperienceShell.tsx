"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReferenceHouse from "./ReferenceHouse";
import { materialById } from "./material-catalog";
import "./experience-shell.css";

type LightMode = "day" | "sunset" | "night";
type Soil = "rock" | "firm" | "soft";
type Motion = "horizontal" | "vertical" | "mixed";
type LabTab = "quake" | "light" | "technical" | "controls";

type MaterialInfo = { id?: string; material: string; place: string; note: string };
type AreaInfo = { title: string; subtitle: string; materials: MaterialInfo[] };
type TechnicalMode = "architecture" | "structure" | "electric" | "water" | "sanitary" | "underfloor" | "stage";

const BRAND = {
  yellow: "#FFE600",
  yellow2: "#FFD400",
  yellowLight: "#FFF45C",
  ink: "#08090A",
  navy: "#07182D",
  blue: "#1F6FB2",
  white: "#F7FAFC",
};

const AMBIENCE = {
  day: "https://res.cloudinary.com/disghf6xc/video/upload/v1789745214/fabrick/recorrido-3d/audio/forest-day-public-domain.ogg",
  night: "https://res.cloudinary.com/disghf6xc/video/upload/v1789745295/fabrick/recorrido-3d/audio/night-cicadas-cc0.ogg",
} as const;

const CAMERAS = [
  ["Exterior", "Casa de referencia", "exterior"],
  ["Living", "Living", "inside"],
  ["Comedor", "Comedor", "dining"],
  ["Cocina", "Cocina", "kitchen"],
  ["Principal", "Dormitorio principal", "primary-bedroom"],
  ["Baño ppal.", "Baño principal", "primary-bath"],
  ["Hab. 2", "Dormitorio 2", "bedroom2"],
  ["Baño hab. 2", "Baño dormitorio 2", "bath2"],
  ["Visitas", "Baño de visitas", "guestbath"],
  ["Logia", "Logia", "laundry"],
  ["Jardín", "Hacia el jardín", "garden"],
  ["Posterior", "Vista posterior", "rear"],
  ["Aérea", "Vista aérea", "aerial"],
] as const;

const CAMERA_GROUPS = [
  { title: "Exterior", note: "Volumen, fachada y entorno", ids: [0,10,11,12] },
  { title: "Zona social", note: "Espacios de uso diario", ids: [1,2,3] },
  { title: "Zona privada", note: "Dormitorios y baños", ids: [4,5,6,7] },
  { title: "Servicio", note: "Apoyo y visitas", ids: [8,9] },
] as const;

type DamageId = "roof"|"cornices"|"windows"|"walls"|"foundation"|"sanitary";
const DAMAGE_META: Record<DamageId,{label:string;location:string;check:string}> = {
  roof:{label:"Techumbre",location:"Encuentros y cubierta",check:"Revisar fijaciones, apoyos y encuentros de cubierta."},
  cornices:{label:"Cornisas / encuentros",location:"Uniones superiores",check:"Revisar separaciones, fisuras y continuidad de encuentros."},
  windows:{label:"Ventanas",location:"Vanos y marcos",check:"Revisar marco, sello y encuentro muro–vano."},
  walls:{label:"Muros / uniones",location:"Tabiques y esquinas",check:"Revisar uniones, fisuras y desplazamientos visibles."},
  foundation:{label:"Fundación",location:"Base / radier",check:"Revisar asentamientos, fisuras y continuidad del apoyo."},
  sanitary:{label:"Red sanitaria",location:"Bajo piso",check:"Revisar uniones, pendientes y posibles pérdidas."},
};

function SwipeDamage({id,label,score,onDismiss,onOpen}:{id:DamageId;label:string;score:number;onDismiss:(id:DamageId)=>void;onOpen:(id:DamageId)=>void}) {
  const root=useRef<HTMLElement>(null),start=useRef(0),distance=useRef(0),dragging=useRef(false);
  const reset=(dismiss=false)=>{
    const node=root.current;if(!node)return;
    const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(dismiss){
      const dir=distance.current>=0?1:-1;
      if(reduce){onDismiss(id);return}
      node.animate(
        [{transform:`translateX(${distance.current}px)`,opacity:Math.max(.3,1-Math.abs(distance.current)/180)},{transform:`translateX(${dir*118}%)`,opacity:0}],
        {duration:160,easing:"cubic-bezier(0.23, 1, 0.32, 1)",fill:"forwards"}
      ).finished.then(()=>onDismiss(id)).catch(()=>onDismiss(id));
    }else{
      node.animate(
        [{transform:`translateX(${distance.current}px)`,opacity:Math.max(.3,1-Math.abs(distance.current)/180)},{transform:"translateX(0)",opacity:1}],
        {duration:160,easing:"cubic-bezier(0.23, 1, 0.32, 1)"}
      );
      node.style.transform="";node.style.opacity="";
    }
    distance.current=0;dragging.current=false;
  };
  return <article ref={root} className="sf-damage-toast" data-level={level(score).toLowerCase()}>
    <button className="sf-damage-toast-main" onClick={()=>{if(Math.abs(distance.current)<5)onOpen(id)}}
      onPointerDown={(e)=>{start.current=e.clientX;distance.current=0;dragging.current=true;e.currentTarget.setPointerCapture?.(e.pointerId)}}
      onPointerMove={(e)=>{if(!dragging.current||!root.current)return;distance.current=e.clientX-start.current;root.current.style.transform=`translateX(${distance.current}px)`;root.current.style.opacity=String(Math.max(.3,1-Math.abs(distance.current)/180))}}
      onPointerUp={()=>reset(Math.abs(distance.current)>64)} onPointerCancel={()=>reset(false)}>
      <span className="sf-damage-dot"/><div><strong>{label}</strong><small>{DAMAGE_META[id].location}</small></div><b>{level(score)}</b>
    </button>
    <button className="sf-damage-dismiss" aria-label={"Descartar "+label} onClick={()=>onDismiss(id)}>×</button>
  </article>;
}


const AREA: Record<string, AreaInfo> = {
  "Casa de referencia": {
    title: "Exterior · envolvente",
    subtitle: "Fachada, cubierta, vanos y transición hacia terraza.",
    materials: [
      { id:"siding-fibrocemento", material:"Siding fibrocemento", place:"Fachadas", note:"Revestimiento exterior ventilado de referencia." },
      { id:"cubierta-metalica", material:"Cubierta metálica", place:"Techumbre", note:"Terminación oscura con rugosidad y reflejo controlados." },
      { material:"Vidrio + perfilería", place:"Vanos", note:"Cristal y marcos oscuros para conectar interior y exterior." },
      { id:"hormigon", material:"Hormigón", place:"Radier / acceso", note:"Base exterior, terraza y peldaños." },
    ],
  },
  Living: {
    title:"Living · zona social", subtitle:"Muros blancos, luz natural y conexión hacia terraza.",
    materials:[
      {id:"volcanita-st",material:"Yeso cartón ST",place:"Muros y cielos",note:"Terminación blanca mate sobre tabiquería seca."},
      {id:"porcelanato",material:"Porcelanato",place:"Piso",note:"Superficie continua y fácil de mantener."},
      {material:"Madera",place:"Mobiliario",note:"Contraste cálido con muros blancos."},
      {material:"Textil",place:"Sofá / alfombra",note:"Acabado mate de alta rugosidad."}
    ]
  },
  Comedor: {
    title:"Comedor · zona social",subtitle:"Mesa, luminaria y continuidad visual con cocina.",
    materials:[
      {material:"Madera",place:"Mesa / sillas",note:"Veta cálida y acabado semimate."},
      {material:"Metal oscuro",place:"Luminarias",note:"Cuerpos discretos para luz puntual."},
      {id:"porcelanato",material:"Porcelanato",place:"Piso",note:"Continuidad con living y cocina."},
      {material:"Vidrio",place:"Vanos",note:"Aporte de iluminación natural."}
    ]
  },
  Cocina: {
    title:"Cocina · trabajo y almacenamiento",subtitle:"Módulos bajos y altos, cubierta, refrigerador, lavaplatos y luz funcional.",
    materials:[
      {material:"Melamina / madera",place:"Muebles bajos y altos",note:"Frentes cálidos y modulares."},
      {material:"Piedra / cubierta mineral",place:"Mesón",note:"Plano de preparación de acabado claro."},
      {material:"Acero inoxidable",place:"Lavaplatos / grifería",note:"Superficie resistente y fácil de limpiar."},
      {material:"Herraje amortiguado 110°",place:"Puertas superiores",note:"Bisagra ajustable con cierre suave; apertura animada en el visor."},
      {id:"volcanita-st",material:"Yeso cartón",place:"Muros",note:"Fondo blanco neutro para aumentar luminosidad."}
    ]
  },
  "Dormitorio principal": {
    title:"Dormitorio principal",subtitle:"Zona privada asociada a baño principal.",
    materials:[
      {id:"volcanita-st",material:"Yeso cartón ST",place:"Muros",note:"Acabado blanco mate."},
      {material:"Madera",place:"Respaldo / veladores",note:"Acento cálido de baja saturación."},
      {material:"Textil",place:"Cama",note:"Superficie blanda con roughness alto."},
      {material:"Vidrio",place:"Ventana",note:"Iluminación natural y ventilación visual."}
    ]
  },
  "Baño principal": {
    title:"Baño principal",subtitle:"Zona húmeda vinculada al dormitorio principal.",
    materials:[
      {id:"volcanita-rh",material:"Yeso cartón RH",place:"Muros protegidos",note:"Placa para ambientes expuestos a humedad."},
      {id:"porcelanato",material:"Porcelanato / cerámica",place:"Piso y zona húmeda",note:"Superficie lavable."},
      {material:"Vidrio",place:"Mampara",note:"Transparencia y control de salpicaduras."},
      {material:"Acero",place:"Grifería",note:"Terminación metálica de uso sanitario."}
    ]
  },
  "Dormitorio 2": {
    title:"Dormitorio 2",subtitle:"Segunda habitación con baño asociado.",
    materials:[
      {id:"volcanita-st",material:"Yeso cartón ST",place:"Muros",note:"Acabado interior blanco y ligero."},
      {material:"Madera",place:"Mobiliario",note:"Muebles de escala residencial."},
      {material:"Textil",place:"Cama",note:"Acabado mate."}
    ]
  },
  "Baño dormitorio 2": {
    title:"Baño dormitorio 2",subtitle:"Segundo baño privado; independiente de la logia.",
    materials:[
      {id:"volcanita-rh",material:"Yeso cartón RH",place:"Muros",note:"Solución referencial para recinto húmedo."},
      {id:"porcelanato",material:"Porcelanato / cerámica",place:"Piso / muro",note:"Terminación lavable."},
      {id:"pvc-110",material:"PVC sanitario",place:"Descarga principal",note:"Trazado conceptual bajo piso."}
    ]
  },
  "Baño de visitas": {
    title:"Baño de visitas",subtitle:"Baño de apoyo en la zona pública.",
    materials:[
      {id:"volcanita-rh",material:"Yeso cartón RH",place:"Muros",note:"Revestimiento referencial para humedad."},
      {id:"porcelanato",material:"Porcelanato / cerámica",place:"Piso",note:"Terminación durable y lavable."},
      {material:"Acero",place:"Grifería",note:"Accesorios sanitarios."}
    ]
  },
  Logia: {
    title:"Logia · servicio",subtitle:"Lavado, apoyo de cocina y redes de agua; no corresponde a un baño.",
    materials:[
      {id:"volcanita-rh",material:"Yeso cartón RH",place:"Muros",note:"Adecuado como referencia en recinto de servicio con humedad."},
      {id:"porcelanato",material:"Porcelanato",place:"Piso",note:"Superficie lavable."},
      {material:"Agua fría/caliente",place:"Lavadora / lavadero",note:"Trazado técnico conceptual visible por capas."},
      {material:"PVC sanitario",id:"pvc-110",place:"Descarga",note:"Red sanitaria conceptual bajo radier."}
    ]
  },
  "Hacia el jardín": {
    title:"Jardín · paisaje",subtitle:"Transición vivienda–terreno y acceso exterior.",
    materials:[
      {material:"Pasto",place:"Terreno",note:"Cobertura vegetal de roughness alto."},
      {material:"Gravilla",place:"Senderos",note:"Árido de lectura irregular."},
      {id:"hormigon",material:"Hormigón",place:"Peldaños",note:"Base mineral mate."},
      {material:"Madera exterior",place:"Terraza",note:"Transición cálida hacia la vivienda."}
    ]
  },
  "Vista posterior": {
    title:"Posterior · envolvente",subtitle:"Vanos, revestimientos y encuentro con cubierta.",
    materials:[
      {id:"siding-fibrocemento",material:"Siding fibrocemento",place:"Muros",note:"Piel exterior de referencia."},
      {material:"Vidrio",place:"Vanos",note:"Aberturas y discontinuidades del muro."},
      {id:"cubierta-metalica",material:"Metal",place:"Cubierta",note:"Plano superior y aguas lluvia."}
    ]
  },
  "Vista aérea": {
    title:"Aérea · lectura completa",subtitle:"Volumetría, techumbre y relación de recintos.",
    materials:[
      {id:"cubierta-metalica",material:"Cubierta metálica",place:"Techos",note:"Encuentros, pendientes y bordes."},
      {id:"osb-estructural",material:"OSB",place:"Capas",note:"Visible en modo estructura/despiece."},
      {id:"metalcon",material:"Metalcon",place:"Estructura",note:"Entramado conceptual por capas."},
      {id:"hormigon",material:"Hormigón",place:"Base",note:"Implantación general de la vivienda."}
    ]
  }
};

const SOIL: Record<Soil, { label: string; factor: number; mmiBoost: number }> = {
  rock: { label: "Roca / suelo muy firme", factor: 0.78, mmiBoost: -0.7 },
  firm: { label: "Suelo firme", factor: 1, mmiBoost: 0 },
  soft: { label: "Suelo blando", factor: 1.22, mmiBoost: 0.8 },
};

const MMI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function estimateMmi(magnitude: number, depthKm: number, distanceKm: number, soil: Soil) {
  const hypocentralDistance = Math.sqrt(depthKm ** 2 + distanceKm ** 2);
  const distanceLoss = Math.log10(hypocentralDistance + 12) * 2.05;
  return Math.min(12, Math.max(1, 2.3 + (magnitude - 4) * 1.48 + (2.8 - distanceLoss) + SOIL[soil].mmiBoost));
}

function level(score: number) {
  if (score >= 0.76) return "Crítico";
  if (score >= 0.56) return "Alto";
  if (score >= 0.34) return "Moderado";
  return "Bajo";
}

function clickByText(selector: string, text: string) {
  const nodes = Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
  const button = nodes.find((node) => node.textContent?.trim() === text || node.getAttribute("aria-label") === text);
  button?.click();
  return Boolean(button);
}

export default function ExperienceShell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LabTab>("quake");
  const [infoOpen, setInfoOpen] = useState(false);
  const [light, setLight] = useState<LightMode>("day");
  const [exposure, setExposure] = useState(100);
  const [temperature, setTemperature] = useState(4200);
  const [interiorLights, setInteriorLights] = useState(true);
  const [exteriorLights, setExteriorLights] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [areaName, setAreaName] = useState("Casa de referencia");
  const [cameraIndex, setCameraIndex] = useState(0);
  const [cameraSheet, setCameraSheet] = useState(false);
  const cameraSheetRef = useRef<HTMLElement>(null);
  const cameraDragStart = useRef(0);
  const cameraDragY = useRef(0);
  const [dismissedDamage, setDismissedDamage] = useState<DamageId[]>([]);
  const [selectedDamage, setSelectedDamage] = useState<DamageId | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [technicalMode, setTechnicalMode] = useState<TechnicalMode>("architecture");
  const [constructionStage, setConstructionStage] = useState(12);
  const [magnitude, setMagnitude] = useState(7.2);
  const [depthKm, setDepthKm] = useState(28);
  const [distanceKm, setDistanceKm] = useState(35);
  const [duration, setDuration] = useState(22);
  const [soil, setSoil] = useState<Soil>("firm");
  const [motion, setMotion] = useState<Motion>("mixed");
  const [frequencyHz, setFrequencyHz] = useState(1.7);
  const [directionDeg, setDirectionDeg] = useState(35);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<{ ctx: AudioContext; ambient: GainNode; rumble: GainNode; oscillator: OscillatorNode; source: AudioBufferSourceNode; filter: BiquadFilterNode } | null>(null);
  const ambienceMediaRef = useRef<{ day: HTMLAudioElement; night: HTMLAudioElement } | null>(null);

  const analysis = useMemo(() => {
    const estimatedMmi = estimateMmi(magnitude, depthKm, distanceKm, soil);
    const mag = clamp((magnitude - 4) / 5.5);
    const intensity = clamp((estimatedMmi - 1) / 11);
    const shallow = clamp(1 - depthKm / 150);
    const distance = clamp(1 - distanceKm / 250);
    const time = clamp((duration - 5) / 55);
    const frequency = clamp((frequencyHz - 0.5) / 3.5);
    const motionFactor = motion === "mixed" ? 1.08 : motion === "vertical" ? 1.04 : 1;
    const hazard = clamp((mag * 0.33 + intensity * 0.37 + shallow * 0.1 + distance * 0.07 + time * 0.06 + frequency * 0.03 + 0.04) * SOIL[soil].factor * motionFactor);
    const damage = Math.round(clamp((hazard - 0.17) / 0.73) * 100);
    const drift = Math.round(Math.pow(hazard, 1.58) * 1.9 * 100) / 100;
    const pga = Math.round((0.015 + Math.pow(hazard, 1.72) * 0.72) * 100) / 100;
    const zones = {
      foundation: clamp(hazard * (motion === "vertical" ? 1.12 : 0.9)),
      walls: clamp(hazard * 0.96),
      openings: clamp(hazard * (motion === "horizontal" ? 1.14 : 1.07)),
      cornices: clamp(hazard * 1.08),
      windows: clamp(hazard * (motion === "mixed" ? 1.17 : 1.03)),
      roof: clamp(hazard * (frequencyHz > 2.4 ? 1.1 : 0.94)),
      sanitary: clamp(hazard * (soil === "soft" ? 1.04 : 0.78)),
    };
    const support = Math.round(clamp(1 - hazard * 0.62 + 0.08) * 100);
    const angle = (directionDeg * Math.PI) / 180;
    const sideScores = [
      ["Norte", clamp(hazard * (0.86 + Math.abs(Math.cos(angle)) * 0.25))],
      ["Este", clamp(hazard * (0.86 + Math.abs(Math.sin(angle)) * 0.25))],
      ["Sur", clamp(hazard * (0.86 + Math.abs(Math.cos(angle + Math.PI)) * 0.25))],
      ["Oeste", clamp(hazard * (0.86 + Math.abs(Math.sin(angle + Math.PI)) * 0.25))],
    ] as const;
    return { estimatedMmi, hazard, damage, drift, pga, zones, support, sideScores };
  }, [magnitude, depthKm, distanceKm, duration, soil, motion, frequencyHz, directionDeg]);

  const phase = progress <= 0 ? "idle" : progress < 0.12 ? "hypocenter" : progress < 0.34 ? "propagation" : progress < 0.88 ? "surface" : "aftermath";
  const waveProgress = clamp((progress - 0.12) / 0.22);
  const area = AREA[areaName] ?? AREA["Casa de referencia"];
  const selectedMaterial = selectedMaterialId ? materialById[selectedMaterialId] : null;
  const mmiRoman = MMI[Math.min(11, Math.max(0, Math.round(analysis.estimatedMmi) - 1))];

  useEffect(() => {
    const node = document.querySelector(".rh-location");
    if (!node) return;
    const sync = () => {
      const raw = node.childNodes[0]?.textContent?.trim() || node.textContent?.split("14,51")[0]?.trim() || "Casa de referencia";
      setAreaName(raw);
      const index = CAMERAS.findIndex(([, location]) => location === raw);
      if (index >= 0) setCameraIndex(index);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(node, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    setDismissedDamage([]); setSelectedDamage(null); setProgress(0.001);
    const started = performance.now();
    const visualMs = Math.max(10500, Math.min(19000, duration * 390));
    let raf = 0, lastUi = 0;
    const tick = (now: number) => {
      const next = clamp((now - started) / visualMs);
      window.dispatchEvent(new CustomEvent("fabrick:quake",{detail:{active:next<1,progress:next,hazard:analysis.hazard,frequencyHz,directionDeg,motion}}));
      if(now-lastUi>48 || next>=1){ setProgress(next); lastUi=now; }
      if (next >= 1) { setPlaying(false); window.dispatchEvent(new CustomEvent("fabrick:quake",{detail:{active:false,progress:1,hazard:analysis.hazard,frequencyHz,directionDeg,motion}})); }
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.dispatchEvent(new CustomEvent("fabrick:quake",{detail:{active:false,progress:0,hazard:0,frequencyHz,directionDeg,motion}})); };
  }, [playing, duration, analysis.hazard, frequencyHz, directionDeg, motion]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fabrick:lighting", { detail: { mode: light, exposure, temperature, interiorLights, exteriorLights } }));
  }, [light, exposure, temperature, interiorLights, exteriorLights]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fabrick:technical", { detail: { mode: technicalMode, stage: constructionStage } }));
  }, [technicalMode, constructionStage]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const quakeGain = soundOn && phase === "surface" ? 0.035 + analysis.hazard * 0.12 : 0.0001;
    audio.rumble.gain.setTargetAtTime(quakeGain, audio.ctx.currentTime, 0.12);
    audio.oscillator.frequency.setTargetAtTime(26 + frequencyHz * 12, audio.ctx.currentTime, 0.18);
    audio.ambient.gain.setTargetAtTime(soundOn ? 0.004 : 0.0001, audio.ctx.currentTime, 0.2);
    audio.filter.frequency.setTargetAtTime(light === "night" ? 650 : light === "sunset" ? 950 : 1450, audio.ctx.currentTime, 0.35);
    const media = ambienceMediaRef.current;
    if (media) {
      const active = light === "night" ? media.night : media.day;
      const inactive = light === "night" ? media.day : media.night;
      inactive.pause();
      if (soundOn) {
        active.volume = light === "sunset" ? 0.13 : light === "night" ? 0.11 : 0.16;
        void active.play().catch(() => {});
      } else active.pause();
    }
  }, [soundOn, phase, analysis.hazard, frequencyHz, light]);

  const ensureAmbienceMedia = () => {
    if (ambienceMediaRef.current) return ambienceMediaRef.current;
    const create = (src: string) => {
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = "none";
      audio.volume = 0;
      return audio;
    };
    ambienceMediaRef.current = { day: create(AMBIENCE.day), night: create(AMBIENCE.night) };
    return ambienceMediaRef.current;
  };

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    const ctx = new AudioContext();
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (0.45 + 0.55 * Math.sin((i / data.length) * Math.PI));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    const ambient = ctx.createGain();
    ambient.gain.value = 0.0001;
    source.connect(filter).connect(ambient).connect(ctx.destination);
    source.start();
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 42;
    const rumble = ctx.createGain();
    rumble.gain.value = 0.0001;
    oscillator.connect(rumble).connect(ctx.destination);
    oscillator.start();
    audioRef.current = { ctx, ambient, rumble, oscillator, source, filter };
    return audioRef.current;
  };

  useEffect(() => () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.source.stop();
    audio.oscillator.stop();
    const media = ambienceMediaRef.current;
    if (media) { media.day.pause(); media.night.pause(); media.day.src = ""; media.night.src = ""; }
    void audio.ctx.close();
  }, []);

  const goCamera = (index: number) => {
    const next = (index + CAMERAS.length) % CAMERAS.length;
    setCameraIndex(next); setCameraSheet(false); cameraDragY.current=0; setInfoOpen(false); setSelectedMaterialId(null);
    const audio=audioRef.current;if(audio&&soundOn){const tone=audio.ctx.createOscillator(),gain=audio.ctx.createGain();tone.type="sine";tone.frequency.value=520;gain.gain.setValueAtTime(.0001,audio.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.012,audio.ctx.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.0001,audio.ctx.currentTime+.065);tone.connect(gain).connect(audio.ctx.destination);tone.start();tone.stop(audio.ctx.currentTime+.075);}
    window.dispatchEvent(new CustomEvent("fabrick:camera",{detail:{view:CAMERAS[next][2]}}));
  };

  const zoom = (direction: "in" | "out") => {
    window.dispatchEvent(new CustomEvent("fabrick:zoom",{detail:{factor:direction === "in" ? .86 : 1.16}}));
  };

  const cycleLight = () => setLight((value) => value === "day" ? "sunset" : value === "sunset" ? "night" : "day");

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "SELECT" || target?.tagName === "TEXTAREA") return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "q", "e", "f", "l", "m", "r"].includes(key)) event.preventDefault();
      if (key === "a" || key === "q") goCamera(cameraIndex - 1);
      if (key === "d" || key === "e") goCamera(cameraIndex + 1);
      if (key === "w") zoom("in");
      if (key === "s") zoom("out");
      if (key === "f") void toggleFullscreen();
      if (key === "l") cycleLight();
      if (key === "m") setOpen((value) => !value);
      if (key === "r") { setProgress(0); setPlaying(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cameraIndex]);

  const priority = analysis.damage >= 75 ? "Aislar la zona y solicitar evaluación profesional" : analysis.damage >= 45 ? "Inspección profesional antes de reocupar" : analysis.damage >= 20 ? "Revisar uniones, vanos y terminaciones" : "Inspección visual preventiva";
  const shake = 1 + analysis.hazard * 13;
  const speed = Math.max(64, 260 - magnitude * 18 - frequencyHz * 10);
  const sceneStyle = {
    "--sf-shake": `${shake}px`,
    "--sf-speed": `${speed}ms`,
    "--sf-brightness": `${Math.max(45, exposure)}%`,
    "--sf-depth": `${clamp(depthKm / 150) * 100}%`,
    "--sf-wave": `${waveProgress * 100}%`,
    "--sf-interior-light": interiorLights ? "1" : "0",
    "--sf-exterior-light": exteriorLights ? "1" : "0",
    "--sf-temp": `${clamp((temperature - 2700) / 3800)}`,
  } as CSSProperties;

  return (
    <div className={`sf-experience sf-light-${light} sf-phase-${phase}`} style={sceneStyle} data-interior-lights={interiorLights} data-exterior-lights={exteriorLights} data-tech={technicalMode}>
      <div className="sf-scene">
        <ReferenceHouse />
        <div className="sf-light-sim" aria-hidden="true" />
      </div>

      <div className="sf-brand-hud">
        <img src="/brand/soluciones-fabrick-mobile.svg" alt="" />
        <div><small>RECORRIDO 3D · MODO INTERACTIVO</small><strong>{area.title}</strong><span>{area.subtitle}</span></div>
      </div>

      <nav className="sf-quick" aria-label="Controles rápidos">
        <button onClick={() => window.dispatchEvent(new Event("fabrick:menu"))}><span>☰</span><small>Modelo</small></button>
        <button onClick={() => {setTab("quake");setOpen(true)}}><span>⌁</span><small>Sismo</small></button>
        <button onClick={cycleLight}><span>{light === "night" ? "☾" : "☀"}</span><small>Luz</small></button>
        <button aria-pressed={infoOpen} onClick={() => setInfoOpen((v) => !v)}><span>ⓘ</span><small>Info</small></button>
      </nav>

      {playing ? <div className="sf-quake-hud" aria-live="polite"><span>{phase==="hypocenter"?"01":phase==="propagation"?"02":phase==="surface"?"03":"04"}/04</span><div><strong>{phase==="hypocenter"?"Hipocentro":phase==="propagation"?"Propagación":phase==="surface"?"Respuesta de la vivienda":"Inspección"}</strong><small>{phase==="surface"?"Movimiento "+motion+" · "+directionDeg+"°":phase==="propagation"?"Onda ascendiendo hacia superficie":phase==="hypocenter"?depthKm+" km de profundidad":"Evaluando zonas afectadas"}</small></div><i style={{"--sf-quake-progress":progress} as CSSProperties}/></div> : null}

      {infoOpen ? (
        <aside className="sf-area-card">
          <header><div><small>MATERIALES DE ESTA ÁREA</small><strong>{area.title}</strong></div><button onClick={() => setInfoOpen(false)}>×</button></header>
          <label className="sf-area-select"><span>Ambiente</span><select value={areaName} onChange={(event) => { const next = CAMERAS.findIndex(([,location]) => location === event.target.value); if (next >= 0) goCamera(next); }}>{CAMERAS.map(([label,location]) => <option key={location} value={location}>{label}</option>)}</select></label>
          <div className="sf-material-list">
            {area.materials.map((item, index) => <button type="button" className="sf-material-row" key={item.material} disabled={!item.id} onClick={() => item.id && setSelectedMaterialId(item.id)}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{item.material}</strong><small>{item.place}</small><p>{item.note}</p></div><i>{item.id ? "›" : ""}</i></button>)}
          </div>
          <footer><span>Texturas web: PBR/CC0 cuando estén disponibles</span><span>Modelo conceptual</span></footer>
        </aside>
      ) : null}

      {selectedMaterial ? <aside className="sf-material-detail" aria-live="polite">
        <header><div><small>FICHA DE MATERIAL</small><strong>{selectedMaterial.name}</strong></div><button onClick={() => setSelectedMaterialId(null)}>×</button></header>
        <dl>
          <div><dt>Lugar</dt><dd>{selectedMaterial.locations.join(" · ")}</dd></div>
          {selectedMaterial.dimensions ? <div><dt>Dimensiones</dt><dd>{selectedMaterial.dimensions}</dd></div> : null}
          {selectedMaterial.thickness ? <div><dt>Espesor</dt><dd>{selectedMaterial.thickness}</dd></div> : null}
          <div><dt>Uso</dt><dd>{selectedMaterial.use}</dd></div>
          <div><dt>Por qué se usa</dt><dd>{selectedMaterial.reason}</dd></div>
          <div><dt>Etapa</dt><dd>{selectedMaterial.stage}</dd></div>
        </dl>
        {selectedMaterial.source ? <a href={selectedMaterial.source} target="_blank" rel="noreferrer">Fuente técnica/comercial ↗</a> : <small>Dimensión final sujeta a especificación y cálculo del proyecto.</small>}
      </aside> : null}

      <nav className="sf-tech-dock" aria-label="Capas técnicas">
        {([
          ["architecture","ARQ","Arquitectura"],["structure","EST","Estructura"],["electric","ELEC","Eléctrico"],["water","AGUA","Agua"],["sanitary","SAN","Sanitario"],["underfloor","SUB","Bajo piso"],["stage","ETAPAS","Etapas"]
        ] as [TechnicalMode,string,string][]).map(([mode,short,label]) => <button key={mode} title={label} aria-pressed={technicalMode===mode} onClick={() => {setTechnicalMode(mode);setSelectedMaterialId(null);}}><b>{short}</b><small>{label}</small></button>)}
      </nav>
      {technicalMode==="stage" ? <div className="sf-stage-mini"><span>Etapa <b>{constructionStage}/12</b></span><input aria-label="Etapa constructiva" type="range" min="1" max="12" value={constructionStage} onChange={(e)=>setConstructionStage(Number(e.target.value))}/><small>{["Terreno","Fundación","Estructura","OSB","Instalaciones","Aislación","Membranas","Revestimientos","Cielos","Terminaciones","Muebles","Terminada"][constructionStage-1]}</small></div> : null}

      <div className="sf-gamepad sf-desktop-only" aria-label="Controles tipo videojuego">
        <button className="up" onClick={() => zoom("in")} aria-label="Acercar">W</button>
        <button className="left" onClick={() => goCamera(cameraIndex - 1)} aria-label="Cámara anterior">A</button>
        <button className="down" onClick={() => zoom("out")} aria-label="Alejar">S</button>
        <button className="right" onClick={() => goCamera(cameraIndex + 1)} aria-label="Cámara siguiente">D</button>
      </div>

      <nav className="sf-camera-dock" aria-label="Cámaras del recorrido">
        <button className="sf-dock-arrow" onClick={() => goCamera(cameraIndex - 1)} aria-label="Vista anterior">‹</button>
        <button className="sf-camera-current" onClick={() => setCameraSheet(true)}><span>{cameraIndex + 1}/{CAMERAS.length}</span><strong>{CAMERAS[cameraIndex][0]}</strong><small>Elegir ambiente</small></button>
        <button className="sf-dock-arrow" onClick={() => goCamera(cameraIndex + 1)} aria-label="Vista siguiente">›</button>
      </nav>

      {cameraSheet ? <div className="sf-sheet-backdrop" onPointerDown={(e)=>{if(e.target===e.currentTarget)setCameraSheet(false)}}>
        <aside ref={cameraSheetRef} className="sf-camera-sheet" aria-label="Elegir cámara">
          <div className="sf-sheet-handle"
            onPointerDown={(e)=>{cameraDragStart.current=e.clientY;cameraDragY.current=0;e.currentTarget.setPointerCapture?.(e.pointerId)}}
            onPointerMove={(e)=>{if(!e.currentTarget.hasPointerCapture?.(e.pointerId)||!cameraSheetRef.current)return;cameraDragY.current=Math.max(0,e.clientY-cameraDragStart.current);const resistance=cameraDragY.current>180?180+(cameraDragY.current-180)*.22:cameraDragY.current;cameraSheetRef.current.style.transform=`translateY(${resistance}px)`;cameraSheetRef.current.style.opacity=String(Math.max(.55,1-resistance/520))}}
            onPointerUp={(e)=>{try{e.currentTarget.releasePointerCapture?.(e.pointerId)}catch{}const node=cameraSheetRef.current;if(cameraDragY.current>72){if(node&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){node.animate([{transform:node.style.transform||"translateY(0)",opacity:node.style.opacity||"1"},{transform:"translateY(100%)",opacity:.25}],{duration:180,easing:"cubic-bezier(0.23, 1, 0.32, 1)",fill:"forwards"}).finished.then(()=>setCameraSheet(false)).catch(()=>setCameraSheet(false))}else setCameraSheet(false)}else if(node){node.animate([{transform:node.style.transform||"translateY(0)"},{transform:"translateY(0)"}],{duration:180,easing:"cubic-bezier(0.23, 1, 0.32, 1)"});node.style.transform="";node.style.opacity=""}cameraDragY.current=0}}
            onPointerCancel={()=>{const node=cameraSheetRef.current;if(node){node.style.transform="";node.style.opacity=""}cameraDragY.current=0}}
          /><header><div><small>VISTAS</small><strong>Elige un ambiente</strong></div><button onClick={()=>setCameraSheet(false)}>×</button></header>
          {CAMERA_GROUPS.map(group=><section key={group.title}><div><strong>{group.title}</strong><small>{group.note}</small></div><nav>{group.ids.map(index=><button key={CAMERAS[index][0]} aria-pressed={cameraIndex===index} onClick={()=>goCamera(index)}><span>{String(index+1).padStart(2,"0")}</span><b>{CAMERAS[index][0]}</b></button>)}</nav></section>)}
          {areaName==="Cocina" ? <button className="sf-kitchen-motion" onClick={()=>window.dispatchEvent(new CustomEvent("fabrick:kitchen",{detail:{toggle:true}}))}>Abrir / cerrar muebles superiores <span>110°</span></button> : null}
        </aside>
      </div> : null}

      {(phase === "hypocenter" || phase === "propagation") ? (
        <div className="sf-seismic-stage" aria-live="polite">
          <div className="sf-earth-section">
            <div className="sf-surface-line"><span>SUPERFICIE · CASA</span></div>
            <div className="sf-wave-front" />
            <div className="sf-hypocenter"><i /><b>Hipocentro</b><small>{depthKm} km · M {magnitude.toFixed(1)}</small></div>
            <div className="sf-depth-line"><span>{phase === "hypocenter" ? "Energía iniciada en profundidad" : "Frente de onda propagándose hacia superficie"}</span></div>
          </div>
        </div>
      ) : null}

      {(phase === "surface" || phase === "aftermath") && analysis.damage >= 12 ? <>
        <div className="sf-damage-map">
          {([
            ["roof","pin-roof",analysis.zones.roof],["cornices","pin-cornice",analysis.zones.cornices],["windows","pin-window",analysis.zones.windows],
            ["walls","pin-wall",analysis.zones.walls],["foundation","pin-foundation",analysis.zones.foundation],["sanitary","pin-sanitary",analysis.zones.sanitary]
          ] as [DamageId,string,number][]).filter(([id])=>!dismissedDamage.includes(id)).map(([id,className,score]) =>
            <button key={id} className={`sf-damage-pin ${className}`} data-level={level(score).toLowerCase()} style={{opacity:.52+score*.48}} onClick={()=>setSelectedDamage(id)}>
              <i/><b>{DAMAGE_META[id].label}</b><small>{level(score)}</small>
            </button>)}
        </div>
        <div className="sf-damage-toast-stack" aria-live="polite">
          {([
            ["walls",analysis.zones.walls],["windows",analysis.zones.windows],["roof",analysis.zones.roof],["foundation",analysis.zones.foundation],["sanitary",analysis.zones.sanitary]
          ] as [DamageId,number][]).filter(([id,score])=>score>=.22&&!dismissedDamage.includes(id)).slice(0,4).map(([id,score])=>
            <SwipeDamage key={id} id={id} label={DAMAGE_META[id].label} score={score} onOpen={setSelectedDamage} onDismiss={(damageId)=>setDismissedDamage(v=>[...v,damageId])}/>)}
        </div>
        {selectedDamage ? <aside className="sf-damage-detail">
          <header><div><small>INSPECCIÓN VISUAL</small><strong>{DAMAGE_META[selectedDamage].label}</strong></div><button onClick={()=>setSelectedDamage(null)}>×</button></header>
          <p><b>Zona</b>{DAMAGE_META[selectedDamage].location}</p>
          <p><b>Nivel relativo</b>{level(analysis.zones[selectedDamage])}</p>
          <p><b>Qué revisar</b>{DAMAGE_META[selectedDamage].check}</p>
          <small>Índice visual educativo. No sustituye inspección ni cálculo estructural.</small>
          <button className="sf-damage-reviewed" onClick={()=>{setDismissedDamage(v=>[...v,selectedDamage]);setSelectedDamage(null)}}>Marcar revisado</button>
        </aside> : null}
      </> : null}

      {open ? (
        <aside className="sf-lab" aria-label="Fabrick Lab">
          <header>
            <img src="/brand/soluciones-fabrick-mobile.svg" alt="Soluciones Fabrick" />
            <div><small>FABRICK LAB</small><strong>Visor técnico interactivo</strong></div>
            <button aria-label="Cerrar laboratorio" onClick={() => setOpen(false)}>×</button>
          </header>
          <nav className="sf-lab-tabs">
            <button aria-pressed={tab === "quake"} onClick={() => setTab("quake")}>Sismo</button>
            <button aria-pressed={tab === "light"} onClick={() => setTab("light")}>Iluminación</button>
            <button aria-pressed={tab === "technical"} onClick={() => setTab("technical")}>Planos</button>
            <button aria-pressed={tab === "controls"} onClick={() => setTab("controls")}>Controles</button>
          </nav>

          {tab === "quake" ? <>
            <section>
              <div className="sf-section-title"><h2>Escenario sísmico</h2><span>MMI {mmiRoman}</span></div>
              <label>Magnitud <b>{magnitude.toFixed(1)}</b><input type="range" min="4" max="9.5" step="0.1" value={magnitude} onChange={(e) => setMagnitude(Number(e.target.value))} /></label>
              <label>Profundidad <b>{depthKm} km</b><input type="range" min="5" max="150" step="1" value={depthKm} onChange={(e) => setDepthKm(Number(e.target.value))} /></label>
              <label>Distancia epicentral <b>{distanceKm} km</b><input type="range" min="0" max="250" step="5" value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} /></label>
              <label>Duración <b>{duration} s</b><input type="range" min="5" max="60" step="1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></label>
              <label>Frecuencia visual <b>{frequencyHz.toFixed(1)} Hz</b><input type="range" min="0.5" max="4" step="0.1" value={frequencyHz} onChange={(e) => setFrequencyHz(Number(e.target.value))} /></label>
              <label>Dirección de movimiento <b>{directionDeg}°</b><input type="range" min="0" max="359" step="1" value={directionDeg} onChange={(e) => setDirectionDeg(Number(e.target.value))} /></label>
              <label>Tipo de movimiento<select value={motion} onChange={(e) => setMotion(e.target.value as Motion)}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option><option value="mixed">Mixto</option></select></label>
              <label>Suelo<select value={soil} onChange={(e) => setSoil(e.target.value as Soil)}><option value="rock">Roca / muy firme</option><option value="firm">Firme</option><option value="soft">Blando</option></select></label>
              <button className="sf-play" disabled={playing} onClick={() => { const audio=ensureAudio();void audio.ctx.resume();setProgress(0);setOpen(false);setPlaying(true); }}>{playing ? "Simulación en curso…" : progress > 0 ? "↻ Reiniciar terremoto" : "▶ Inicializar terremoto"}</button>
              <div className="sf-progress"><i style={{"--sf-progress":progress} as CSSProperties} /></div>
              <div className="sf-phase-readout"><b>{phase === "idle" ? "Preparado" : phase === "hypocenter" ? "Hipocentro" : phase === "propagation" ? "Propagación" : phase === "surface" ? "Respuesta en superficie" : "Evaluación posterior"}</b><span>{Math.round(progress * 100)}%</span></div>
            </section>
            <section className="sf-results">
              <h2>Análisis visual del escenario</h2>
              <div className="sf-metrics"><article><small>Daño proxy</small><strong>{analysis.damage}%</strong></article><article><small>PGA proxy</small><strong>{analysis.pga} g</strong></article><article><small>Deriva proxy</small><strong>{analysis.drift}%</strong></article><article><small>Soporte ref.</small><strong>{analysis.support}%</strong></article></div>
              <p><b>Prioridad:</b> {priority}.</p>
              <div className="sf-zone-grid">{Object.entries({ "Fundación": analysis.zones.foundation, "Muros": analysis.zones.walls, "Vanos": analysis.zones.openings, "Cornisas": analysis.zones.cornices, "Ventanas": analysis.zones.windows, "Techumbre": analysis.zones.roof, "Sanitaria": analysis.zones.sanitary }).map(([name, score]) => <div key={name}><span>{name}</span><i><b style={{ width: `${score * 100}%` }} /></i><small>{level(score)}</small></div>)}</div>
              <h3>Lectura por fachadas</h3>
              <div className="sf-side-grid">{analysis.sideScores.map(([name, score]) => <article key={name}><span>{name}</span><strong>{Math.round(score * 100)}%</strong><small>{level(score)}</small></article>)}</div>
            </section>
          </> : null}

          {tab === "light" ? <>
            <section>
              <h2>Iluminación cinematográfica</h2>
              <div className="sf-segmented">{(["day", "sunset", "night"] as LightMode[]).map((mode) => <button key={mode} aria-pressed={light === mode} onClick={() => setLight(mode)}>{mode === "day" ? "Día" : mode === "sunset" ? "Atardecer" : "Noche"}</button>)}</div>
              <label>Exposición <b>{exposure}%</b><input type="range" min="45" max="145" step="1" value={exposure} onChange={(e) => setExposure(Number(e.target.value))} /></label>
              <label>Temperatura <b>{temperature} K</b><input type="range" min="2700" max="6500" step="100" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></label>
              <div className="sf-switches"><button aria-pressed={interiorLights} onClick={() => setInteriorLights((v) => !v)}>Lámparas interiores <b>{interiorLights ? "ON" : "OFF"}</b></button><button aria-pressed={exteriorLights} onClick={() => setExteriorLights((v) => !v)}>Luces exteriores <b>{exteriorLights ? "ON" : "OFF"}</b></button></div>
            </section>
            <section className="sf-light-map"><h2>Mapa de iluminación del modelo</h2><div><article><b>5</b><span>Puntos interiores</span><small>Living, comedor, dormitorios y cocina representados con PointLight.</small></article><article><b>2</b><span>Puntos exteriores</span><small>Fachada frontal / terraza.</small></article></div><p>ACES Filmic, sol direccional, luz hemisférica y luminarias Three.js cambian físicamente entre día, atardecer y noche. Las sombras se adaptan a móvil/escritorio.</p></section>
          </> : null}

          {tab === "technical" ? <section className="sf-control-help">
            <h2>Planos y etapas</h2>
            <p>Alterna arquitectura, estructura, eléctrico, agua y sanitario. En Agua/Sanitario se reduce la envolvente para leer los recorridos bajo la vivienda; Eléctrico muestra tablero, troncal y derivaciones conceptuales.</p>
            <div className="sf-switches">
              <button aria-pressed={technicalMode==="architecture"} onClick={()=>setTechnicalMode("architecture")}>Arquitectura <b>ARQ</b></button>
              <button aria-pressed={technicalMode==="structure"} onClick={()=>setTechnicalMode("structure")}>Estructura <b>EST</b></button>
              <button aria-pressed={technicalMode==="electric"} onClick={()=>setTechnicalMode("electric")}>Plano eléctrico <b>ELEC</b></button>
              <button aria-pressed={technicalMode==="water"} onClick={()=>setTechnicalMode("water")}>Agua potable <b>AGUA</b></button>
              <button aria-pressed={technicalMode==="sanitary"} onClick={()=>setTechnicalMode("sanitary")}>Sanitario <b>SAN</b></button>
            </div>
            <label>Progreso constructivo <b>{constructionStage}/12</b><input type="range" min="1" max="12" value={constructionStage} onChange={(e)=>{setTechnicalMode("stage");setConstructionStage(Number(e.target.value));}}/></label>
            <p>Los recorridos son esquemáticos. El proyecto eléctrico, hidráulico y sanitario definitivo debe dimensionarse con normativa, cálculo y profesionales competentes.</p>
          </section> : null}

          {tab === "controls" ? <section className="sf-control-help">
            <h2>Controles tipo videojuego</h2>
            <div className="sf-key-grid"><kbd>W</kbd><span>Acercar cámara</span><kbd>S</kbd><span>Alejar cámara</span><kbd>A / Q</kbd><span>Cámara anterior</span><kbd>D / E</kbd><span>Cámara siguiente</span><kbd>L</kbd><span>Cambiar ambiente</span><kbd>F</kbd><span>Pantalla completa</span><kbd>M</kbd><span>Abrir / cerrar Lab</span><kbd>R</kbd><span>Reiniciar sismo</span></div>
            <p>También puedes arrastrar para orbitar, usar la rueda o pellizco para zoom y abrir el menú nativo para capas, planta y despiece.</p>
            <button className="sf-native-menu" onClick={() => clickByText(".rh-top button", "☰ Menú")}>Abrir capas y despiece</button>
          </section> : null}

          <p className="sf-disclaimer">Simulación educativa/comercial. MMI, PGA proxy, deriva, soporte y daño son referencias visuales; no sustituyen cálculo estructural, estudio de suelo, NCh433/DS61, ingeniería, inspección profesional ni evaluación de habitabilidad post-sismo. El modelo geométrico es conceptual y no representa una probabilidad de supervivencia.</p>
        </aside>
      ) : null}
    </div>
  );
}
