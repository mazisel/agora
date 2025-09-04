import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

export interface SupportAgentCheck {
  isAgent: boolean;
  categories: string[];
}

/**
 * Basit auth token alma ve kullanıcı doğrulama
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Auth token'ı al - önce header'dan, sonra cookie'den
    let authToken = null;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    } else {
      // Cookie'den al
      const cookieStore = await cookies();
      const authCookie = cookieStore.get('sb-riacmnpxjsbrppzfjeur-auth-token');
      
      if (authCookie?.value) {
        try {
          const parsed = JSON.parse(authCookie.value);
          authToken = parsed.access_token;
        } catch {
          authToken = authCookie.value;
        }
      }
    }

    if (!authToken) {
      return { success: false, error: 'No auth token found' };
    }

    // Kullanıcı doğrulama
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(authToken);
    
    if (error || !user) {
      return { success: false, error: 'Invalid token' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Auth error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Kullanıcının admin olup olmadığını kontrol et
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('authority_level')
      .eq('id', userId)
      .single();

    return !error && data?.authority_level === 'admin';
  } catch {
    return false;
  }
}

/**
 * Kullanıcının destek kişisi olup olmadığını ve hangi kategorilerde yetkili olduğunu kontrol et
 */
export async function checkSupportAgent(userId: string): Promise<SupportAgentCheck> {
  try {
    const { data, error } = await supabaseAdmin
      .from('support_agents')
      .select('category_id')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return { isAgent: false, categories: [] };
    }

    return {
      isAgent: true,
      categories: data.map(item => item.category_id)
    };
  } catch {
    return { isAgent: false, categories: [] };
  }
}

/**
 * Kullanıcının belirli bir kategoride yetki olup olmadığını kontrol et
 */
export async function hasAccessToCategory(userId: string, categoryId: string): Promise<boolean> {
  try {
    // Admin ise her kategoriye erişebilir
    if (await isAdmin(userId)) {
      return true;
    }

    // Destek kişisi kontrolü
    const { data, error } = await supabaseAdmin
      .from('support_agents')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}
