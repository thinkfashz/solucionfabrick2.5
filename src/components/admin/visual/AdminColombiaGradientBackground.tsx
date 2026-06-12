import type { ReactNode } from 'react';

type Props = { children?: ReactNode };

export default function AdminColombiaGradientBackground({ children }: Props) {
  return <div className="sf-admin-colombia-bg">
    <div className="sf-admin-colombia-gradients" aria-hidden="true">
      <span className="sf-admin-blob sf-admin-blob-1" />
      <span className="sf-admin-blob sf-admin-blob-2" />
      <span className="sf-admin-blob sf-admin-blob-3" />
      <span className="sf-admin-blob sf-admin-blob-4" />
      <span className="sf-admin-blob sf-admin-blob-5" />
    </div>
    <div className="sf-admin-colombia-content">{children}</div>
  </div>;
}
