'use client';

import { useState } from 'react';
import LocalProspectImportPanel from '@/modules/prospecting-engine/ui/LocalProspectImportPanel';
import type { LocalDetectedProspect } from '@/modules/prospecting-engine/types/import.types';
import PageEngineProspectingStudioExactClient from './PageEngineProspectingStudioExactClient';

const STORAGE = 'sf_page_engine_prospects_v3';

type LegacyProspect = {
  id: string;
  brand: string;
  client: string;
  account: string;
  followers: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  website: string;
  location: string;
  notes: string;
  logo: string;
};

function instagramAccount(value?: string | null) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (clean.startsWith('@')) return clean;
  const match = clean.match(/instagram\.com\/([^/?#]+)/i);
  return match?.[1] ? `@${match[1]}` : clean;
}

function toLegacyProspect(prospect: LocalDetectedProspect): LegacyProspect {
  return {
    id: prospect.id || prospect.local_id || Math.random().toString(36).slice(2, 9),
    brand: prospect.brand || 'Prospecto importado',
    client: prospect.client_name || '',
    account: instagramAccount(prospect.instagram),
    followers: prospect.followers || '',
    instagram: prospect.instagram || '',
    facebook: prospect.facebook || '',
    whatsapp: prospect.whatsapp || '',
    website: prospect.website || '',
    location: [prospect.city, prospect.region, prospect.country].filter(Boolean).join(', ') || 'Chile',
    notes: [
      prospect.industry ? `Rubro: ${prospect.industry}` : '',
      prospect.problem_detected ? `Problema: ${prospect.problem_detected}` : '',
      prospect.opportunity ? `Oportunidad: ${prospect.opportunity}` : '',
      prospect.probability_level ? `Probabilidad: ${prospect.probability_level}` : '',
      typeof prospect.score === 'number' ? `Score: ${prospect.score}` : '',
      prospect.notes || '',
    ].filter(Boolean).join('\n'),
    logo: typeof prospect.metadata?.logo === 'string' ? prospect.metadata.logo : '',
  };
}

function readLocalProspects(): LegacyProspect[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PageEngineProspectingStudioHybridClient() {
  const [studioKey, setStudioKey] = useState(0);
  const [message, setMessage] = useState('');

  function useProspectInEditor(prospect: LocalDetectedProspect) {
    const legacy = toLegacyProspect(prospect);
    const current = readLocalProspects().filter((item) => item.id !== legacy.id && item.brand !== legacy.brand);
    localStorage.setItem(STORAGE, JSON.stringify([legacy, ...current].slice(0, 120)));
    setMessage(`${legacy.brand} fue cargado en el editor local. El estudio se actualizó para que lo puedas usar como demo.`);
    setStudioKey((key) => key + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <div className="mx-auto w-full max-w-[1780px] space-y-4 overflow-x-hidden px-2 py-3 sm:px-4">
    <LocalProspectImportPanel onUseProspect={useProspectInEditor} onSaved={() => setMessage('Prospectos guardados en base de datos. Puedes usarlos para generar landing o seguimiento.')} />
    {message && <div className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">{message}</div>}
    <PageEngineProspectingStudioExactClient key={studioKey} />
  </div>;
}
