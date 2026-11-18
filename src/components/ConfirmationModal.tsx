import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  details = [],
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'primary',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md bg-white border border-[#E5E2DA] rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-[#F2EFE9]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                tone === 'danger'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-[#14532D]/10 text-[#14532D] border border-[#14532D]/20'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="confirm-modal-title" className="font-serif text-lg font-semibold text-[#181A18]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog konfirmasi"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#575B56] hover:bg-[#F2EFE9] hover:text-[#181A18]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-[#3F433E] leading-relaxed">{description}</p>
          {details.length > 0 && (
            <ul className="bg-[#F9F8F4] border border-[#E5E2DA] rounded-lg px-4 py-3 space-y-1.5 text-xs text-[#3F433E]">
              {details.map((item, idx) => (
                <li key={idx} className="leading-snug">
                  · {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 bg-[#F9F8F4] border-t border-[#E5E2DA] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-[#181A18] bg-white border border-[#D6CEBE] rounded-lg hover:bg-[#F2EFE9] whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 ${
              tone === 'danger'
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-[#14532D] hover:bg-[#114626]'
            }`}
          >
            {isProcessing ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
