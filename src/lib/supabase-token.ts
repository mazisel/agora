import { cookies } from 'next/headers';

const SUPABASE_COOKIE_CANDIDATES = [
  'sb-access-token',
  'sb-riacmnpxjsbrppzfjeur-auth-token',
  'supabase-auth-token',
  'supabase.auth.token',
];

export async function getSupabaseAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();

  for (const name of SUPABASE_COOKIE_CANDIDATES) {
    const cookie = cookieStore.get(name);
    if (!cookie?.value) continue;

    try {
      const parsed = JSON.parse(cookie.value);
      if (parsed?.access_token) {
        return parsed.access_token;
      }
    } catch {
      return cookie.value;
    }

    return cookie.value;
  }

  return null;
}
