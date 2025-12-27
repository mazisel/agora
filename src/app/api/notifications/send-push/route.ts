import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const { token, title, body, data } = await request.json();

        if (!token || !title || !body) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        console.log('[FCM] Invoking Edge Function "send-push" for token:', token.substring(0, 15) + '...');

        const { data: funcData, error: funcError } = await supabaseAdmin.functions.invoke('send-push', {
            body: { token, title, body, data }
        });

        if (funcError) {
            console.error('[FCM] Edge Function error:', funcError);
            // Edge Function hata detayı genellikle context veya message içindedir
            const errorMessage = funcError.message || JSON.stringify(funcError);
            return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
        }

        console.log('[FCM] Edge Function success:', funcData);
        return NextResponse.json({ success: true, response: funcData });

    } catch (error: any) {
        console.error('[FCM] Internal API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
