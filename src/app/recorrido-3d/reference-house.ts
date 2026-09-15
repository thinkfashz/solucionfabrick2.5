export const layers = [
  ['Radier y terraza', '#9eaaa5', 'Base de hormigón y terraza. Geometría de referencia; espesor ilustrativo.'],
  ['Redes sanitarias', '#52bed0', 'Agua fría, caliente y descarga separadas por color. Trazado conceptual hacia cámara y fosa.'],
  ['Estructura Metalcon', '#cbd5e1', 'Perfilería galvanizada de muros, dinteles y vanos. Secciones y uniones por calcular.'],
  ['Placas OSB', '#d8a768', 'Placa de soporte exterior del entramado; textura de virutas y juntas visibles.'],
  ['Aislación térmica', '#dfc993', 'Relleno entre montantes. Espesor y desempeño dependen de la solución constructiva.'],
  ['Membrana y cámara de aire', '#95bab5', 'Membrana exterior y listones que separan el revestimiento.'],
  ['Volcanita y cielo', '#ede9df', 'Terminación interior y cielo horizontal de las alas; zona central elevada.'],
  ['Revestimiento y ventanas', '#7d858d', 'Fachada clara como la referencia, madera en terraza y marcos oscuros.'],
  ['Cerchas y correas', '#aebdcb', 'Techumbre con frontón central y cuerpos laterales, inspirada en la fotografía.'],
  ['Cubierta y aguas lluvia', '#475569', 'Cubierta gris, canaletas y bajadas. Mantiene la silueta de la referencia.'],
] as const;

// Overall dimensions transcribed from the supplied image. Internal coordinates are
// a visual interpretation, deliberately not presented as surveyed dimensions.
export const width = 14.51;
export const depth = 13.41;
export const rooms = [
  {name:'Dormitorio 1', area:'17,61', x:-7.05,z:-3.8,w:4.25,d:4.4},
  {name:'Baño 1',area:'5,42',x:-7.05,z:.7,w:2.5,d:2},
  {name:'Dormitorio 2',area:'19,27',x:-7.05,z:2.8,w:5.1,d:2.7},
  {name:'Living · comedor',area:'43,23',x:-2.65,z:-5.5,w:6,d:5.9},
  {name:'Cocina',area:'13,36',x:3.55,z:-1.7,w:3.45,d:3.15},
  {name:'Logia',area:'6,41',x:-1.75,z:2.4,w:2.05,d:3.1},
  {name:'Acceso',area:'7,09',x:.45,z:1.7,w:1.8,d:3.8},
  {name:'Baño 2',area:'4,48',x:2.5,z:1.7,w:2.3,d:1.65},
  {name:'Despensa',area:'2,79',x:5,z:1.7,w:2,d:1.65},
  {name:'Vestidor',area:'3,33',x:2.5,z:3.55,w:2.3,d:1.95},
  {name:'Sala técnica',area:'5,97',x:5,z:3.55,w:2,d:1.95},
];
export type Wall = {x:number;z:number;length:number;axis:'x'|'z';outside?:boolean;open?:[number,number,number,number][]};
// Openings: center along wall, width, sill, head (metres, illustrative).
export const walls: Wall[] = [
  {x:-7.255,z:.85,length:9.7,axis:'z',outside:true,open:[[-2.4,1.8,.8,2.25],[3.7,1.8,.8,2.25]]},
  {x:7.255,z:.85,length:9.7,axis:'z',outside:true,open:[[-.4,1.5,1.15,2.3],[4.4,1.1,.8,2.2]]},
  {x:0,z:5.7,length:14.51,axis:'x',outside:true,open:[[-4.8,2,.8,2.3],[1.3,1.15,0,2.25],[6,1.1,.8,2.3]]},
  {x:-5.05,z:-4,length:4.41,axis:'x',outside:true,open:[[-5,1.8,0,2.5]]},
  {x:5.38,z:-4,length:3.75,axis:'x',outside:true,open:[[5.2,1.7,0,2.5]]},
  {x:-2.85,z:-4.85,length:1.7,axis:'z',outside:true},
  {x:3.505,z:-4.85,length:1.7,axis:'z',outside:true},
  {x:.3275,z:-5.7,length:6.355,axis:'x',outside:true,open:[[.3275,5.8,0,2.7]]},
  {x:-2.75,z:-1.55,length:4.9,axis:'z',open:[[.15,.9,0,2.15]]},
  {x:-4.95,z:.9,length:4.4,axis:'x'},
  {x:-4.65,z:2.65,length:5.2,axis:'x',open:[[-3.25,.9,0,2.15]]},
  {x:-4.5,z:1.8,length:1.8,axis:'z',open:[[1.8,.8,0,2.15]]},
  {x:-1.9,z:4.25,length:2.9,axis:'z'},
  {x:-.75,z:2.3,length:2.3,axis:'x',open:[[-.7,.8,0,2.15]]},
  {x:.4,z:4,length:3.4,axis:'z'},
  {x:2.4,z:3.55,length:4.3,axis:'z',open:[[2.2,.8,0,2.15],[4.6,.8,0,2.15]]},
  {x:4.8,z:1.5,length:4.8,axis:'x'},
  {x:4.8,z:3.45,length:4.8,axis:'x'},
  {x:4.9,z:3.6,length:4.2,axis:'z',open:[[2.3,.7,0,2.15],[4.5,.8,0,2.15]]},
];
