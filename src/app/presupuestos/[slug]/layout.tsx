type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default function PresupuestoSlugLayout({ children }: LayoutProps) {
  return children;
}
