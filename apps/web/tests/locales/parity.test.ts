import { describe, expect, it } from 'vitest';

import en from '@/locales/en';
import es from '@/locales/es';

const UPSTREAM_NAME = /vkara/i;

/** Keys whose value is allowed to name the upstream project (attribution only). */
const ATTRIBUTION_KEYS = new Set(['credit.bylinePrefix']);

describe('locale parity', () => {
    it('es defines exactly the same keys as en', () => {
        const enKeys = Object.keys(en).sort();
        const esKeys = Object.keys(es).sort();
        const missing = enKeys.filter((key) => !esKeys.includes(key));
        const extra = esKeys.filter((key) => !enKeys.includes(key));
        expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it('keeps every interpolation placeholder from en in es', () => {
        for (const [key, value] of Object.entries(en)) {
            const placeholders = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
            const esValue = (es as Record<string, string>)[key] ?? '';
            const esPlaceholders = [...esValue.matchAll(/\{(\w+)\}/g)]
                .map((match) => match[1])
                .sort();
            expect({ key, esPlaceholders }).toEqual({ key, esPlaceholders: placeholders });
        }
    });

    it('never shows the upstream product name as the brand', () => {
        for (const [locale, table] of [
            ['en', en],
            ['es', es],
        ] as const) {
            for (const [key, value] of Object.entries(table)) {
                if (ATTRIBUTION_KEYS.has(key)) continue;
                expect({ locale, key, value }).not.toMatchObject({
                    value: expect.stringMatching(UPSTREAM_NAME),
                });
            }
        }
    });
});
