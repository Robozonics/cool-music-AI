import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jppatkagvrcmvboholmk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGF0a2FndnJjbXZib2hvbG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Mzk2MzEsImV4cCI6MjEwNjAxNTYzMX0.4vhfizA0adKCzq1K-1_DlV020CgtNBCUAXVRhDepFsg';

// Create a Supabase client
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;
