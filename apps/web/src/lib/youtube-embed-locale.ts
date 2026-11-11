import type { AppLocale } from '@/lib/locale-path';

/** YouTube iframe `hl` values aligned with app locales. */
const YOUTUBE_EMBED_HL: Record<AppLocale, string> = {
    en: 'en_us',
    es: 'es_us',
};

export function youtubeEmbedHl(locale: AppLocale): string {
    return YOUTUBE_EMBED_HL[locale];
}
