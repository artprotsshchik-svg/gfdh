import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        className="w-full max-w-md bg-[#1a1d21] border border-[#2a2e33] rounded-[6px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#2a2e33] bg-[#121417] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#e6e8ea]" id="confirm-dialog-title">
            <AlertTriangle className="w-4 h-4 text-[#e5a93c] shrink-0" aria-hidden="true" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-[4px] text-[#8b9199] hover:text-[#e6e8ea] hover:bg-[#22262b] transition-colors duration-150"
            aria-label="Закрыть диалог"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p id="confirm-dialog-desc" className="text-xs text-[#8b9199] leading-relaxed">
            {description}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-[4px] bg-[#121417] hover:bg-[#22262b] border border-[#2a2e33] text-xs font-medium text-[#e6e8ea] transition-colors duration-150"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              autoFocus
              onClick={onConfirm}
              className="px-3 py-1.5 rounded-[4px] bg-[#e55353] hover:bg-[#d14747] text-[#121417] text-xs font-semibold transition-colors duration-150"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
