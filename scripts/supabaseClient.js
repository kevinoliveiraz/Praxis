// Shared Supabase client (browser, via CDN ESM)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Importa createClient do módulo https://esm.sh/@supabase/supabase-js@2.

const SUPABASE_URL = 'https://fxpmeosnnrgqdelffnvy.supabase.co'; // Define SUPABASE_URL como o texto “https://fxpmeosnnrgqdelffnvy.supabase.co”.
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cG1lb3NubnJncWRlbGZmbnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjQ1NTEsImV4cCI6MjEwMDg0MDU1MX0.THX_ywgkj_E0A08Cl5fe4hsdcC4nt5AFaGDr5ZUDQLM'; // Define SUPABASE_ANON como o texto “eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cG1lb3…”.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { // Exporta para os outros módulos: Declara a constante supabase.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, // Define a propriedade auth como um objeto com persistSession, autoRefreshToken, detectSessionInUrl.
}); // Encerra o objeto.

export function escapeHtml(str = '') { // Exporta para os outros módulos: Declara a função escapeHtml com str.
  return String(str) // Retorna a substituição dos trechos de String(…).replace(…).replace(…).replace(…).replace(…) que correspondem a o padrão de busca /'/.
    .replace(/&/g, '&amp;') // Executa a chamada que produz a substituição dos trechos de String(…) que correspondem a o padrão de busca /&/.
    .replace(/</g, '&lt;') // Executa a chamada que produz a substituição dos trechos de String(…).replace(…) que correspondem a o padrão de busca /</.
    .replace(/>/g, '&gt;') // Executa a chamada que produz a substituição dos trechos de String(…).replace(…).replace(…) que correspondem a o padrão de busca />/.
    .replace(/"/g, '&quot;') // Executa a chamada que produz a substituição dos trechos de String(…).replace(…).replace(…).replace(…) que correspondem a o padrão de busca /"/.
    .replace(/'/g, '&#39;'); // Executa a chamada que produz a substituição dos trechos de String(…).replace(…).replace(…).replace(…).replace(…) que correspondem a o padrão de busca /'/.
} // Encerra o bloco da função escapeHtml.

export function formatDuration(seconds) { // Exporta para os outros módulos: Declara a função formatDuration com seconds.
  if (!seconds && seconds !== 0) return '--:--'; // Verifica a negação de seconds e seconds diferente, inclusive no tipo, de 0; se verdadeiro, retorna o texto “--:--”.
  const m = Math.floor(seconds / 60); // Define m como o arredondamento de seconds dividido por 60 para baixo.
  const s = seconds % 60; // Define s como seconds módulo 60.
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; // Retorna um texto montado com 2 valores dinâmicos.
} // Encerra o bloco da função formatDuration.

export async function upsertUserProfile(user) { // Exporta para os outros módulos: Declara a função assíncrona upsertUserProfile com user.
  if (!user) return; // Verifica a negação de user; se verdadeiro, encerra a função sem retornar um valor.
  const payload = { // Define payload como um objeto com user_id, nome_completo, email, provedor_login, avatar_url e outras propriedades.
    user_id: user.id, // Define a propriedade user_id como user.id.
    nome_completo: user.user_metadata?.full_name || user.user_metadata?.name || '', // Define a propriedade nome_completo como user.user_metadata.full_name com acesso opcional ou, se indisponível, user.user_metadata.name com acesso opcional ou, se indisponível, o texto “”.
    email: user.email, // Define a propriedade email como user.email.
    provedor_login: user.app_metadata?.provider || 'email', // Define a propriedade provedor_login como user.app_metadata.provider com acesso opcional ou, se indisponível, o texto “email”.
    avatar_url: user.user_metadata?.praxis_avatar_mode === 'initials' ? null : // Define a propriedade avatar_url como null (ausência de valor) se user.user_metadata.praxis_avatar_mode com acesso opcional igual, inclusive no tipo, a o texto “initials”; caso contrário, user.user_metadata.avatar_url com acesso opcional ou, se indisponível, user.user_metadata.picture com acesso opc…
      user.user_metadata?.avatar_url || user.user_metadata?.picture || null, // Acessa user.user_metadata.avatar_url.
    ultimo_login: new Date().toISOString(), // Define a propriedade ultimo_login como o resultado de new Date(…).toISOString.
  }; // Encerra o objeto.
  const { data: existing } = await supabase // Define existing como o resultado aguardado de um registro ou null, sem exigir um resultado.
    .from('usuarios') // Executa a chamada que produz a referência à tabela ou ao bucket o texto “usuarios”.
    .select('id') // Executa a chamada que produz a seleção das colunas o texto “id”.
    .eq('user_id', user.id) // Executa a chamada que produz o resultado da consulta supabase.from(…).select(…), filtrada por o texto “user_id” igual a user.id.
    .maybeSingle(); // Executa a chamada que produz um registro ou null, sem exigir um resultado.

  if (existing) { // Verifica existing para decidir se executa este bloco.
    // O login sincroniza o acesso sem substituir nome e foto editados no perfil.
    const { email, provedor_login, ultimo_login } = payload; // Define email, provedor_login, ultimo_login como payload.
    await supabase.from('usuarios').update({ email, provedor_login, ultimo_login }).eq('user_id', user.id); // Aguarda o resultado da consulta supabase.from(…).update(…), filtrada por o texto “user_id” igual a user.id antes de continuar.
  } else { // Encerra o bloco anterior e inicia a alternativa quando a condição é falsa.
    await supabase.from('usuarios').insert(payload); // Aguarda a inserção dos dados payload na tabela selecionada antes de continuar.
  } // Encerra o bloco da condição.
} // Encerra o bloco da função upsertUserProfile.
