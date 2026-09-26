import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, User as UserIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuthStore, getUserInitial, getUserDisplayName } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';

export const SpotifyAccountButton: React.FC = () => {
  const { user, setAuthModalOpen, signOut } = useAuthStore();
  const setApiKeyModalOpen = usePlayerStore(state => state.setApiKeyModalOpen);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initial = getUserInitial(user);
  const displayName = getUserDisplayName(user);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => setAuthModalOpen(true)}
        className="px-5 py-2 rounded-full bg-white hover:bg-neutral-100 text-black font-extrabold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
        title="Log In"
      >
        <UserIcon className="w-3.5 h-3.5 fill-current" />
        <span>Log in</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Spotify Profile Circle with Name Initial */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-9 h-9 rounded-full bg-[#191414] hover:bg-[#282828] border-2 border-[#1ed760] text-white font-black text-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg select-none cursor-pointer focus:outline-none"
        title={`Logged in as ${displayName}`}
      >
        <span className="leading-none drop-shadow-sm">{initial}</span>
      </button>

      {/* Spotify Profile Dropdown Menu */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-64 rounded-xl bg-[#282828] border border-white/10 shadow-2xl p-1.5 z-50 text-white select-none backdrop-blur-xl"
          >
            {/* Header info */}
            <div className="flex items-center gap-3 p-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#1ed760] text-[#1ed760] font-black text-base flex items-center justify-center shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-white truncate">{displayName}</h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1ed760] shrink-0" />
                </div>
                <p className="text-xs text-[#a7a7a7] truncate">{user.email}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  alert(`Musify Profile\nName: ${displayName}\nEmail: ${user.email}\nStatus: Verified Premium Access`);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#e0e0e0] hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <span>Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#a7a7a7]" />
              </button>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setApiKeyModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#e0e0e0] hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <span>Settings</span>
                <Settings className="w-3.5 h-3.5 text-[#a7a7a7]" />
              </button>
            </div>

            <div className="h-px bg-white/10 my-1" />

            {/* Log Out */}
            <button
              onClick={async () => {
                setIsDropdownOpen(false);
                await signOut();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
            >
              <span>Log out</span>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
