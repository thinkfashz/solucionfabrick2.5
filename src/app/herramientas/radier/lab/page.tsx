import type { Metadata } from 'next';
import RadierConstructionLabV2 from '@/components/store/RadierConstructionLabV2';
import { SITE_URL } from '@/lib/seo';

const CANONICAL=`${SITE_URL}/herramientas/radier/lab`;
export const metadata:Metadata={title:'Laboratorio de radier 4D | Soluciones Fabrick',description:'Visualiza cada etapa del radier con nombre, espesor, cota, área y cubicación aproximada: excavación, base, gravilla, barrera, malla, hormigón y terminación en pantalla completa.',alternates:{canonical:CANONICAL},openGraph:{title:'Laboratorio de radier 4D | Soluciones Fabrick',description:'Secuencia 4D con datos por capa, excavación visible, plataforma a +0,30 m y entorno inmersivo.',url:CANONICAL,images:[{url:'/brand/soluciones-fabrick-social.png',width:1200,height:630,alt:'Laboratorio de radier Soluciones Fabrick'}]}};
export default function RadierLabPage(){return <RadierConstructionLabV2/>}
