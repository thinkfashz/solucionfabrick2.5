import AdCreatorLauncher from '@/components/admin/AdCreatorLauncher';

export default function AdvertisingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdCreatorLauncher />
      {children}
    </div>
  );
}
