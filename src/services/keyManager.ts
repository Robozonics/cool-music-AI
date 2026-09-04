import { Capacitor } from '@capacitor/core';

// This file is kept for backward compatibility
// API keys are now handled securely on the backend via environment variables

export const getGeminiKey = async (): Promise<string | null> => {
  // API key is no longer exposed to frontend
  // All Gemini calls go through /api/gemini endpoint
  return null;
};

export const saveGeminiKey = async (key: string): Promise<void> => {
  // Deprecated: Keys should be set via Vercel/environment variables only
  console.warn('Direct key storage is deprecated. Use environment variables instead.');
};

export const removeGeminiKey = async (): Promise<void> => {
  // Deprecated: Keys should be managed via Vercel dashboard only
  console.warn('Key removal is deprecated. Keys should be managed via environment variables.');
};
