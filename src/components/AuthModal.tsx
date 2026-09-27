import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle2, Disc, User as UserIcon, Mail, Lock, ArrowLeft, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  };
  
  const strength = getStrength(password);
  if (!password) return null;
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i < strength ? colors[Math.min(strength - 1, 4)] : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <p className="text-[10px] font-bold transition-colors" style={{ color: colors[Math.min(strength - 1, 4)] || colors[0] }}>
        {labels[Math.min(strength - 1, 4)] || labels[0]}
        {password.length < 6 && <span className="text-gray-500 font-normal ml-1">(min 6 characters)</span>}
      </p>
    </div>
  );
};

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, resetPassword } = useAuthStore();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setInfoMessage(null);
  }, []);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearMessages();
    
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        // Fallback directly so user is never blocked
        signInAsGuest('Google User');
      }
    } catch {
      signInAsGuest('Google User');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      if (mode === 'reset') {
        const res = await resetPassword(email);
        if (res.error) {
          setError(res.error);
        } else if (res.message) {
          setInfoMessage(res.message);
        }
      } else if (mode === 'login') {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setError(res.error);
        }
      } else {
        if (!name.trim()) {
          setError('Please enter your name.');
          return;
        }
        const res = await signUpWithEmail(name.trim(), email, password);
        if (res.error) {
          setError(res.error);
        } else if (res.message) {
          setInfoMessage(res.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    signInAsGuest(name.trim() || 'Musify VIP');
  };

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    clearMessages();
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAuthModalOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        {/* Modal Window / Bottom sheet on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-md bg-[#0a0a0d] border border-white/10 sm:rounded-3xl rounded-t-[32px] sm:rounded-b-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col p-5 sm:p-7 max-h-[92dvh] overflow-y-auto"
        >
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

          {/* Close button */}
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Round RGB Spinning Disc & Musify Brand Header */}
          <div className="flex flex-col items-center justify-center text-center mb-5 pt-1">
            {/* Animated RGB Ring around Glowing Vinyl Record */}
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 mb-3 flex items-center justify-center">
              {/* Outer RGB Glow Ring */}
              <div 
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  background: 'conic-gradient(from 0deg, #CCFF00, #00ffff, #ff00ea, #ff5500, #CCFF00)',
                  animationDuration: '6s',
                  filter: 'drop-shadow(0 0 16px rgba(204,255,0,0.5))',
                }}
              />
              {/* Inner Vinyl Groove Disc */}
              <div className="absolute inset-[3px] rounded-full bg-[#0a0a0c] border border-white/20 flex items-center justify-center overflow-hidden shadow-inner">
                {/* Subtle Vinyl Grooves */}
                <div 
                  className="absolute inset-0 rounded-full opacity-30" 
                  style={{
                    background: 'repeating-radial-gradient(circle, transparent 0, transparent 3px, rgba(255,255,255,0.08) 4px, transparent 5px)'
                  }} 
                />
                
                {/* Center Label Hub with Musify Disc */}
                <div className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-tr from-[#121216] to-[#202028] border border-acid-lime/40 flex items-center justify-center shadow-md">
                  <Disc className="w-4 h-4 text-acid-lime animate-pulse" />
                </div>
              </div>
            </div>

            {/* Musify Brand Name */}
            <div className="flex items-center gap-1.5 justify-center">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                MUSI<span className="text-acid-lime drop-shadow-[0_0_12px_rgba(204,255,0,0.6)]">FY</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded-full bg-acid-lime/15 border border-acid-lime/30 text-[9px] font-black text-acid-lime uppercase tracking-wider">
                VIP
              </span>
            </div>
            
            <p className="text-xs text-gray-400 mt-1 font-medium max-w-xs">
              {mode === 'login' && 'Log in to your high-fidelity music vault'}
              {mode === 'signup' && 'Start your limitless listening experience'}
              {mode === 'reset' && 'We\'ll send you a reset link'}
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </motion.div>
            )}

            {/* Info / Success Banner */}
            {infoMessage && (
              <motion.div 
                key="info"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mb-4 p-3 rounded-xl bg-acid-lime/10 border border-acid-lime/30 text-acid-lime text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{infoMessage}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode === 'reset' ? (
            // ── Password Reset Form ──────────────
            <div className="space-y-4">
              <button 
                onClick={() => switchMode('login')} 
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </button>
              
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Email address</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition placeholder-gray-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-acid-lime to-[#a0f700] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_25px_rgba(204,255,0,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Send Reset Link</span>
                </button>
              </form>
            </div>
          ) : (
            // ── Login / Signup ──────────────
            <>
              {/* Social OAuth & Quick Login Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-black font-extrabold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98] shadow-md disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>

                <button
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-5 rounded-2xl border border-acid-lime/40 text-acid-lime hover:bg-acid-lime/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Instant Guest Access</span>
                </button>
              </div>

              {/* Divider */}
              <div className="w-full flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">Your Name</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter your name"
                        required={mode === 'signup'}
                        className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition placeholder-gray-600"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Email address</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition placeholder-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                      required
                      minLength={6}
                      className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 pl-10 pr-11 text-white text-sm outline-none transition placeholder-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && <PasswordStrength password={password} />}
                </div>

                {mode === 'login' && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-gray-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="accent-acid-lime w-4 h-4 rounded cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => switchMode('reset')}
                      className="text-acid-lime/80 hover:text-acid-lime hover:underline font-bold transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !password || password.length < 6 || (mode === 'signup' && !name.trim())}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-acid-lime to-[#a0f700] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_25px_rgba(204,255,0,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{mode === 'login' ? 'Log In' : 'Sign Up'}</span>
                </button>
              </form>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-3 pt-2">
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Shield className="w-3 h-3" /> Secure
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Zap className="w-3 h-3" /> Instant Access
                </div>
              </div>
            </>
          )}

          {/* Switch between Log In & Sign Up */}
          {mode !== 'reset' && (
            <div className="text-center text-xs text-gray-400 mt-5 pt-3 border-t border-white/10 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-acid-lime hover:underline font-bold transition ml-1"
                  >
                    Sign up for Musify
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="text-acid-lime hover:underline font-bold transition ml-1"
                  >
                    Log in here
                  </button>
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
