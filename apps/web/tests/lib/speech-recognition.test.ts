import { describe, expect, it } from 'vitest';

import {
    isWebSpeechRecognitionSupported,
    localeToSpeechLanguage,
    localeToSpeechRecognitionLang,
} from '@/lib/speech-recognition';

describe('speech locale helpers', () => {
    it('maps known app locales', () => {
        expect(localeToSpeechLanguage('es')).toBe('es');
        expect(localeToSpeechLanguage('en')).toBe('en');
        expect(localeToSpeechRecognitionLang('es')).toBe('es-US');
        expect(localeToSpeechRecognitionLang('en')).toBe('en-US');
    });

    it('defaults unknown locales to English', () => {
        expect(localeToSpeechLanguage('ja')).toBe('en');
        expect(localeToSpeechRecognitionLang('de')).toBe('en-US');
    });
});

describe('isWebSpeechRecognitionSupported', () => {
    it('is false in node test environment', () => {
        expect(isWebSpeechRecognitionSupported()).toBe(false);
    });
});
