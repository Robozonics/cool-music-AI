import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { usePlayerStore } from './usePlayerStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  setAuthModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncUserData: () => Promise<void>;
  saveActivity: (trackId: string, action: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthModalOpen: false,
  
  setUser: (user) => set({ user }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  
  signInWithGoogle: async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Add credentials to .env.local');
      return;
    }
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  },
  
  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
      set({ user: null });
      // We could clear local queues/playlists here, but Spotify keeps local state if disconnected.
    }
  },
  
  // Sync playlists and activity from Supabase DB to local PlayerStore
  syncUserData: async () => {
    const { user } = get();
    if (!user || !supabase) return;

    try {
      // 1. Fetch user playlists
      const { data: playlists } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id);
        
      if (playlists && playlists.length > 0) {
        // Here we can sync with usePlayerStore if we had a setPlaylists action
        // usePlayerStore.getState().setPlaylists(playlists);
      }

      // 2. Fetch user activity (recent plays, likes)
      // This is a placeholder for when tables are created in Supabase
      
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  },
  
  saveActivity: async (trackId: string, action: string) => {
    const { user } = get();
    if (!user || !supabase) return;
    
    try {
      await supabase.from('activity').insert({
        user_id: user.id,
        track_id: trackId,
        action: action,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      // ignore
    }
  }
}));

// Initialize auth listener
if (isSupabaseConfigured && supabase) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setUser(session?.user ?? null);
    useAuthStore.setState({ isLoading: false });
    if (session?.user) {
      useAuthStore.getState().syncUserData();
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setUser(session?.user ?? null);
    if (session?.user) {
      useAuthStore.getState().syncUserData();
    }
  });
} else {
  // Not configured, just finish loading
  useAuthStore.setState({ isLoading: false });
}
