import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isValidHttpUrl(value) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(supabaseUrl) && supabaseAnonKey,
)

export function getSupabaseConfigError() {
  if (!supabaseUrl) {
    return 'Falta VITE_SUPABASE_URL en el archivo .env.'
  }

  if (!isValidHttpUrl(supabaseUrl)) {
    return 'VITE_SUPABASE_URL debe ser una URL completa, por ejemplo https://xxxxx.supabase.co.'
  }

  if (!supabaseAnonKey) {
    return 'Falta VITE_SUPABASE_ANON_KEY en el archivo .env.'
  }

  return null
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
