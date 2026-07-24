export default function InspirationStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="inspiration-studio-surface">
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
      `}</style>
    </div>
  );
}
