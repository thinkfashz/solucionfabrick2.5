import type { Metadata } from 'next';
import MetalconConstructionLabV2 from '@/components/store/MetalconConstructionLabV2';
import { SITE_URL } from '@/lib/seo';

const CANONICAL=`${SITE_URL}/herramientas/metalcon/lab`;
export const metadata:Metadata={title:'Laboratorio constructivo Metalcon 4D | Soluciones Fabrick',description:'Recorre una vivienda Metalcon en pantalla completa, inspecciona capas, siding horizontal, cubierta, sanitaria y desglose aproximado de materiales con modo de recorrido tipo primera persona.',alternates:{canonical:CANONICAL},openGraph:{title:'Laboratorio constructivo Metalcon 4D | Soluciones Fabrick',description:'Capas, siding, techumbre, desglose e instalaciones en un laboratorio 3D/4D inmersivo.',url:CANONICAL,images:[{url:'/brand/soluciones-fabrick-social.png',width:1200,height:630,alt:'Laboratorio constructivo Metalcon Soluciones Fabrick'}]}};
export default function MetalconLabPage(){return <MetalconConstructionLabV2/>}
