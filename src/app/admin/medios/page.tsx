import type { Metadata } from 'next';
import { MediaAdmin } from './MediaAdmin';

export const metadata: Metadata = { title: 'Medios · Admin' };

export default function MediaAdminPage() {
  return <MediaAdmin />;
}
