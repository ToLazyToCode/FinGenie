/**
 * Reusable confirmation modal for destructive actions.
 * Requires user to type a confirmation phrase for high-risk actions.
 */

import { useState } from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Tailwind color class for confirm button (default: bg-red-600 hover:bg-red-700) */
  confirmColor?: string;
  /** If set, user must type this phrase to enable the confirm button */
  confirmPhrase?: string;
  /** Optional textarea for additional input (e.g., ban reason) */
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'bg-red-600 hover:bg-red-700',
  confirmPhrase,
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [phrase, setPhrase] = useState('');
  const [inputValue, setInputValue] = useState('');

  if (!open) return null;

  const phraseMatch = !confirmPhrase || phrase === confirmPhrase;
  const inputValid = !inputRequired || inputValue.trim().length > 0;
  const canConfirm = phraseMatch && inputValid;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(inputValue || undefined);
    setPhrase('');
    setInputValue('');
  };

  const handleCancel = () => {
    setPhrase('');
    setInputValue('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center text-red-400 text-lg">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        </div>

        {/* Message */}
        <p className="text-slate-400 text-sm mb-4 leading-relaxed">{message}</p>

        {/* Optional input area */}
        {inputLabel && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {inputLabel} {inputRequired && <span className="text-red-400">*</span>}
            </label>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              rows={3}
            />
          </div>
        )}

        {/* Confirmation phrase */}
        {confirmPhrase && (
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-2">
              Type <code className="bg-slate-700 px-2 py-0.5 rounded text-red-300 font-mono text-xs">{confirmPhrase}</code> to confirm:
            </p>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
              placeholder={confirmPhrase}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
