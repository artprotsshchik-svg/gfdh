import { AlertTriangle, Check, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { CheckerTier } from '../utils/modLogic.ts';

interface StatusBadgeProps {
  tier: CheckerTier;
  label: string;
  className?: string;
}

export function StatusBadge({ tier, label, className = '' }: StatusBadgeProps) {
  switch (tier) {
    case 'green':
      return (
        <span className={`inline-flex items-center gap-1 text-[#6abf7b] font-semibold whitespace-nowrap ${className}`}>
          <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'lime':
      return (
        <span className={`inline-flex items-center gap-1 text-[#9ab86a] font-semibold whitespace-nowrap ${className}`}>
          <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'yellow':
      return (
        <span className={`inline-flex items-center gap-1 text-[#c99b52] font-semibold whitespace-nowrap ${className}`}>
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'red':
      return (
        <span className={`inline-flex items-center gap-1 text-[#cf6d6d] font-semibold whitespace-nowrap ${className}`}>
          <ShieldAlert className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
  }
}
