import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const KEY_NAME = 'gemini_api_key';

export const getGeminiKey = async (): Promise<string | null> => {
  // 1. Check env first
  if (import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  
  // 2. Check universal storage
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: KEY_NAME });
    return value;
  } else {
    return localStorage.getItem(KEY_NAME);
  }
};

export const saveGeminiKey = async (key: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: KEY_NAME, value: key });
  } else {
    localStorage.setItem(KEY_NAME, key);
  }
};

export const removeGeminiKey = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: KEY_NAME });
  } else {
    localStorage.removeItem(KEY_NAME);
  }
};
