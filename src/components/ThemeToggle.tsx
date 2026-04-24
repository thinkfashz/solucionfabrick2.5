'use client';

export default function ThemeToggle() {
  const moonIcon = (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
    </svg>
  );

  return (
    <>
      {/* Mobile: dark mode indicator */}
      <div
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full border"
        style={{
          background: 'var(--glass)',
          borderColor: 'var(--border)',
          color: 'var(--accent)',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Tema: Oscuro"
        title="Tema: Oscuro"
      >
        {moonIcon}
      </div>

      {/* Desktop: active theme pill */}
      <div
        className="hidden lg:flex items-center gap-0.5 rounded-full p-1 border"
        style={{
          background: 'var(--glass)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          aria-label="Oscuro"
          title="Oscuro"
          className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200"
          style={{
            background: 'var(--accent)',
            color: '#000',
          }}
        >
          {moonIcon}
        </div>
      </div>
    </>
  );
}
