import { describe, expect, it } from 'vitest';

import { youtubeEmbedHl } from '@/lib/youtube-embed-locale';

describe('youtubeEmbedHl', () => {
    it('maps app locales to YouTube hl params', () => {
        expect(youtubeEmbedHl('es')).toBe('es_us');
        expect(youtubeEmbedHl('en')).toBe('en_us');
    });
});
