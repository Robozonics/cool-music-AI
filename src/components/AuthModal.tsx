import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, signInWithGoogle } = useAuthStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Some users might need to check email, but often it auto signs in if email confirm is off.
        alert('Signed up successfully! (If email confirmation is enabled on your Supabase, check your inbox)');
      }
      setAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAuthModalOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="relative w-full max-w-md bg-zinc-950 border border-white/10 sm:rounded-3xl rounded-t-3xl sm:rounded-b-3xl overflow-hidden shadow-2xl flex flex-col p-6"
        >
          <button 
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="text-center mb-8 mt-2">
            <h2 className="text-2xl font-black text-white mb-2">
              {isLogin ? 'Welcome Back to Musify' : 'Join Musify'}
            </h2>
            <p className="text-sm text-gray-400">
              {isLogin ? 'Log in to sync your playlists and activity' : 'Create an account to save your music anywhere'}
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-6 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs">
              Supabase is not configured! Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file.
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              disabled={!isSupabaseConfigured}
              className="w-full py-3.5 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:bg-gray-100 transition disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 font-medium uppercase">Or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-acid-lime/50 transition"
                />
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-acid-lime/50 transition"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !isSupabaseConfigured || !email || !password}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-acid-lime to-[#a0f700] text-black font-black uppercase tracking-widest mt-2 hover:shadow-[0_0_30px_rgba(204,255,0,0.4)] transition disabled:opacity-50 disabled:shadow-none flex justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log In' : 'Sign Up')}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6 pb-safe">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-acid-lime font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
