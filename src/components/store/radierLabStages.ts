import { calculateRadier } from '@/lib/radierCalculator';

export type RadierStageLayer = 'layout'|'excavation'|'fill'|'base'|'gravel'|'barrier'|'mesh'|'formwork'|'concrete'|'finish';
export type RadierStage = { start:number; name:string; description:string; layer:RadierStageLayer };

export const RADIER_LAB_STAGES: RadierStage[] = [
  {start:0,name:'Terreno y replanteo',description:'Se marca el perímetro y la cota antes de intervenir el suelo.',layer:'layout'},
  {start:10,name:'Excavación',description:'Se retira terreno para recibir la plataforma y sus capas.',layer:'excavation'},
  {start:24,name:'Relleno de plataforma',description:'Material compactable recupera nivel hasta la cota de apoyo.',layer:'fill'},
  {start:36,name:'Base estabilizada',description:'Capa compactada que entrega una superficie uniforme.',layer:'base'},
  {start:49,name:'Gravilla',description:'Cama granular de regularización bajo la barrera.',layer:'gravel'},
  {start:60,name:'Barrera de humedad',description:'Lámina continua para reducir humedad desde el terreno.',layer:'barrier'},
  {start:70,name:'Malla ACMA',description:'Refuerzo representativo previo al hormigonado.',layer:'mesh'},
  {start:80,name:'Moldaje',description:'Tablas y estacas fijan borde y cota superior.',layer:'formwork'},
  {start:89,name:'Hormigonado',description:'Se coloca el volumen calculado para el espesor seleccionado.',layer:'concrete'},
  {start:97,name:'Afinado y terminación',description:'La cara superior queda aprox. a +0,30 m en esta representación.',layer:'finish'},
];

export function radierStageIndex(timeline:number){let i=0;RADIER_LAB_STAGES.forEach((s,n)=>{if(timeline>=s.start)i=n});return i}

export function radierStageStats(args:{result:ReturnType<typeof calculateRadier>;stage:RadierStage;baseDepth:number;gravelDepth:number;thickness:number}){
  const {result,stage,baseDepth,gravelDepth,thickness}=args;
  const area=result.area, excavation=16, top=30, barrier=1.2, mesh=2.5;
  const stackBottom=top-thickness-mesh-barrier-gravelDepth-baseDepth;
  const fill=Math.max(3.5,stackBottom+excavation);
  const common={area:`${area.toLocaleString('es-CL',{maximumFractionDigits:2})} m²`};
  const vol=(cm:number)=>`${(area*cm/100).toLocaleString('es-CL',{maximumFractionDigits:2})} m³`;
  switch(stage.layer){
    case'excavation':return{...common,thickness:`${excavation} cm`,depth:`−${excavation} cm`,quantity:vol(excavation)};
    case'fill':return{...common,thickness:`${fill.toFixed(1)} cm`,depth:`${stackBottom.toFixed(1)} cm cota`,quantity:vol(fill)};
    case'base':return{...common,thickness:`${baseDepth} cm`,depth:`${(stackBottom+baseDepth).toFixed(1)} cm cota`,quantity:`${result.stabilized.toLocaleString('es-CL',{maximumFractionDigits:2})} m³`};
    case'gravel':return{...common,thickness:`${gravelDepth} cm`,depth:`${(stackBottom+baseDepth+gravelDepth).toFixed(1)} cm cota`,quantity:`${result.gravel.toLocaleString('es-CL',{maximumFractionDigits:2})} m³`};
    case'barrier':return{...common,thickness:'Lámina',depth:`${(top-thickness-mesh).toFixed(1)} cm cota`,quantity:`${result.moistureBarrierM2.toLocaleString('es-CL',{maximumFractionDigits:1})} m²`};
    case'mesh':return{...common,thickness:'Malla',depth:`${(top-thickness).toFixed(1)} cm cota aprox.`,quantity:`${result.meshSheets} plancha(s)`};
    case'formwork':return{...common,thickness:`${thickness} cm borde`,depth:`hasta +${top} cm`,quantity:`${result.formworkMeters.toLocaleString('es-CL',{maximumFractionDigits:1})} ml`};
    case'concrete':return{...common,thickness:`${thickness} cm`,depth:`cara superior +${top} cm`,quantity:`${result.concrete.toLocaleString('es-CL',{maximumFractionDigits:2})} m³ incl. 8%`};
    case'finish':return{...common,thickness:`${thickness} cm radier`,depth:`+${top} cm terminado`,quantity:`${result.concrete.toLocaleString('es-CL',{maximumFractionDigits:2})} m³`};
    default:return{...common,thickness:'—',depth:'Nivel natural 0,00',quantity:`${result.perimeter.toLocaleString('es-CL',{maximumFractionDigits:1})} ml perímetro`};
  }
}
