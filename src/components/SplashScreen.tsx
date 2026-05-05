'use client';

import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-black to-orange-500/5" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 animate-fade-in">
        {/* Logo Container */}
        <div className="flex flex-col items-center gap-4">
          {/* Geometric Logo - Simplified */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 animate-pulse">
            {/* Outer circle */}
            <div className="absolute inset-0 rounded-full border-2 border-yellow-400/50 animate-spin-slow" />

            {/* Inner geometric shape */}
            <div className="absolute inset-2 flex items-center justify-center">
              <div className="w-full h-full relative">
                {/* Building blocks icon */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Foundation */}
                  <rect x="20" y="60" width="60" height="20" />

                  {/* Walls */}
                  <rect x="30" y="40" width="15" height="20" />
                  <rect x="55" y="40" width="15" height="20" />

                  {/* Roof/Top */}
                  <polygon points="25,40 50,20 75,40" />

                  {/* Door */}
                  <rect x="42" y="65" width="8" height="15" />
                  <circle cx="48" cy="72" r="1" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Accent dots */}
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-orange-400 rounded-full animate-bounce" />
            <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          </div>

          {/* Company Name */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
              Soluciones
            </h1>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Fabrick
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 tracking-widest mt-2 font-semibold">
              SPA
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center max-w-xs">
          <p className="text-zinc-400 text-sm md:text-base font-light">
            Tu obra en buenas manos
          </p>
        </div>

        {/* Loading Bar */}
        <div className="w-32 md:w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-transparent animate-loading-bar" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes loading-bar {
          0% {
            width: 0;
          }
          50% {
            width: 100%;
          }
          100% {
            width: 100%;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-loading-bar {
          animation: loading-bar 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
