import { createClient } from '@supabase/supabase-js';

// Trim to remove any accidental whitespace/hidden chars from env vars
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
