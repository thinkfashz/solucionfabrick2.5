import { Star } from 'lucide-react';

type Props = {
  score?: number;
  label?: string;
  compact?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
};

function clampScore(value: number | undefined) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(0, Math.round(parsed)));
}

export default function InterestStars({
  score,
  label,
  compact = false,
  tone = 'light',
  className = '',
}: Props) {
  const safeScore = clampScore(score);
  const textColor = tone === 'dark' ? 'text-[#F2DFBB]' : 'text-[#6B4D35]';
  const mutedColor = tone === 'dark' ? 'text-white/45' : 'text-[#BFB8AC]';

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 ${className}`}
      title="Interés estimado por IA según intención visual y comercial. No corresponde a volumen verificado de Google Trends."
      aria-label={`Interés estimado ${safeScore} de 5${label ? `, ${label}` : ''}`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={`h-3.5 w-3.5 ${index < safeScore ? 'fill-[#F5871F] text-[#F5871F]' : tone === 'dark' ? 'text-white/18' : 'text-[#08090A]/15'}`}
          />
        ))}
      </span>
      {!compact ? (
        <span className={`text-[9px] font-black uppercase tracking-[.13em] ${textColor}`}>
          {label || 'Interés estimado'}
        </span>
      ) : null}
      <span className={`text-[8px] font-bold ${mutedColor}`}>IA · no volumen real</span>
    </span>
  );
}
