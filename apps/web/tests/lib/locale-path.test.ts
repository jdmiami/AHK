import { describe, expect, it } from 'vitest';

import {
    APP_LOCALES,
    buildLocalePrefixedPath,
    buildLocaleSharePath,
    DEFAULT_APP_LOCALE,
    getLocalePublicPath,
    isAppLocale,
    localeToBcp47,
    stripLocaleFromPath,
} from '@/lib/locale-path';

describe('isAppLocale', () => {
    it('accepts supported locales only', () => {
        for (const locale of APP_LOCALES) {
            expect(isAppLocale(locale)).toBe(true);
        }
        expect(isAppLocale('vi')).toBe(false);
        expect(isAppLocale('fr')).toBe(false);
        expect(isAppLocale('')).toBe(false);
    });

    it('defaults to English', () => {
        expect(DEFAULT_APP_LOCALE).toBe('en');
        expect(APP_LOCALES).toEqual(['en', 'es']);
    });
});

describe('getLocalePublicPath', () => {
    it('omits prefix for default locale', () => {
        expect(getLocalePublicPath(DEFAULT_APP_LOCALE)).toBe('/');
        expect(getLocalePublicPath('es')).toBe('/es');
    });
});

describe('stripLocaleFromPath', () => {
    it('strips single locale prefix', () => {
        expect(stripLocaleFromPath('/es/search')).toEqual({
            locale: 'es',
            cleanPath: '/search',
        });
        expect(stripLocaleFromPath('/en')).toEqual({ locale: 'en', cleanPath: '/' });
    });

    it('leaves non-locale paths untouched', () => {
        expect(stripLocaleFromPath('/search')).toEqual({
            locale: null,
            cleanPath: '/search',
        });
    });

    it('parses concatenated locale blobs like /enes', () => {
        expect(stripLocaleFromPath('/enes/room')).toEqual({
            locale: 'es',
            cleanPath: '/room',
        });
    });
});

describe('buildLocalePrefixedPath', () => {
    it('maps English paths without prefix', () => {
        expect(buildLocalePrefixedPath('/es/foo', 'en')).toBe('/foo');
    });

    it('prefixes Spanish paths', () => {
        expect(buildLocalePrefixedPath('/foo', 'es')).toBe('/es/foo');
        expect(buildLocalePrefixedPath('/', 'es')).toBe('/es');
    });
});

describe('buildLocaleSharePath', () => {
    it('matches public locale root', () => {
        expect(buildLocaleSharePath('en')).toBe('/');
        expect(buildLocaleSharePath('es')).toBe('/es');
    });
});

describe('localeToBcp47', () => {
    it('maps app locales to region tags', () => {
        expect(localeToBcp47('en')).toBe('en-US');
        expect(localeToBcp47('es')).toBe('es-US');
    });
});
