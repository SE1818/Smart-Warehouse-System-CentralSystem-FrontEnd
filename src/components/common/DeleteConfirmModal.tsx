import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2, X } from 'lucide-react';

export interface DeleteConfirmChip {
  label: string;
  accent?: boolean;
}

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
  confirmKeyword?: string;
  confirmInputPlaceholder?: string;
  theme?: 'light' | 'dark';
  isLoading?: boolean;
}

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
  confirmKeyword,
  confirmInputPlaceholder,
  theme = 'light',
  isLoading = false,
}) => {
  const titleId = useId();
  const [typedKeyword, setTypedKeyword] = useState('');

  const normalizedKeyword = (confirmKeyword || '').trim();
  const requiresStrictConfirm = normalizedKeyword.length > 0;
  const isKeywordMatched = !requiresStrictConfirm || typedKeyword.trim() === normalizedKeyword;
  const isConfirmDisabled = isLoading || !isKeywordMatched;
  const isDark = theme === 'dark';

  useEffect(() => {
    setTypedKeyword('');
  }, [isOpen, normalizedKeyword]);

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
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                isDark
                  ? 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
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

        {/* Red Warning Card */}
        <div
          className={`rounded-xl p-3.5 border space-y-2.5 text-xs ${
            isDark
              ? 'bg-rose-500/10 border-rose-500/35 text-slate-200'
              : 'bg-rose-50/80 border-rose-200 text-slate-700'
          }`}
        >
          <div className="leading-relaxed">{description}</div>

          {warningNote && (
            <p
              className={`text-[11px] leading-relaxed ${
                isDark ? 'text-rose-200/90' : 'text-rose-800/90'
              }`}
            >
              {warningNote}
            </p>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {chips.map((chip, idx) => (
                <span
                  key={`${chip.label}-${idx}`}
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                    chip.accent
                      ? isDark
                        ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
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

        {/* Tier 2: Strict Type-to-Confirm */}
        {requiresStrictConfirm && (
          <div className="space-y-2">
            <label
              className={`block text-xs font-medium leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              Nhập chính xác{' '}
              <code
                className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border select-all ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-700 text-rose-300'
                    : 'bg-slate-100 border-slate-200 text-rose-700'
                }`}
              >
                {normalizedKeyword}
              </code>{' '}
              để mở khóa nút xóa:
            </label>

            <input
              type="text"
              value={typedKeyword}
              onChange={(e) => setTypedKeyword(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
              placeholder={confirmInputPlaceholder || normalizedKeyword}
              className={`w-full px-3 py-2 rounded-xl border font-mono text-xs transition-colors focus:outline-none disabled:opacity-60 ${
                isKeywordMatched
                  ? isDark
                    ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200 focus:border-emerald-400'
                    : 'bg-emerald-50/50 border-emerald-400 text-emerald-900 focus:border-emerald-500'
                  : isDark
                    ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus:border-rose-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-rose-500'
              }`}
            />

            {isKeywordMatched ? (
              <p
                className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                  isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Đã khớp mã đối tượng — sẵn sàng xác nhận xóa</span>
              </p>
            ) : (
              <p
                className={`text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Nút xác nhận đang bị khóa cho đến khi khớp chính xác tên/mã đối tượng.
              </p>
            )}
          </div>
        )}

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
            disabled={isConfirmDisabled}
            onClick={() => void onConfirm()}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isConfirmDisabled
                ? isDark
                  ? 'bg-rose-600/35 text-rose-200/75 border border-rose-500/35 cursor-not-allowed'
                  : 'bg-rose-600/40 text-white/80 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{loadingLabel}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
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
