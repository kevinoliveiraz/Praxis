// Shared Supabase client (browser, via CDN ESM)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fxpmeosnnrgqdelffnvy.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cG1lb3NubnJncWRlbGZmbnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjQ1NTEsImV4cCI6MjEwMDg0MDU1MX0.THX_ywgkj_E0A08Cl5fe4hsdcC4nt5AFaGDr5ZUDQLM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export async function upsertUserProfile(user) {
  if (!user) return;
  const payload = {
    user_id: user.id,
    nome_completo: user.user_metadata?.full_name || user.user_metadata?.name || '',
    email: user.email,
    provedor_login: user.app_metadata?.provider || 'email',
    avatar_url: user.user_metadata?.avatar_url || null,
    ultimo_login: new Date().toISOString(),
  };
  const { data: existing } = await supabase
    .from('usuarios')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('usuarios').update(payload).eq('user_id', user.id);
  } else {
    await supabase.from('usuarios').insert(payload);
  }
}
