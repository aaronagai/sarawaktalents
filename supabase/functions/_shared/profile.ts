import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type ShareProfile = {
  username: string
  name: string
  avatar_url: string | null
  org_photo: string | null
  org_photos: string[] | null
}

export async function getShareProfile(username: string): Promise<ShareProfile | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) return null

  const sb = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await sb
    .from('profiles')
    .select('username, name, avatar_url, org_photo, org_photos')
    .eq('username', username)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data?.username) return null
  return data as ShareProfile
}

export function primaryBadge(profile: ShareProfile): string | null {
  if (profile.org_photos?.length) return profile.org_photos[0]
  return profile.org_photo ?? null
}