import AdvertisingWorkspaceHeader from '@/components/admin/AdvertisingWorkspaceHeader';

export default function AdvertisingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="advertising-workspace min-h-screen bg-[#F8F0E9] px-1 pb-24 text-[#171820] sm:px-3 lg:pb-8">
      <div className="mx-auto max-w-[1500px]">
        <AdvertisingWorkspaceHeader />
        {children}
      </div>
      <style>{`
        .advertising-workspace > div > main {
          min-height: auto !important;
          background: transparent !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          padding-top: 0 !important;
        }
        .advertising-workspace > div > main > div { max-width: 1500px !important; }
      `}</style>
    </div>
  );
}
