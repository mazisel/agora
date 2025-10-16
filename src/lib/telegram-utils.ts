const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/;

export function sanitizeTelegramUsername(username?: string | null): string | null {
  if (!username) {
    return null;
  }

  const trimmed = username.trim();
  if (!trimmed) {
    return null;
  }

  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  const normalized = withoutAt.toLowerCase();

  return normalized || null;
}

export function isValidTelegramUsername(username?: string | null): boolean {
  const sanitized = sanitizeTelegramUsername(username);
  if (!sanitized) {
    return false;
  }

  return TELEGRAM_USERNAME_REGEX.test(sanitized);
}

export function formatTelegramUsername(username?: string | null): string {
  const sanitized = sanitizeTelegramUsername(username);
  return sanitized ? `@${sanitized}` : '';
}
