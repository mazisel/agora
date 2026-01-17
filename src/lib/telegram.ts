import dns from 'node:dns';
import { Agent, fetch as undiciFetch } from 'undici';

// Prefer IPv4 to avoid IPv6 timeouts in Docker environments
dns.setDefaultResultOrder('ipv4first');
const ipv4Agent = new Agent({ connect: { family: 4, timeout: 15000 } });

const TELEGRAM_API_BASE = process.env.TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
  : null;
const TELEGRAM_SEND_CONCURRENCY = Math.max(
  1,
  Number(process.env.TELEGRAM_SEND_CONCURRENCY || 5)
);

export type TelegramNotificationType =
  | 'task_assigned'
  | 'task_status_update'
  | 'event_reminder'
  | 'project_assigned'
  | 'task_assigned_reminder';

export interface TelegramMessage {
  text: string;
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard: { text: string; url: string | undefined }[][];
  };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    const priority = toText(data['priority']);
    const projectName = toText(data['projectName']);
    const assigneeNames = Array.isArray(data['assigneeNames'])
      ? (data['assigneeNames'] as string[]).filter(Boolean).join(', ')
      : toText(data['assigneeNames']);

    const lines = [
      '📌 Yeni Görev Ataması',
      `Görev: ${taskTitle}`,
      `Atayan: ${assignedBy}`,
      assigneeNames ? `Atananlar: ${assigneeNames}` : null,
      projectName ? `Proje: ${projectName}` : null,
      priority ? `Öncelik: ${priority}` : null,
      dueDate ? `Teslim Tarihi: ${dueDate}` : null,
      taskId ? `Görev ID: ${taskId}` : null,
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
      reply_markup: taskId ? {
        inline_keyboard: [
          [{ text: 'Görevi Görüntüle', url: `${APP_URL}/tasks?taskId=${taskId}` }]
        ]
      } : undefined
    };
  },
  task_assigned_reminder: (data) => {
    const taskTitle = toText(data['taskTitle']) ?? 'Görev';
    const assignedBy = toText(data['assignedBy']) ?? 'Yönetici';
    const dueDate = toText(data['dueDate']);
    const taskId = toText(data['taskId']);
    const priority = toText(data['priority']);
    const projectName = toText(data['projectName']);
    const assigneeNames = Array.isArray(data['assigneeNames'])
      ? (data['assigneeNames'] as string[]).filter(Boolean).join(', ')
      : toText(data['assigneeNames']);
    const attempt = typeof data['attempt'] === 'number' ? data['attempt'] : undefined;

    const lines = [
      '⏰ Görev Hatırlatma',
      attempt ? `Hatırlatma #: ${attempt}` : null,
      `Görev: ${taskTitle}`,
      `Atayan: ${assignedBy}`,
      assigneeNames ? `Sorumlu: ${assigneeNames}` : null,
      projectName ? `Proje: ${projectName}` : null,
      priority ? `Öncelik: ${priority}` : null,
      dueDate ? `Teslim Tarihi: ${dueDate}` : null,
      taskId ? `Görev ID: ${taskId}` : null,
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
      reply_markup: taskId ? {
        inline_keyboard: [
          [{ text: 'Görevi Görüntüle', url: `${APP_URL}/tasks?taskId=${taskId}` }]
        ]
      } : undefined
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
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
      reply_markup: taskId ? {
        inline_keyboard: [
          [{ text: 'Görevi Görüntüle', url: `${APP_URL}/tasks?taskId=${taskId}` }]
        ]
      } : undefined
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
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Ajandayı Görüntüle', url: `${APP_URL}/calendar` }]
        ]
      }
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
    ].filter(Boolean);

    return {
      text: lines.join('\n'),
      disable_web_page_preview: true,
      reply_markup: projectId ? {
        inline_keyboard: [
          [{ text: 'Projeyi Görüntüle', url: `${APP_URL}/projects/${projectId}` }]
        ]
      } : undefined
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
    console.log('[Telegram] Sending message to chat:', chatId);

    const response = await undiciFetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: 'POST',
      dispatcher: ipv4Agent,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.text,
        parse_mode: message.parse_mode,
        disable_web_page_preview:
          message.disable_web_page_preview !== undefined ? message.disable_web_page_preview : true,
        reply_markup: message.reply_markup,
      }),
    });

    const result: any = await response.json();

    if (!result.ok) {
      console.error('[Telegram] API returned an error:', result);
      return false;
    }

    console.log('[Telegram] Message sent successfully to chat:', chatId);
    return true;
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error);
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

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < uniqueChatIds.length; i += TELEGRAM_SEND_CONCURRENCY) {
    const batch = uniqueChatIds.slice(i, i + TELEGRAM_SEND_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((chatId) => sendTelegramMessage(chatId, message))
    );

    const batchSuccessful = results.filter(
      (result) => result.status === 'fulfilled' && result.value === true
    ).length;
    successful += batchSuccessful;
    failed += batch.length - batchSuccessful;
  }

  return { successful, failed };
}
