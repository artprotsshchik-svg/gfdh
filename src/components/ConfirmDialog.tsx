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
        className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-[6px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#e6e6e6]" id="confirm-dialog-title">
            <AlertTriangle className="w-4 h-4 text-[#c99b52] shrink-0" aria-hidden="true" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-[4px] text-[#8f8f8f] hover:text-[#e6e6e6] hover:bg-[#222222]"
            aria-label="Закрыть диалог"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p id="confirm-dialog-desc" className="text-xs text-[#8f8f8f] leading-relaxed">
            {description}
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-[4px] bg-[#141414] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-medium text-[#e6e6e6] transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              autoFocus
              onClick={onConfirm}
              className="px-3 py-1.5 rounded-[4px] bg-[#cf6d6d] hover:bg-[#bd5e5e] text-[#121212] text-xs font-semibold transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
