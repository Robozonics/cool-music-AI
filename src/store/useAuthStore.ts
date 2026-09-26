import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export const getUserInitial = (user: User | null): string => {
  if (!user) return 'U';
  const name = user.user_metadata?.full_name || 
               user.user_metadata?.name || 
               user.user_metadata?.display_name || 
               user.email?.split('@')[0] || 
               'User';
  return name.trim().charAt(0).toUpperCase() || 'U';
};

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'Account';
  return user.user_metadata?.full_name || 
         user.user_metadata?.name || 
         user.user_metadata?.display_name || 
         user.email?.split('@')[0] || 
         'Spotify User';
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  setAuthModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ error?: string; message?: string }>;
  signInAsGuest: (name?: string) => void;
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
  
  signInWithGoogle: async (): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured' };
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Google authentication failed' };
    }
  },

  signInWithEmail: async (email: string, password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      set({ user: data.user, isAuthModalOpen: false });
      localStorage.removeItem('musify_guest_user');
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to sign in' };
    }
  },

  signUpWithEmail: async (name: string, email: string, password: string): Promise<{ error?: string; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name,
            display_name: name
          }
        }
      });
      if (error) return { error: error.message };
      if (data.user) {
        set({ user: data.user, isAuthModalOpen: false });
        localStorage.removeItem('musify_guest_user');
      }
      return { message: 'Account created! (If email confirmation is enabled, please check your inbox).' };
    } catch (err: any) {
      return { error: err.message || 'Failed to create account' };
    }
  },

  signInAsGuest: (name: string = 'Spotify User') => {
    const guestUser: any = {
      id: 'guest-' + Date.now(),
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest'}@spotify.vip`,
      user_metadata: {
        full_name: name,
        name: name,
        display_name: name
      },
      app_metadata: { provider: 'guest' },
      aud: 'authenticated',
      created_at: new Date().toISOString()
    };
    set({ user: guestUser, isAuthModalOpen: false });
    localStorage.setItem('musify_guest_user', JSON.stringify(guestUser));
  },
  
  signOut: async () => {
    localStorage.removeItem('musify_guest_user');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    set({ user: null });
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
        // Reserved for database sync
      }
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

// Load persistent guest session if present
try {
  const savedGuest = localStorage.getItem('musify_guest_user');
  if (savedGuest) {
    const parsed = JSON.parse(savedGuest);
    useAuthStore.getState().setUser(parsed);
  }
} catch (e) {
  // ignore
}

// Initialize Supabase auth listener
if (isSupabaseConfigured && supabase) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      useAuthStore.getState().setUser(session.user);
      useAuthStore.getState().syncUserData();
    }
    useAuthStore.setState({ isLoading: false });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      useAuthStore.getState().setUser(session.user);
      useAuthStore.getState().syncUserData();
    } else if (!localStorage.getItem('musify_guest_user')) {
      useAuthStore.getState().setUser(null);
    }
  });
} else {
  useAuthStore.setState({ isLoading: false });
}
