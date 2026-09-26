import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    
    const res = await signInWithGoogle();
    if (res?.error) {
      if (
        res.error.toLowerCase().includes('provider is not enabled') || 
        res.error.toLowerCase().includes('validation_failed') ||
        res.error.toLowerCase().includes('unsupported provider')
      ) {
        setError('Google sign-in is not enabled in your Supabase project dashboard yet. Please use Email or 1-Click Guest access below!');
      } else {
        setError(res.error);
      }
    }
    setLoading(false);
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
    signInAsGuest(name.trim() || 'Spotify User');
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

  const SpotifyLogo = () => (
    <div className="w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(30,215,96,0.3)]">
      <svg className="w-7 h-7 text-black fill-current" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.31c-.218.357-.68.472-1.037.254-2.843-1.737-6.423-2.13-10.638-1.168-.407.094-.816-.16-.91-.567-.094-.407.16-.816.567-.91 4.62-1.055 8.577-.61 11.764 1.354.357.218.472.68.254 1.037zm1.47-3.266c-.274.446-.86.587-1.306.313-3.255-2.002-8.218-2.583-12.068-1.414-.502.152-1.033-.133-1.185-.635-.152-.502.133-1.033.635-1.185 4.407-1.338 9.878-.694 13.61 1.615.446.274.587.86.313 1.306zm.127-3.41c-3.903-2.318-10.337-2.532-14.072-1.397-.6.182-1.234-.16-1.416-.76-.182-.6.16-1.234.76-1.416 4.29-1.302 11.39-1.047 15.88 1.617.54.32.716 1.02.396 1.56-.32.54-1.02.716-1.56.396z" />
      </svg>
    </div>
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
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />
        
        {/* Spotify Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-md bg-[#121212] border border-[#282828] sm:rounded-3xl rounded-t-3xl sm:rounded-b-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full text-[#a7a7a7] hover:text-white hover:bg-[#282828] transition z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Spotify Branding & Title */}
          <div className="text-center mt-2 mb-6">
            <SpotifyLogo />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isLogin ? 'Log in to Musify' : 'Sign up to start listening'}
            </h1>
            <p className="text-xs text-[#a7a7a7] mt-1.5 font-medium">
              {isLogin ? 'Welcome back to your high-fidelity music vault' : 'Listen without limits, ads, or restrictions'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
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
              className="mb-4 p-3.5 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 text-[#1ed760] text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{infoMessage}</div>
            </motion.div>
          )}

          {/* Social OAuth & Quick Login Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-5 rounded-full border border-[#727272] hover:border-white text-white font-bold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] bg-transparent disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-3 px-5 rounded-full border border-[#1ed760]/40 text-[#1ed760] hover:bg-[#1ed760]/10 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Continue as Guest (Instant Access)</span>
            </button>
          </div>

          {/* Spotify Divider */}
          <div className="w-full flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#282828]" />
            <span className="text-[11px] uppercase tracking-widest text-[#a7a7a7] font-bold">or</span>
            <div className="flex-1 h-px bg-[#282828]" />
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">What should we call you?</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your profile name"
                  required={!isLogin}
                  className="w-full bg-[#121212] border border-[#727272] hover:border-white focus:border-white focus:ring-1 focus:ring-white rounded-md py-3 px-4 text-white text-sm outline-none transition placeholder-[#535353]"
                />
                <p className="text-[11px] text-[#a7a7a7] mt-1">This appears on your profile and avatar.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                {isLogin ? 'Email or username' : 'Email address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@domain.com"
                required
                className="w-full bg-[#121212] border border-[#727272] hover:border-white focus:border-white focus:ring-1 focus:ring-white rounded-md py-3 px-4 text-white text-sm outline-none transition placeholder-[#535353]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-[#121212] border border-[#727272] hover:border-white focus:border-white focus:ring-1 focus:ring-white rounded-md py-3 pl-4 pr-11 text-white text-sm outline-none transition placeholder-[#535353]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a7a7a7] hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#a7a7a7] hover:text-white">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="accent-[#1ed760] w-4 h-4 rounded cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || (!isLogin && !name.trim())}
              className="w-full py-3.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-extrabold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-4"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
            </button>
          </form>

          {/* Switch between Log In & Sign Up */}
          <div className="text-center text-xs text-[#a7a7a7] mt-8 pt-4 border-t border-[#282828]">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => { setIsLogin(false); setError(null); setInfoMessage(null); }}
                  className="text-white hover:text-[#1ed760] font-bold underline transition ml-1"
                >
                  Sign up for Musify
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => { setIsLogin(true); setError(null); setInfoMessage(null); }}
                  className="text-white hover:text-[#1ed760] font-bold underline transition ml-1"
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
