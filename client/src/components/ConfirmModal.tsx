import React from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  warningNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requirePassword?: boolean;
  passwordValue?: string;
  onPasswordChange?: (val: string) => void;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  warningNote,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requirePassword = false,
  passwordValue = '',
  onPasswordChange,
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 max-w-md w-full p-6 overflow-hidden transform transition-all text-zinc-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isDestructive ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{message}</p>

        {warningNote && (
          <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-zinc-300 leading-normal">
            <span className="font-semibold text-white">Important: </span>
            {warningNote}
          </div>
        )}

        {requirePassword && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Confirm Admin Password</span>
            </label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={passwordValue}
              onChange={(e) => onPasswordChange?.(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              autoFocus
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || (requirePassword && !passwordValue)}
            className="px-5 py-2 text-sm font-semibold text-black bg-white hover:bg-zinc-200 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            <span>{isLoading ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
