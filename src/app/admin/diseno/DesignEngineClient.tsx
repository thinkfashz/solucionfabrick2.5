'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Paintbrush, LayoutTemplate, Type, Palette, CheckCircle, RefreshCcw } from 'lucide-react';
import { AdminBaseCard, AdminBaseGrid } from '@/components/admin/baseui-kit';

export default function DesignEngineClient() {
  const [accentColor, setAccentColor] = useState('#fbbf24'); // default amber-400
  const [logoText, setLogoText] = useState('SOLUCIONES FABRICK');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const savedColor = localStorage.getItem('admin-accent-color');
    const savedLogo = localStorage.getItem('admin-logo-text');
    if (savedColor) setAccentColor(savedColor);
    if (savedLogo) setLogoText(savedLogo);
  }, []);

  const handleSave = () => {
    // Save to localStorage so it persists
    localStorage.setItem('admin-accent-color', accentColor);
    localStorage.setItem('admin-logo-text', logoText);

    // Inject custom CSS variable to body
    document.documentElement.style.setProperty('--admin-accent', accentColor);

    // Trigger an event so the Sidebar updates its logo text (requires listening for this event in sidebar)
    window.dispatchEvent(new CustomEvent('admin-design-updated', { detail: { logoText } }));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setAccentColor('#fbbf24');
    setLogoText('SOLUCIONES FABRICK');
    localStorage.removeItem('admin-accent-color');
    localStorage.removeItem('admin-logo-text');
    document.documentElement.style.removeProperty('--admin-accent');
    window.dispatchEvent(new CustomEvent('admin-design-updated', { detail: { logoText: 'SOLUCIONES FABRICK' } }));
  };

  return (
    <div className="space-y-8">
      <AdminBaseGrid cols="2">
        {/* Colors & Branding */}
        <AdminBaseCard title="Marca y Colores" description="Define la identidad de tu panel." icon={Palette} tone="gold">
          <div className="space-y-5 mt-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Nombre de la Empresa</label>
              <input
                type="text"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                placeholder="Ej: Mi Empresa SA"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Color de Énfasis (Acento)</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </AdminBaseCard>

        {/* Live Preview Card */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/40 mix-blend-overlay" />

          <div className="relative z-10 w-full max-w-sm">
            <h3 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-[0.2em] text-center">Vista Previa</h3>

            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}>
                   <LayoutTemplate size={16} />
                </div>
                <div>
                   <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: accentColor }}>{logoText}</p>
                   <p className="text-[9px] uppercase text-zinc-500 tracking-[0.2em]">Studio Admin</p>
                </div>
              </div>

              <div className="h-px w-full bg-white/5 my-2" />

              <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: `${accentColor}10`, borderLeft: `2px solid ${accentColor}` }}>
                 <Paintbrush size={14} style={{ color: accentColor }} />
                 <span className="text-sm font-medium" style={{ color: accentColor }}>Módulo Activo</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg text-zinc-400">
                 <Type size={14} />
                 <span className="text-sm">Módulo Inactivo</span>
              </div>

              <button className="mt-2 w-full py-2 rounded-lg text-xs font-bold transition-all text-black" style={{ backgroundColor: accentColor }}>
                Botón Principal
              </button>
            </div>
          </div>
        </div>
      </AdminBaseGrid>

      {/* Actions */}
      <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/10 p-4 rounded-2xl">
        <button
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-xl font-bold text-sm transition-all"
        >
          {saved ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Paintbrush className="w-4 h-4" />}
          {saved ? 'Guardado' : 'Aplicar Diseño Global'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 bg-transparent text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 px-6 py-3 rounded-xl font-bold text-sm transition-all"
        >
          <RefreshCcw className="w-4 h-4" /> Restaurar Predeterminado
        </button>
      </div>
    </div>
  );
}
