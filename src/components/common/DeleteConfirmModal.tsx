import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Lock, RefreshCw, Trash2, Unlock, X } from 'lucide-react';

export interface DeleteConfirmChip {
  label: string;
  accent?: boolean;
}

export type ConfirmModalTone = 'danger' | 'warning' | 'success';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  warningNote?: React.ReactNode;
  chips?: DeleteConfirmChip[];
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  theme?: 'light' | 'dark';
  tone?: ConfirmModalTone;
  isLoading?: boolean;
}

const TONE_CLASSES: Record<
  ConfirmModalTone,
  {
    light: {
      iconBox: string;
      warningCard: string;
      warningNote: string;
      accentChip: string;
      confirmBtn: string;
    };
    dark: {
      iconBox: string;
      warningCard: string;
      warningNote: string;
      accentChip: string;
      confirmBtn: string;
    };
  }
> = {
  danger: {
    light: {
      iconBox: 'bg-rose-50 border-rose-200 text-rose-600',
      warningCard: 'bg-rose-50/80 border-rose-200 text-slate-700',
      warningNote: 'text-rose-800/90',
      accentChip: 'bg-rose-50 border-rose-200 text-rose-700',
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25',
    },
    dark: {
      iconBox: 'bg-rose-500/15 border-rose-500/35 text-rose-400',
      warningCard: 'bg-rose-500/10 border-rose-500/35 text-slate-200',
      warningNote: 'text-rose-200/90',
      accentChip: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25',
    },
  },
  warning: {
    light: {
      iconBox: 'bg-amber-50 border-amber-200 text-amber-600',
      warningCard: 'bg-amber-50/80 border-amber-200 text-slate-700',
      warningNote: 'text-amber-900/90',
      accentChip: 'bg-amber-50 border-amber-200 text-amber-800',
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25',
    },
    dark: {
      iconBox: 'bg-amber-500/15 border-amber-500/35 text-amber-400',
      warningCard: 'bg-amber-500/10 border-amber-500/35 text-slate-200',
      warningNote: 'text-amber-200/90',
      accentChip: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25',
    },
  },
  success: {
    light: {
      iconBox: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      warningCard: 'bg-emerald-50/80 border-emerald-200 text-slate-700',
      warningNote: 'text-emerald-900/90',
      accentChip: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25',
    },
    dark: {
      iconBox: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400',
      warningCard: 'bg-emerald-500/10 border-emerald-500/35 text-slate-200',
      warningNote: 'text-emerald-200/90',
      accentChip: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
      confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25',
    },
  },
};

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  warningNote,
  chips = [],
  confirmLabel = 'Xác Nhận Xóa',
  loadingLabel = 'Đang xử lý...',
  cancelLabel = 'Hủy',
  theme = 'light',
  tone = 'danger',
  isLoading = false,
}) => {
  const titleId = useId();
  const isDark = theme === 'dark';
  const palette = TONE_CLASSES[tone][isDark ? 'dark' : 'light'];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const HeaderIcon = tone === 'success' ? CheckCircle2 : AlertTriangle;
  const ConfirmIcon = tone === 'warning' ? Lock : tone === 'success' ? Unlock : Trash2;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 ${
        isDark ? 'bg-slate-950/75' : 'bg-slate-900/60'
      }`}
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-[460px] w-full rounded-2xl p-5 space-y-4 shadow-2xl border animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-[#111827] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between gap-3 pb-3 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${palette.iconBox}`}
            >
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id={titleId}
                className={`text-base font-extrabold leading-snug ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  className={`text-xs mt-0.5 break-words ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Content Card */}
        <div className={`rounded-xl p-3.5 border space-y-2.5 text-xs ${palette.warningCard}`}>
          <div className="leading-relaxed">{description}</div>

          {warningNote && (
            <p className={`text-[11px] leading-relaxed ${palette.warningNote}`}>{warningNote}</p>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {chips.map((chip, idx) => (
                <span
                  key={`${chip.label}-${idx}`}
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                    chip.accent
                      ? palette.accentChip
                      : isDark
                        ? 'bg-slate-950/80 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-end gap-2.5 pt-2 border-t ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isLoading
                ? 'opacity-60 cursor-not-allowed ' + palette.confirmBtn
                : palette.confirmBtn + ' cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{loadingLabel}</span>
              </>
            ) : (
              <>
                <ConfirmIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
