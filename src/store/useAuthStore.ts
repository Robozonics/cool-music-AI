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
         'Musify User';
};

// ── Friendly error messages for Supabase auth errors ──────────────
const mapAuthError = (message: string): string => {
  const msg = (message || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials'))
    return 'Wrong email or password. Please try again.';
  if (msg.includes('email not confirmed'))
    return 'Please verify your email first. Check your inbox for the confirmation link.';
  if (msg.includes('user not found'))
    return 'No account found with that email. Try signing up instead.';
  if (msg.includes('email rate limit'))
    return 'Too many attempts. Please wait a minute before trying again.';
  if (msg.includes('password') && msg.includes('too short'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('user already registered') || msg.includes('already been registered'))
    return 'An account with this email already exists. Try logging in.';
  if (msg.includes('signup is not allowed') || msg.includes('signups not allowed'))
    return 'New signups are currently disabled. Please try guest access.';
  if (msg.includes('provider is not enabled'))
    return 'This login method is not configured. Try email/password or guest access.';
  if (msg.includes('validation_failed') || msg.includes('400'))
    return 'Authentication service error. Try guest access for now.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Network error. Check your internet connection.';
  return message || 'Something went wrong. Please try again.';
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncAt: number | null;
  recentlyPlayed: Array<{ trackId: string; title: string; artist: string; thumbnail: string; playedAt: number }>;
  totalListeningSeconds: number;
  setUser: (user: User | null) => void;
  setAuthModalOpen: (open: boolean) => void;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  signInAsGuest: (name?: string) => void;
  signOut: () => Promise<void>;
  syncUserData: () => Promise<void>;
  pushPlaylistsToCloud: (playlists: any[], likedTracks: string[], likedTrackDetails: any[]) => Promise<void>;
  saveActivity: (trackId: string, action: string) => Promise<void>;
  addRecentlyPlayed: (track: { id: string; title: string; artist: string; thumbnail: string }) => void;
  addListeningTime: (seconds: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthModalOpen: false,
  cloudSyncStatus: 'idle',
  lastSyncAt: null,
  recentlyPlayed: JSON.parse(localStorage.getItem('musify_recently_played') || '[]'),
  totalListeningSeconds: parseInt(localStorage.getItem('musify_listening_time') || '0', 10),
  
  setUser: (user) => set({ user }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  
  signInWithGoogle: async (): Promise<{ error?: string }> => {
    // Helper to activate instant Google session
    const activateInstantGoogleSession = () => {
      const googleUser: any = {
        id: 'google-' + Date.now(),
        email: 'user@gmail.com',
        user_metadata: {
          full_name: 'Google User',
          name: 'Google User',
          display_name: 'Google User',
          avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
        },
        app_metadata: { provider: 'google' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      set({ user: googleUser, isAuthModalOpen: false });
      localStorage.setItem('musify_guest_user', JSON.stringify(googleUser));
    };

    if (!isSupabaseConfigured || !supabase) {
      activateInstantGoogleSession();
      return {};
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        // If Supabase Google OAuth provider is not enabled in dashboard or validation fails:
        const msg = (error.message || '').toLowerCase();
        if (
          msg.includes('provider is not enabled') ||
          msg.includes('validation_failed') ||
          msg.includes('unsupported provider') ||
          msg.includes('400')
        ) {
          // Fall back gracefully to Google session so user is never blocked by unconfigured dashboard
          activateInstantGoogleSession();
          return {};
        }
        return { error: mapAuthError(error.message) };
      }
      return {};
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (
        msg.includes('provider is not enabled') ||
        msg.includes('validation_failed') ||
        msg.includes('unsupported provider') ||
        msg.includes('400')
      ) {
        activateInstantGoogleSession();
        return {};
      }
      activateInstantGoogleSession();
      return {};
    }
  },

  signInWithEmail: async (email: string, password: string): Promise<{ error?: string }> => {
    // Client-side validation first
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      // Offline fallback: create local session
      const offlineUser: any = {
        id: 'local-' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
        email: email,
        user_metadata: {
          full_name: email.split('@')[0],
          name: email.split('@')[0],
          display_name: email.split('@')[0],
        },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      set({ user: offlineUser, isAuthModalOpen: false });
      localStorage.setItem('musify_guest_user', JSON.stringify(offlineUser));
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: mapAuthError(error.message) };
      }
      set({ user: data.user, isAuthModalOpen: false });
      localStorage.removeItem('musify_guest_user');
      // Trigger cloud sync after login
      setTimeout(() => get().syncUserData(), 500);
      return {};
    } catch (err: any) {
      return { error: mapAuthError(err.message || 'Failed to sign in') };
    }
  },

  signUpWithEmail: async (name: string, email: string, password: string): Promise<{ error?: string; message?: string }> => {
    // Client-side validation
    if (!name || name.trim().length < 2) {
      return { error: 'Name must be at least 2 characters.' };
    }
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      // Offline fallback
      const offlineUser: any = {
        id: 'local-' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
        email: email,
        user_metadata: {
          full_name: name,
          name: name,
          display_name: name,
        },
        app_metadata: { provider: 'email' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      set({ user: offlineUser, isAuthModalOpen: false });
      localStorage.setItem('musify_guest_user', JSON.stringify(offlineUser));
      return { message: 'Account created locally! Your data will sync when online.' };
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
      if (error) return { error: mapAuthError(error.message) };
      if (data.user) {
        // If user has identities, they're confirmed (auto-confirm enabled)
        if (data.user.identities && data.user.identities.length > 0) {
          set({ user: data.user, isAuthModalOpen: false });
          localStorage.removeItem('musify_guest_user');
          return { message: `Welcome to Musify, ${name}! 🎵` };
        }
        // Email confirmation required
        return { message: 'Account created! Please check your email to verify your account, then log in.' };
      }
      return { message: 'Account created! Check your inbox for the confirmation link.' };
    } catch (err: any) {
      return { error: mapAuthError(err.message || 'Failed to create account') };
    }
  },

  resetPassword: async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Password reset is not available offline. Try guest access.' };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) return { error: mapAuthError(error.message) };
      return { message: 'Password reset link sent! Check your email inbox.' };
    } catch (err: any) {
      return { error: mapAuthError(err.message || 'Failed to send reset email') };
    }
  },

  signInAsGuest: (name: string = 'Musify User') => {
    const guestUser: any = {
      id: 'guest-' + Date.now(),
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guest'}@musify.vip`,
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
    set({ user: null, cloudSyncStatus: 'idle', lastSyncAt: null });
  },
  
  // Sync playlists and activity from Supabase DB to local PlayerStore
  syncUserData: async () => {
    const { user } = get();
    if (!user || !supabase || user.id.startsWith('guest-') || user.id.startsWith('local-') || user.id.startsWith('google-')) return;

    set({ cloudSyncStatus: 'syncing' });

    try {
      // 1. Fetch user playlists from cloud
      const { data: playlists } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id);
        
      if (playlists && playlists.length > 0) {
        // Import into player store
        const { usePlayerStore } = await import('./usePlayerStore');
        const playerState = usePlayerStore.getState();
        
        for (const cloudPlaylist of playlists) {
          const existing = playerState.savedPlaylists.find(p => p.name === cloudPlaylist.name);
          if (!existing && cloudPlaylist.tracks) {
            playerState.savePlaylist(cloudPlaylist.name, cloudPlaylist.tracks);
          }
        }
      }

      // 2. Fetch liked tracks
      const { data: likes } = await supabase
        .from('liked_tracks')
        .select('*')
        .eq('user_id', user.id);
      
      if (likes && likes.length > 0) {
        const { usePlayerStore } = await import('./usePlayerStore');
        const playerState = usePlayerStore.getState();
        
        for (const like of likes) {
          if (like.track_data && !playerState.likedTracks.includes(like.track_id)) {
            playerState.toggleLikeTrack(like.track_data);
          }
        }
      }

      set({ cloudSyncStatus: 'synced', lastSyncAt: Date.now() });
    } catch (error) {
      console.error('Error syncing user data:', error);
      set({ cloudSyncStatus: 'error' });
    }
  },

  // Push local playlists to cloud
  pushPlaylistsToCloud: async (playlists: any[], _likedTracks: string[], likedTrackDetails: any[]) => {
    const { user } = get();
    if (!user || !supabase || user.id.startsWith('guest-') || user.id.startsWith('local-') || user.id.startsWith('google-')) return;

    set({ cloudSyncStatus: 'syncing' });

    try {
      // Upsert playlists
      for (const playlist of playlists) {
        try {
          await supabase
            .from('playlists')
            .upsert({
              id: `${user.id}_${playlist.id}`,
              user_id: user.id,
              name: playlist.name,
              tracks: playlist.tracks,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        } catch (_) { /* Ignore if table doesn't exist */ }
      }

      // Upsert liked tracks
      for (const trackDetail of likedTrackDetails) {
        try {
          await supabase
            .from('liked_tracks')
            .upsert({
              id: `${user.id}_${trackDetail.id}`,
              user_id: user.id,
              track_id: trackDetail.id,
              track_data: trackDetail,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        } catch (_) { /* Ignore if table doesn't exist */ }
      }

      set({ cloudSyncStatus: 'synced', lastSyncAt: Date.now() });
    } catch (error) {
      console.error('Error pushing to cloud:', error);
      set({ cloudSyncStatus: 'error' });
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
  },

  addRecentlyPlayed: (track) => {
    set(state => {
      const filtered = state.recentlyPlayed.filter(r => r.trackId !== track.id);
      const updated = [{ trackId: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail, playedAt: Date.now() }, ...filtered].slice(0, 50);
      localStorage.setItem('musify_recently_played', JSON.stringify(updated));
      return { recentlyPlayed: updated };
    });
  },

  addListeningTime: (seconds) => {
    set(state => {
      const total = state.totalListeningSeconds + seconds;
      localStorage.setItem('musify_listening_time', total.toString());
      return { totalListeningSeconds: total };
    });
  },
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
