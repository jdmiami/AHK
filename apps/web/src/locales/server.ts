import { createI18nServer, setStaticParamsLocale } from 'next-international/server';
import en from './en';

export { setStaticParamsLocale };

export const { getI18n, getScopedI18n, getCurrentLocale, getStaticParams } = createI18nServer(
    {
        en: () => import('./en'),
        es: () => import('./es'),
    },
    {
        segmentName: 'locale',
        fallbackLocale: en,
    },
);
