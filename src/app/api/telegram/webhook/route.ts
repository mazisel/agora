import { NextRequest, NextResponse } from 'next/server';
import { sanitizeTelegramUsername, isValidTelegramUsername } from '@/lib/telegram-utils';
import { sendTelegramMessage } from '@/lib/telegram';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    const chatId = chat.id.toString();
    const rawUsername: string | undefined = from.username;
    const sanitizedUsername = sanitizeTelegramUsername(rawUsername);

    const messageText =
      update.message?.text ||
      update.callback_query?.message?.text ||
      update.callback_query?.data ||
      update.edited_message?.text;

    const nowIso = new Date().toISOString();

    const respond = async (text: string) => {
      await sendTelegramMessage(chatId, {
        text,
        disable_web_page_preview: true,
      });
    };

    const linkWithToken = async (token: string) => {
      const { data: linkRecord, error: linkError } = await supabaseAdmin
        .from('telegram_link_tokens')
        .select('id, user_id, expires_at, consumed_at')
        .eq('token', token)
        .maybeSingle();

      if (linkError) {
        console.error('Telegram webhook token lookup error:', linkError);
        await respond('Sistem hatası nedeniyle bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.');
        return true;
      }

      if (!linkRecord) {
        await respond('Bu bağlantı kodu geçersiz veya süresi dolmuş görünüyor. Yöneticiyle iletişime geçin.');
        return true;
      }

      if (linkRecord.consumed_at) {
        await respond('Bu bağlantı kodu daha önce kullanılmış. Yöneticiyle iletişime geçip yeni bir kod isteyebilirsiniz.');
        return true;
      }

      if (linkRecord.expires_at && new Date(linkRecord.expires_at) < new Date()) {
        await respond('Bu bağlantı kodunun süresi dolmuş. Lütfen yeni bir kod isteyin.');
        return true;
      }

      const { error: linkUpdateError } = await supabaseAdmin
        .from('telegram_link_tokens')
        .update({
          chat_id: chatId,
          consumed_at: nowIso,
          last_used_at: nowIso,
        })
        .eq('id', linkRecord.id);

      if (linkUpdateError) {
        console.error('Telegram link token update error:', linkUpdateError);
        await respond('Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        return true;
      }

      const profileUpdate = {
        telegram_chat_id: chatId,
        telegram_username: sanitizedUsername ?? null,
        telegram_notifications_enabled: true,
        telegram_linked_at: nowIso,
      };

      const { data: updatedProfile, error: profileUpdateError } = await supabaseAdmin
        .from('user_profiles')
        .update(profileUpdate)
        .eq('id', linkRecord.user_id)
        .select('first_name, last_name')
        .maybeSingle();

      if (profileUpdateError) {
        console.error('Telegram profile update error:', profileUpdateError);
        await respond('Profiliniz güncellenirken bir sorun oluştu. Lütfen yöneticinize haber verin.');
        return true;
      }

      const displayName =
        [updatedProfile?.first_name, updatedProfile?.last_name].filter(Boolean).join(' ') || 'Kullanıcı';

      await respond(
        `Merhaba ${displayName}, bağlantınız tamamlandı. Bundan sonra önemli duyuruları Telegram üzerinden de alacaksınız.`
      );
      return true;
    };

    const startMatch = messageText?.trim().match(/^\/start\s+([A-Za-z0-9_-]+)/);

    if (startMatch) {
      const token = startMatch[1];
      await linkWithToken(token);
      return NextResponse.json({ ok: true });
    }

    if (!sanitizedUsername) {
      await respond(
        'Telegram kullanıcı adınız bulunamadı. Ayarlar > Kullanıcı Adı bölümünden bir kullanıcı adı belirledikten sonra yöneticiye haber verin.'
      );
      return NextResponse.json({ ok: true });
    }

    if (!isValidTelegramUsername(sanitizedUsername)) {
      await respond(
        'Geçersiz kullanıcı adı algılandı. Kullanıcı adları yalnızca harf, sayı ve alt çizgi içerebilir ve en az 5 karakter olmalıdır.'
      );
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
      await respond('Sistem hatası nedeniyle bağlantı kurulamadı. Lütfen daha sonra tekrar deneyin.');
      return NextResponse.json({ ok: true });
    }

    if (!profile) {
      await respond(
        'Bu kullanıcı adı için kayıt bulunamadı. Yönetici panelinden bağlantı linki üretip yeniden deneyebilirsiniz.'
      );
      return NextResponse.json({ ok: true });
    }

    const updates = {
      telegram_chat_id: chatId,
      telegram_username: sanitizedUsername,
      telegram_notifications_enabled: true,
      telegram_linked_at: nowIso,
    };

    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', profile.id);

    if (updateError) {
      console.error('Telegram webhook update error:', updateError);
      await respond('Bilgileriniz güncellenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      return NextResponse.json({ ok: true });
    }

    const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Kullanıcı';

    await supabaseAdmin
      .from('telegram_link_tokens')
      .update({ last_used_at: nowIso })
      .eq('chat_id', chatId);

    await respond(
      `Merhaba ${displayName}, Telegram bildirimleri başarıyla aktifleştirildi. Bağlantı kodu almak isterseniz yönetici panelinden yeni bağlantı oluşturabilirsiniz.`
    );

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
