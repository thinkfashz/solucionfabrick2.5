import EnvClient from './EnvClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Variables de entorno · Admin',
};

export default function EnvPage() {
  return <EnvClient />;
}
