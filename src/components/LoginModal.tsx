import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LogIn,
  Key,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  ShieldCheck,
  Clock,
  Building2,
  Sun,
  Moon,
} from 'lucide-react';

interface AuthFormCardProps {
  mode: 'page' | 'modal';
  onClose?: () => void;
}

const AuthFormCard: React.FC<AuthFormCardProps> = ({ mode, onClose }) => {
  const {
    loginWithCredentials,
    appSettings,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
  } = useApp();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');
    clearSessionExpiredNotice();

    if (!usernameInput.trim()) {
      setErrorMessage('Username atau email wajib diisi.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Password wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithCredentials(usernameInput, passwordInput);
      if (!res.success) {
        setErrorMessage(res.message || 'Login gagal.');
        return;
      }

      setUsernameInput('');
      setPasswordInput('');
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            {mode === 'page' ? <Building2 className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate">
              {mode === 'page'
                ? appSettings.appName || 'Credit Scoring & Survey Lapangan'
                : 'Ganti / Masuk Akun Pengguna'}
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {appSettings.institutionName || 'BMT Dana Insani'} · Silakan login dengan akun Anda
            </p>
          </div>
        </div>
        {mode === 'modal' && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Session Timeout Warning Notice (60 minutes idle) */}
      {mode === 'page' && sessionExpiredNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/50 p-3 text-xs text-amber-200 animate-in fade-in duration-200">
          <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{sessionExpiredNotice}</div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-xs text-rose-300 animate-in fade-in duration-200">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Username atau Email <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              autoComplete="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Masukkan username atau email akun"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-3 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Password Akun <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Masukkan password akun Anda"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-10 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            <span>{isSubmitting ? 'Memverifikasi Akun...' : 'Masuk ke Aplikasi'}</span>
          </button>
        </div>
      </form>

      {/* Keamanan & Auto-Logout 60 Menit */}
      <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
          <span>Sesi diawasi audit trail internal</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
          <span>Auto-logout setelah 60 menit tidak aktif</span>
        </div>
      </div>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const { theme, toggleTheme, appSettings } = useApp();

  return (
    <div
      data-theme={theme}
      data-color-theme={appSettings.colorTheme || 'emerald'}
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative ${
        theme === 'light'
          ? 'theme-light bg-slate-100 text-slate-900'
          : 'theme-dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top-right Theme Toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition-colors text-xs font-semibold"
          title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Mode Terang</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-indigo-600" />
              <span>Mode Gelap</span>
            </>
          )}
        </button>
      </div>

      <AuthFormCard mode="page" />

      <p className="mt-4 text-center text-[11px] text-slate-500">
        {appSettings.institutionName || 'BMT Dana Insani'} · {appSettings.appSubtitle || 'Sistem Penilaian Kredit & Survey Lapangan'}
      </p>
    </div>
  );
};

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen } = useApp();

  if (!isLoginModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg my-8">
        <AuthFormCard mode="modal" onClose={() => setIsLoginModalOpen(false)} />
      </div>
    </div>
  );
};
