import { createClient } from '@supabase/supabase-js';

// Helper: Sanitize a string to only ISO-8859-1 characters (code <= 255)
function sanitizeString(str: string | undefined): string {
  if (!str) return '';
  return str.split('').filter(char => char.charCodeAt(0) <= 255).join('').trim();
}

// Sanitize and trim Supabase env vars to remove any non-ISO-8859-1 characters
const supabaseUrl = sanitizeString(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitizeString(import.meta.env.VITE_SUPABASE_ANON_KEY);

console.log('[Supabase Config] Sanitized URL:', supabaseUrl);
console.log('[Supabase Config] Sanitized Anon Key:', supabaseAnonKey ? `(length ${supabaseAnonKey.length})` : '(empty)');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
