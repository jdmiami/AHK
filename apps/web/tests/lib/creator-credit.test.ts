import { describe, expect, it } from 'vitest';

import en from '@/locales/en';
import es from '@/locales/es';
import { BRAND } from '@/lib/brand';
import { buildStructuredData } from '@/lib/seo/structured-data';

describe('creator credit copy', () => {
    it('credits the upstream project in both locales', () => {
        expect(en['credit.bylinePrefix']).toBe('Based on vkara by');
        expect(es['credit.bylinePrefix']).toBe('Basado en vkara por');
    });

    it('carries a tagline in both locales', () => {
        expect(en['credit.tagline'].length).toBeGreaterThan(0);
        expect(es['credit.tagline'].length).toBeGreaterThan(0);
    });
});

describe('buildStructuredData', () => {
    it('names AHK as the application creator and vkara as the base', () => {
        const schemas = buildStructuredData({
            locale: 'en',
            title: BRAND.lockup,
            description: 'karaoke',
            siteName: BRAND.short,
        });

        expect(schemas).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    '@type': 'WebApplication',
                    inLanguage: 'en-US',
                    creator: {
                        '@type': 'Organization',
                        name: 'Artist House Karaoke',
                        alternateName: 'AHK',
                        url: 'https://github.com/jdmiami/AHK',
                    },
                    isBasedOn: expect.objectContaining({
                        name: 'vkara',
                        url: 'https://github.com/lehuygiang28/vkara',
                    }),
                }),
            ]),
        );
    });
});
