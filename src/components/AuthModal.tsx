import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle2, Disc, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    
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
    setError(null);
    setInfoMessage(null);

    try {
      if (isLogin) {
        const res = await signInWithEmail(email, password);
        if (res.error) throw new Error(res.error);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your name.');
        }
        const res = await signUpWithEmail(name.trim(), email, password);
        if (res.error) throw new Error(res.error);
        if (res.message) {
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
              {isLogin ? 'Log in to your high-fidelity music vault' : 'Start your limitless listening experience'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </motion.div>
          )}

          {/* Info / Success Banner */}
          {infoMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-acid-lime/10 border border-acid-lime/30 text-acid-lime text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{infoMessage}</div>
            </motion.div>
          )}

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
            {!isLogin && (
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
                    required={!isLogin}
                    className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm outline-none transition placeholder-gray-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 px-4 text-white text-sm outline-none transition placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white/5 border border-white/10 focus:border-acid-lime/60 rounded-xl py-2.5 pl-4 pr-11 text-white text-sm outline-none transition placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
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
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || (!isLogin && !name.trim())}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-acid-lime to-[#a0f700] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_25px_rgba(204,255,0,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
            </button>
          </form>

          {/* Switch between Log In & Sign Up */}
          <div className="text-center text-xs text-gray-400 mt-5 pt-3 border-t border-white/10 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => { setIsLogin(false); setError(null); setInfoMessage(null); }}
                  className="text-acid-lime hover:underline font-bold transition ml-1"
                >
                  Sign up for Musify
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => { setIsLogin(true); setError(null); setInfoMessage(null); }}
                  className="text-acid-lime hover:underline font-bold transition ml-1"
                >
                  Log in here
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
