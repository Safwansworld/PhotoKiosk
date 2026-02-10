
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("⚠️ WARNING: NEXT_PUBLIC_SUPABASE_URL is missing. Using placeholder URL:", supabaseUrl)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
