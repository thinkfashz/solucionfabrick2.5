'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import SilverGoldButton from './SilverGoldButton';

interface ExitConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitConfirmModal({ onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="welcome-box max-w-sm w-full mx-4 p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-4 text-yellow-400/70" />
        <h3 className="font-playfair text-xl text-white mb-2">¿Salir de la tienda?</h3>
        <p className="text-white/40 text-sm mb-6">Volverás al inicio</p>
        <div className="flex gap-3 justify-center">
          <SilverGoldButton onClick={onConfirm}>Sí, salir</SilverGoldButton>
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-full border border-white/10 text-white/50 text-sm hover:border-white/30 hover:text-white/80 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
