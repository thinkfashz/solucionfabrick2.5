import type { Metadata } from 'next';
import { StructuralMonitoringSimulator } from '@/components/store/StructuralMonitoringSimulator';
export const metadata:Metadata={title:'Simulador de monitoreo estructural | Soluciones Fabrick',description:'Panel educativo para simular sensores, eventos y alertas en una estructura Metalcon.'};
export default function MonitoringPage(){return <StructuralMonitoringSimulator/>}
