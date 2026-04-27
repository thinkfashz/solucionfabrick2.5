import type { Metadata } from 'next';
import { BlogAdminList } from './BlogAdminList';

export const metadata: Metadata = { title: 'Blog · Admin' };

export default function BlogAdminPage() {
  return <BlogAdminList />;
}
