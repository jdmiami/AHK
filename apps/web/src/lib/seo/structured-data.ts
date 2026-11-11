import { BRAND } from '@/lib/brand';
import { buildCreatorPerson } from '@/lib/creator';
import { APP_LOCALES, getLocalePublicPath, localeToBcp47, type AppLocale } from '@/lib/locale-path';
import { getSiteUrl } from '@/lib/site-url';

type StructuredDataInput = {
    locale: AppLocale;
    title: string;
    description: string;
    siteName: string;
};

export function buildStructuredData({ locale, title, description, siteName }: StructuredDataInput) {
    const siteUrl = getSiteUrl().origin;
    const pageUrl = `${siteUrl}${getLocalePublicPath(locale)}`;

    const webApplication = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: siteName,
        headline: title,
        description,
        url: pageUrl,
        inLanguage: localeToBcp47(locale),
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        image: `${siteUrl}/og-image.png`,
        creator: {
            '@type': 'Organization',
            name: BRAND.full,
            alternateName: BRAND.short,
            url: BRAND.repoUrl,
        },
        isBasedOn: {
            '@type': 'SoftwareSourceCode',
            name: BRAND.basedOn.name,
            url: BRAND.basedOn.url,
            author: buildCreatorPerson(),
        },
    };

    const webSite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        description,
        url: siteUrl,
        inLanguage: APP_LOCALES.map((appLocale) => localeToBcp47(appLocale)),
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${pageUrl}?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return [webApplication, webSite];
}
