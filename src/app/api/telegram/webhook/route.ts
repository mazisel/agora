import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeTelegramUsername, isValidTelegramUsername } from '@/lib/telegram-utils';
import { sendTelegramMessage } from '@/lib/telegram';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type TelegramUser = {
  username?: string;
};

type TelegramChat = {
  id: number | string;
};

type TelegramMessagePayload = {
  chat?: TelegramChat;
  from?: TelegramUser;
};

type TelegramUpdate = {
  message?: TelegramMessagePayload;
  edited_message?: TelegramMessagePayload;
  callback_query?: {
    from?: TelegramUser;
    message?: TelegramMessagePayload;
  };
};

function getChatAndUser(update: TelegramUpdate) {
  if (update.message) {
    return { chat: update.message.chat, from: update.message.from };
  }

  if (update.edited_message) {
    return { chat: update.edited_message.chat, from: update.edited_message.from };
  }

  if (update.callback_query) {
    return { chat: update.callback_query.message?.chat, from: update.callback_query.from };
  }

  return { chat: null, from: null };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn('Telegram webhook received but TELEGRAM_BOT_TOKEN is not configured.');
      return NextResponse.json({ ok: true, skipped: true });
    }

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const provided = request.nextUrl.searchParams.get('secret');
      if (provided !== secret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const update = (await request.json()) as TelegramUpdate;
    const { chat, from } = getChatAndUser(update);

    if (!chat || !from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = chat.id;
    const rawUsername: string | undefined = from.username;

    if (!rawUsername) {
      await sendTelegramMessage(chatId, {
        text: 'Telegram kullanıcı adınız bulunamadı. Lütfen Telegram uygulamasında Ayarlar > Kullanıcı Adı bölümünden bir kullanıcı adı belirleyin ve tekrar deneyin.',
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (!isValidTelegramUsername(rawUsername)) {
      await sendTelegramMessage(chatId, {
        text: 'Geçersiz kullanıcı adı algılandı. Kullanıcı adları yalnızca harf, sayı ve alt çizgi içerebilir ve en az 5 karakter olmalıdır.',
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    const sanitizedUsername = sanitizeTelegramUsername(rawUsername);

    if (!sanitizedUsername) {
      return NextResponse.json({ ok: true });
    }

    const matchValues = [sanitizedUsername, `@${sanitizedUsername}`];

    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, first_name, last_name, telegram_chat_id, telegram_username')
      .in('telegram_username', matchValues)
      .maybeSingle();

    if (error) {
      console.error('Telegram webhook lookup error:', error);
      await sendTelegramMessage(chatId, {
        text: 'Sistem hatası nedeniyle bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.',
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (!profile) {
      await sendTelegramMessage(chatId, {
        text: 'Bu kullanıcı adı portal üzerinde bulunamadı. Lütfen admin panelindeki kullanıcı bilgilerinizden Telegram kullanıcı adınızı kontrol edin.',
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    const updates = {
      telegram_chat_id: chatId.toString(),
      telegram_username: sanitizedUsername,
      telegram_notifications_enabled: true,
      telegram_linked_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', profile.id);

    if (updateError) {
      console.error('Telegram webhook update error:', updateError);
      await sendTelegramMessage(chatId, {
        text: 'Bilgileriniz güncellenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.',
        disable_web_page_preview: true,
      });
      return NextResponse.json({ ok: true });
    }

    const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Kullanıcı';

    await sendTelegramMessage(chatId, {
      text: `Merhaba ${displayName}, Telegram bildirimleri başarıyla aktifleştirildi.`,
      disable_web_page_preview: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = request.nextUrl.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true });
}
