import { describe, expect, it } from 'vitest';

import { keyVersionQuery, rankKeyVersions, songTitleForKeySearch } from '@/lib/key-versions';

describe('songTitleForKeySearch', () => {
    it('strips brackets, channel suffixes and karaoke words', () => {
        expect(songTitleForKeySearch('Queen - Bohemian Rhapsody (Karaoke Version)')).toBe(
            'Queen - Bohemian Rhapsody',
        );
        expect(songTitleForKeySearch('Adele - Hello | Karaoke Lyrics | Sing King')).toBe(
            'Adele - Hello',
        );
        expect(songTitleForKeySearch('KARAOKE Rolling in the Deep - Adele [Lower Key -2]')).toBe(
            'Rolling in the Deep - Adele',
        );
    });
});

describe('keyVersionQuery', () => {
    it('builds a search for the requested kind', () => {
        expect(keyVersionQuery('Adele - Hello (Karaoke Version)', 'lower')).toBe(
            'Adele - Hello karaoke lower key',
        );
        expect(keyVersionQuery('Karaoke', 'female')).toBe('Karaoke karaoke female key');
    });
});

describe('rankKeyVersions', () => {
    it('puts key-labelled uploads first and drops the playing song', () => {
        const items = [
            { id: 'now', title: 'Hello (Karaoke)' },
            { id: 'a', title: 'Hello karaoke with lyrics' },
            { id: 'b', title: 'Hello - Karaoke Lower Key -3' },
            { id: 'c', title: 'Hello (Female Key) Karaoke' },
        ];
        expect(rankKeyVersions(items, 'now').map((i) => i.id)).toEqual(['b', 'c', 'a']);
        expect(rankKeyVersions(items, 'now', 1).map((i) => i.id)).toEqual(['b']);
    });
});
