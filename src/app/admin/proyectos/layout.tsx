import AlbumSeoOptionsAssistant from '@/components/admin/AlbumSeoOptionsAssistant';

export default function InspirationStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="inspiration-studio-surface">
      <AlbumSeoOptionsAssistant />
      {children}
      <style>{`
        .inspiration-studio-surface,
        .inspiration-studio-surface main,
        .inspiration-studio-surface section,
        .inspiration-studio-surface article,
        .inspiration-studio-surface aside,
        .inspiration-studio-surface header,
        .inspiration-studio-surface label,
        .inspiration-studio-surface input,
        .inspiration-studio-surface textarea,
        .inspiration-studio-surface select,
        .inspiration-studio-surface button {
          border-color: transparent !important;
          --tw-ring-color: transparent !important;
          --tw-ring-offset-shadow: 0 0 #0000 !important;
        }
        .inspiration-studio-surface [class*="border-"] { border-width: 0 !important; }
        .inspiration-studio-surface [class*="ring-"] { --tw-ring-shadow: 0 0 #0000 !important; }
        .inspiration-studio-surface input,
        .inspiration-studio-surface textarea,
        .inspiration-studio-surface select {
          outline: none !important;
          box-shadow: inset 0 0 0 1px rgba(23,24,32,.06) !important;
        }
        .inspiration-studio-surface input:focus,
        .inspiration-studio-surface textarea:focus,
        .inspiration-studio-surface select:focus {
          box-shadow: inset 0 0 0 2px rgba(182,144,108,.42), 0 10px 30px rgba(23,24,32,.08) !important;
        }
      `}</style>
    </div>
  );
}
