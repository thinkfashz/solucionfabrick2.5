import EstadoClient from './EstadoClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Estado del sistema',
};

export default function EstadoPage() {
  return <EstadoClient />;
}
