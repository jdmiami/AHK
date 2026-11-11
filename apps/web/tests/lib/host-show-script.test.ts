import { describe, expect, it } from 'vitest';

import { hostLine, speakableTitle, toHostLocale } from '@/lib/host-show/script';

describe('speakableTitle', () => {
    it('drops video noise and reads "song, by artist"', () => {
        expect(speakableTitle('Queen – Bohemian Rhapsody (Official Video Remastered)')).toBe(
            'Bohemian Rhapsody, by Queen',
        );
        expect(speakableTitle('Adele - Hello (Lyrics)')).toBe('Hello, by Adele');
        expect(speakableTitle('ABBA - Dancing Queen [Karaoke Version] HD')).toBe(
            'Dancing Queen, by ABBA',
        );
        expect(
            speakableTitle('Shakira - Hips Don’t Lie (Official 4K Video) ft. Wyclef Jean', 'es'),
        ).toBe('Hips Don’t Lie ft. Wyclef Jean, de Shakira');
    });

    it('keeps plain titles and never returns empty', () => {
        expect(speakableTitle('Bohemian Rhapsody')).toBe('Bohemian Rhapsody');
        expect(speakableTitle('(Official Video)')).toBe('(Official Video)');
    });
});

describe('hostLine', () => {
    it('fills in the name and song', () => {
        const line = hostLine('intro', 'en', { name: 'Ana', song: 'Hello' }, () => 0);
        expect(line).toContain('Ana');
        expect(line).toContain('Hello');
    });

    it('does not repeat the same line twice in a row', () => {
        const a = hostLine('thanks', 'en', { name: 'Ana' }, () => 0);
        const b = hostLine('thanks', 'en', { name: 'Ana' }, () => 0);
        expect(a).not.toBe(b);
    });

    it('speaks Spanish for es', () => {
        expect(toHostLocale('es')).toBe('es');
        expect(hostLine('invite', 'es', {}, () => 0)).toMatch(/canción/);
    });
});
