import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabase';
import logoImg from '../assets/logo.webp';

interface LoginProps {
  onSignIn: (session: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        onSignIn(data.session);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dot-grid px-4 relative">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-zoom-in flex flex-col items-center">
        
        {/* Brand Logo */}
        <img src={logoImg} alt="Aster Logo" className="h-36 w-auto object-contain mb-5" />

        <p className="text-gray-500 text-xs text-center mb-8 font-mono tracking-wide">
          Sign in to manage and upload product assets
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-700 text-xs font-bold leading-relaxed animate-slide-down font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-black">
              EMAIL, PHONE, OR EMPLOYEE ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-black">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email, phone, or id..."
                className="input-field pl-11"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-black">
              PASSWORD
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-black">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary-login mt-4"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              'SIGN IN'
            )}
          </button>
        </form>

        {/* Security caption */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t-2 border-gray-100 w-full justify-center">
          <ShieldCheck className="w-3 h-3 text-gray-300" />
          <p className="text-[8px] font-bold font-mono tracking-[0.15em] text-gray-300 text-center uppercase">
            SECURE CONNECTION — ENCRYPTED
          </p>
        </div>
      </div>
    </div>
  );
};
