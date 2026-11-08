'use client';

import { createI18nClient } from 'next-international/client';
import en from './en';

export const { useI18n, useScopedI18n, I18nProviderClient, useCurrentLocale } = createI18nClient(
    {
        en: () => import('./en'),
        es: () => import('./es'),
    },
    {
        fallbackLocale: en,
        segmentName: 'locale',
    },
);

export type SUPPORTED_LOCALES = 'en' | 'es';
