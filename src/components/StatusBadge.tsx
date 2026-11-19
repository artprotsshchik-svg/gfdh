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
        <span className={`inline-flex items-center gap-1 text-[#3ddc84] font-medium whitespace-nowrap ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'lime':
      return (
        <span className={`inline-flex items-center gap-1 text-[#3ddc84] font-medium whitespace-nowrap ${className}`}>
          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'yellow':
      return (
        <span className={`inline-flex items-center gap-1 text-[#e5a93c] font-medium whitespace-nowrap ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
    case 'red':
      return (
        <span className={`inline-flex items-center gap-1 text-[#e55353] font-medium whitespace-nowrap ${className}`}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      );
  }
}
