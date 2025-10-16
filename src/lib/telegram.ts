const TELEGRAM_API_BASE = process.env.TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
  : null;

export type TelegramNotificationType =
  | 'task_assigned'
  | 'task_status_update'
  | 'event_reminder'
  | 'project_assigned';

export interface TelegramMessage {
  text: string;
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disable_web_page_preview?: boolean;
}

type TelegramTemplatePayload = Record<string, unknown>;
type TelegramTemplateFactory = (data: TelegramTemplatePayload) => TelegramMessage;

const toText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

export const telegramTemplates: Record<TelegramNotificationType, TelegramTemplateFactory> = {
  task_assigned: (data) => {
    const taskTitle = toText(data['taskTitle']) ?? 'Görev';
    const assignedBy = toText(data['assignedBy']) ?? 'Yönetici';
    const dueDate = toText(data['dueDate']);
    const taskId = toText(data['taskId']);

    const lines = [
      '📌 Yeni Görev Ataması',
      `Görev: ${taskTitle}`,
      `Atayan: ${assignedBy}`,
      dueDate ? `Teslim Tarihi: ${dueDate}` : null,
      taskId ? `Görev ID: ${taskId}` : null,
      '',
      'Detaylar için portalı kontrol edebilirsiniz.',
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
    };
  },
  task_status_update: (data) => {
    const taskTitle = toText(data['taskTitle']) ?? 'Görev';
    const oldStatus = toText(data['oldStatus']) ?? 'Bilinmiyor';
    const newStatus = toText(data['newStatus']) ?? 'Bilinmiyor';
    const updatedBy = toText(data['updatedBy']) ?? 'Sistem';
    const taskId = toText(data['taskId']);

    const lines = [
      '🔄 Görev Durumu Güncellendi',
      `Görev: ${taskTitle}`,
      `Eski Durum: ${oldStatus}`,
      `Yeni Durum: ${newStatus}`,
      `Güncelleyen: ${updatedBy}`,
      taskId ? `Görev ID: ${taskId}` : null,
      '',
      'Detaylar için portalı kontrol edebilirsiniz.',
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
    };
  },
  event_reminder: (data) => {
    const eventTitle = toText(data['eventTitle']) ?? 'Etkinlik';
    const eventDate = toText(data['eventDate']) ?? '';
    const eventTime = toText(data['eventTime']);
    const location = toText(data['location']);

    const lines = [
      '📅 Etkinlik Hatırlatması',
      `Etkinlik: ${eventTitle}`,
      `Tarih: ${eventDate}`,
      eventTime ? `Saat: ${eventTime}` : null,
      location ? `Konum: ${location}` : null,
      '',
      'Detaylar için portalı kontrol edebilirsiniz.',
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
    };
  },
  project_assigned: (data) => {
    const projectTitle = toText(data['projectTitle']) ?? 'Proje';
    const role = toText(data['role']) ?? 'Ekip Üyesi';
    const assignedBy = toText(data['assignedBy']) ?? 'Yönetici';
    const projectId = toText(data['projectId']);

    const lines = [
      '🧩 Yeni Proje Ataması',
      `Proje: ${projectTitle}`,
      `Rolünüz: ${role}`,
      `Atayan: ${assignedBy}`,
      projectId ? `Proje ID: ${projectId}` : null,
      '',
      'Detaylar için portalı kontrol edebilirsiniz.',
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
    };
  },
};

export function buildTelegramMessage(
  type: TelegramNotificationType,
  data: TelegramTemplatePayload
): TelegramMessage | null {
  const builder = telegramTemplates[type];
  if (!builder) {
    return null;
  }
  try {
    return builder(data);
  } catch (error) {
    console.error(`Failed to build Telegram message for ${type}:`, error);
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: string | number,
  message: TelegramMessage
): Promise<boolean> {
  if (!TELEGRAM_API_BASE) {
    console.warn('Telegram bot token is not configured. Skipping Telegram notification.');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.text,
        parse_mode: message.parse_mode,
        disable_web_page_preview:
          message.disable_web_page_preview !== undefined ? message.disable_web_page_preview : true,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API returned an error:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

export async function sendTelegramMessages(
  chatIds: (string | number)[],
  message: TelegramMessage
): Promise<{ successful: number; failed: number }> {
  const uniqueChatIds = Array.from(new Set(chatIds.filter(Boolean)));

  if (uniqueChatIds.length === 0) {
    return { successful: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    uniqueChatIds.map((chatId) => sendTelegramMessage(chatId, message))
  );

  const successful = results.filter(
    (result) => result.status === 'fulfilled' && result.value === true
  ).length;
  const failed = uniqueChatIds.length - successful;

  return { successful, failed };
}
