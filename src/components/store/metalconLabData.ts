import { assemblySummary, wallLengthM, type MetalconHousePreset } from '@/lib/metalconAssembly';

export type MetalconLabLayer='structure'|'osb'|'membrane'|'battens'|'insulation'|'electrical'|'gypsum'|'ceiling'|'floor'|'siding'|'roof'|'fixtures'|'sanitary'|'vegetation';
export type MetalconLightMode='day'|'sunset'|'night';
export type MetalconLabStage={start:number;name:string};

export const METALCON_LAB_STAGES:MetalconLabStage[]=[
 {start:0,name:'Excavación y replanteo'},{start:8,name:'Soleras y fundación'},{start:18,name:'Montantes'},{start:28,name:'Vanos, dinteles y refuerzos'},
 {start:40,name:'OSB estructural'},{start:49,name:'Barrera hidrófuga / cortaviento'},{start:56,name:'Listones + cámara ventilada'},{start:62,name:'Lana aislante'},{start:66,name:'Canalización y puntos eléctricos'},
 {start:72,name:'Vulcanita interior'},{start:78,name:'Cerámica 60×60'},{start:83,name:'Portantes y cielo'},{start:87,name:'Baño y cocina'},{start:91,name:'Red sanitaria + fosa 800 L'},
 {start:95,name:'Siding exterior'},{start:98,name:'Cerchas, correas y cubierta'},
];
export const METALCON_LAYERS:Array<{id:MetalconLabLayer;label:string}>=[
 {id:'structure',label:'Estructura Metalcon'},{id:'osb',label:'OSB estructural'},{id:'membrane',label:'Membrana hidrófuga'},{id:'battens',label:'Listones + cámara ventilada'},
 {id:'insulation',label:'Lana aislante'},{id:'electrical',label:'Puntos eléctricos'},{id:'gypsum',label:'Vulcanita'},{id:'ceiling',label:'Portantes + cielo'},{id:'floor',label:'Cerámica 60×60'},
 {id:'siding',label:'Siding exterior'},{id:'roof',label:'Cubierta / techumbre'},{id:'fixtures',label:'Baño + cocina'},{id:'sanitary',label:'Sanitaria + fosa'},{id:'vegetation',label:'Vegetación'},
];
export function metalconStageIndex(t:number){let i=0;METALCON_LAB_STAGES.forEach((s,n)=>{if(t>=s.start)i=n});return i}
export function metalconBreakdown(preset:MetalconHousePreset){
 const sum=assemblySummary(preset,40),perimeter=preset.walls.filter(w=>w.role==='perimeter').reduce((n,w)=>n+wallLengthM(w),0),wallArea=perimeter*preset.heightM,floorArea=preset.widthM*preset.depthM;
 const openingArea=preset.walls.flatMap(w=>w.openings).reduce((n,o)=>n+o.widthM*o.heightM,0),netWall=Math.max(1,wallArea-openingArea),roofRun=preset.depthM/2+.48,roofRise=roofRun*.275,roofSlope=Math.sqrt(roofRun*roofRun+roofRise*roofRise),roofArea=2*(preset.widthM+.9)*roofSlope;
 const sidingPieceArea=.19*3.66,trussCount=Math.ceil(preset.widthM/.6)+1,purlinLength=(preset.widthM+.9)*6;
 return [
  {material:'Montante C',spec:'Modulación visual 40 cm',unit:'un.',qty:String(sum.regularStuds+sum.openingFrames),note:'Estimación de malla; proyecto define refuerzos.'},
  {material:'Solera U',spec:'Base + coronación',unit:'ml',qty:(perimeter*2).toFixed(1),note:'Referencia perimetral.'},
  {material:'OSB muro',spec:'Plancha ref. 1,22×2,44 m',unit:'pl.',qty:String(Math.ceil(netWall/(1.22*2.44)*1.08)),note:'Incluye 8% de merma referencial.'},
  {material:'Membrana muro',spec:'Hidrófuga / cortaviento',unit:'m²',qty:(netWall*1.1).toFixed(1),note:'Incluye traslapos referenciales.'},
  {material:'Listón exterior',spec:'Subestructura vertical visual',unit:'ml',qty:(perimeter*Math.ceil(preset.heightM/.6)).toFixed(0),note:'Genera una cámara ventilada representativa detrás del siding.'},
  {material:'Cámara ventilada',spec:'Separación detrás de revestimiento',unit:'m²',qty:netWall.toFixed(1),note:'Representación educativa; espesor y ventilaciones dependen de la solución especificada.'},
  {material:'Lana aislante',spec:'Espesor según solución térmica',unit:'m²',qty:(netWall*1.05).toFixed(1),note:'No sustituye cálculo térmico.'},
  {material:'Puntos eléctricos',spec:'Canalización visual RIC 04/10',unit:'pts',qty:'ref.',note:'Ubicación y circuitos son ilustrativos; proyecto y ejecución deben ajustarse a SEC.'},
  {material:'Vulcanita',spec:'Plancha interior referencial',unit:'pl.',qty:String(Math.ceil((wallArea+floorArea)/(1.2*2.4)*1.08)),note:'Incluye muros + cielo de referencia.'},
  {material:'Cerámica 60×60',spec:'0,36 m²/pieza',unit:'pza',qty:String(Math.ceil(floorArea/.36*1.08)),note:'8% merma referencial.'},
  {material:'Siding',spec:'Tira ref. 6×190×3.660 mm',unit:'tira',qty:String(Math.ceil(netWall/sidingPieceArea*1.1)),note:'Referencia comercial; traslapo y modulación alteran rendimiento.'},
  {material:'Cerchas Metalcon',spec:'Dos aguas · ref. ~0,60 m',unit:'un.',qty:String(trussCount),note:'Separación visual. Proyecto estructural define perfiles, diagonales y distancia real.'},
  {material:'Correas / costaneras',spec:'3 líneas visuales por faldón',unit:'ml',qty:purlinLength.toFixed(1),note:'Representación del soporte secundario; sección y separación reales dependen de cubierta y cálculo.'},
  {material:'Tablero bajo cubierta',spec:'OSB visual 11 mm',unit:'pl.',qty:String(Math.ceil(roofArea/(1.22*2.44)*1.08)),note:'Referencia visual; verificar solución y fabricante.'},
  {material:'Membrana techumbre',spec:'Fieltro / barrera visual',unit:'m²',qty:(roofArea*1.08).toFixed(1),note:'Incluye traslapo referencial.'},
  {material:'Cubierta',spec:'Faldones + cumbrera',unit:'m²',qty:(roofArea*1.08).toFixed(1),note:'Área estimada con pendiente visual 27,5%; el proyecto real manda.'},
  {material:'Alero / tapacán / canaleta',spec:'Remates perimetrales visuales',unit:'ml',qty:((preset.widthM+.9)*2).toFixed(1),note:'Representación educativa de remates y evacuación de aguas lluvias.'},
 ];
}
