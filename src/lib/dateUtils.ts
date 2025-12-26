'use client';

/**
 * Safe date formatting utilities that prevent hydration mismatch
 * by always returning the same format regardless of locale settings.
 */

export function formatDateSafe(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

export function formatDateTimeSafe(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatCurrencySafe(amount: number): string {
    // Use fixed format to prevent locale-based hydration mismatch
    return `₺${amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).replace(/,/g, '.')}`;
}

// Turkish month names (SSR-safe, no locale dependency)
const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const TURKISH_MONTHS_SHORT = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

const TURKISH_DAYS = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

export function formatMonthYearSafe(dateString: string | Date): string {
    const date = new Date(dateString);
    return `${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayMonthSafe(dateString: string | Date): string {
    const date = new Date(dateString);
    return `${date.getDate()} ${TURKISH_MONTHS_SHORT[date.getMonth()]}`;
}

export function formatWeekdaySafe(dateString: string | Date): string {
    const date = new Date(dateString);
    return TURKISH_DAYS[date.getDay()];
}
