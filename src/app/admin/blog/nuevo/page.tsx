import type { Metadata } from 'next';
import { BlogEditor } from '../BlogEditor';

export const metadata: Metadata = { title: 'Nueva entrada · Blog · Admin' };

export default function NewBlogPostPage() {
  return <BlogEditor isNew initial={{ published: false, body_md: '' }} />;
}
