import { assemblySummary, wallLengthM, type MetalconHousePreset } from '@/lib/metalconAssembly';

export type MetalconLabLayer='structure'|'osb'|'membrane'|'battens'|'insulation'|'gypsum'|'ceiling'|'floor'|'siding'|'roof'|'fixtures'|'sanitary'|'vegetation';
export type MetalconLightMode='day'|'sunset'|'night';
export type MetalconLabStage={start:number;name:string};

export const METALCON_LAB_STAGES:MetalconLabStage[]=[
 {start:0,name:'Excavación y replanteo'},{start:8,name:'Soleras y fundación'},{start:18,name:'Montantes'},{start:28,name:'Vanos, dinteles y refuerzos'},
 {start:40,name:'OSB estructural'},{start:49,name:'Barrera exterior'},{start:56,name:'Listones 2×2'},{start:62,name:'Lana aislante'},{start:69,name:'Vulcanita interior'},
 {start:75,name:'Cerámica 60×60'},{start:81,name:'Portantes y cielo'},{start:86,name:'Baño y cocina'},{start:91,name:'Red sanitaria + fosa 800 L'},
 {start:95,name:'Siding exterior'},{start:98,name:'Cubierta y terminaciones'},
];
export const METALCON_LAYERS:Array<{id:MetalconLabLayer;label:string}>=[
 {id:'structure',label:'Estructura Metalcon'},{id:'osb',label:'OSB estructural'},{id:'membrane',label:'Barrera / fieltro'},{id:'battens',label:'Listones 2×2'},
 {id:'insulation',label:'Lana aislante'},{id:'gypsum',label:'Vulcanita'},{id:'ceiling',label:'Portantes + cielo'},{id:'floor',label:'Cerámica 60×60'},
 {id:'siding',label:'Siding exterior'},{id:'roof',label:'Cubierta / teja'},{id:'fixtures',label:'Baño + cocina'},{id:'sanitary',label:'Sanitaria + fosa'},{id:'vegetation',label:'Vegetación'},
];
export function metalconStageIndex(t:number){let i=0;METALCON_LAB_STAGES.forEach((s,n)=>{if(t>=s.start)i=n});return i}
export function metalconBreakdown(preset:MetalconHousePreset){
 const sum=assemblySummary(preset,40),perimeter=preset.walls.filter(w=>w.role==='perimeter').reduce((n,w)=>n+wallLengthM(w),0),wallArea=perimeter*preset.heightM,floorArea=preset.widthM*preset.depthM;
 const openingArea=preset.walls.flatMap(w=>w.openings).reduce((n,o)=>n+o.widthM*o.heightM,0),netWall=Math.max(1,wallArea-openingArea),roofArea=floorArea*1.16;
 const sidingPieceArea=.19*3.66;
 return [
  {material:'Montante C',spec:'Modulación visual 40 cm',unit:'un.',qty:String(sum.regularStuds+sum.openingFrames),note:'Estimación de malla; proyecto define refuerzos.'},
  {material:'Solera U',spec:'Base + coronación',unit:'ml',qty:(perimeter*2).toFixed(1),note:'Referencia perimetral.'},
  {material:'OSB',spec:'Plancha ref. 1,22×2,44 m',unit:'pl.',qty:String(Math.ceil(netWall/(1.22*2.44)*1.08)),note:'Incluye 8% de merma referencial.'},
  {material:'Barrera exterior',spec:'Membrana continua',unit:'m²',qty:(netWall*1.1).toFixed(1),note:'Incluye traslapos referenciales.'},
  {material:'Listón 2×2',spec:'≈45×45 mm visual',unit:'ml',qty:(perimeter*Math.ceil(preset.heightM/.6)).toFixed(0),note:'Separación ilustrativa; revisar sistema real.'},
  {material:'Lana aislante',spec:'Espesor según solución térmica',unit:'m²',qty:(netWall*1.05).toFixed(1),note:'No sustituye cálculo térmico.'},
  {material:'Vulcanita',spec:'Plancha interior referencial',unit:'pl.',qty:String(Math.ceil((wallArea+floorArea)/(1.2*2.4)*1.08)),note:'Incluye muros + cielo de referencia.'},
  {material:'Cerámica 60×60',spec:'0,36 m²/pieza',unit:'pza',qty:String(Math.ceil(floorArea/.36*1.08)),note:'8% merma referencial.'},
  {material:'Siding Volcanboard',spec:'6×190×3.660 mm',unit:'tira',qty:String(Math.ceil(netWall/sidingPieceArea*1.1)),note:'Referencia comercial; traslapo y modulación alteran rendimiento.'},
  {material:'Cubierta continua',spec:'Cintac ref. 2–6 m',unit:'m²',qty:(roofArea*1.08).toFixed(1),note:'Área estimada; largo de panel se define por faldón y transporte.'},
 ];
}
