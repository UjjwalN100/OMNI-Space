import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fzqjfakyrlwgbwgfxzha.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2avWs2XvJN3FuDZr4UcV2A_FmVtS8jG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
