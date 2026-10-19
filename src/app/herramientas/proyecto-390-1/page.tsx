import type { Metadata } from 'next';
import Plano390Walkthrough from '@/components/store/plano390/Plano390Walkthrough';
import { SITE_URL } from '@/lib/seo';

const CANONICAL=`${SITE_URL}/herramientas/proyecto-390-1`;
export const metadata:Metadata={title:'Recorrido 3D · Proyecto 390-1 (127 m²) | Soluciones Fabrick',description:'Recorrido 3D primera persona del plano Proyecto 390-1: 3 dormitorios, sauna, terraza y cocina-comedor de 44 m². Modo guiado, puntos de foto y personajes en la obra.',alternates:{canonical:CANONICAL},openGraph:{title:'Recorrido 3D · Proyecto 390-1 (127 m²) | Soluciones Fabrick',description:'Walkthrough 3D del plano 390-1 con personajes, puntos de foto y recorrido guiado.',url:CANONICAL,images:[{url:'/brand/soluciones-fabrick-social.png',width:1200,height:630,alt:'Recorrido 3D Proyecto 390-1 Soluciones Fabrick'}]}};
export default function Plano390Page(){return <Plano390Walkthrough/>}
