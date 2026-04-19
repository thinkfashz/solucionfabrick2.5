'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar from 0 → 100
    const startTime = Date.now();
    const duration = 1400;

    const frame = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p < 100) {
        requestAnimationFrame(frame);
      } else {
        // Hold briefly then fade out
        setTimeout(() => setVisible(false), 200);
      }
    };

    requestAnimationFrame(frame);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
        >
          {/* Logo SF */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <svg viewBox="0 0 160 80" className="h-20 w-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" aria-label="SF">
              <defs>
                <linearGradient id="sfGold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFE17A" />
                  <stop offset="60%" stopColor="#FFC700" />
                  <stop offset="100%" stopColor="#E2AE00" />
                </linearGradient>
              </defs>
              {/* S */}
              <text
                x="12"
                y="62"
                fontFamily="Montserrat, Arial, sans-serif"
                fontSize="72"
                fontWeight="900"
                fill="url(#sfGold)"
                letterSpacing="-2"
              >
                SF
              </text>
            </svg>
          </motion.div>

          {/* Progress bar */}
          <div className="w-48 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <motion.p
            className="mt-4 text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Soluciones Fabrick
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
