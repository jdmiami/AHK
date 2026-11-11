import { describe, expect, it } from 'vitest';

import { formatStageTime, isValidPin, songToVideo } from '@/lib/profile-api';

describe('profile helpers', () => {
    it('accepts 4–8 digit PINs only', () => {
        expect(isValidPin('1234')).toBe(true);
        expect(isValidPin('12345678')).toBe(true);
        expect(isValidPin('123')).toBe(false);
        expect(isValidPin('12a4')).toBe(false);
        expect(isValidPin('123456789')).toBe(false);
    });

    it('turns a saved song back into a queueable video', () => {
        const video = songToVideo({
            videoId: 'abc',
            title: 'Hello',
            channel: 'Adele',
            thumbnail: 'https://i.ytimg.com/vi/abc/mqdefault.jpg',
            durationFormatted: '4:55',
        });
        expect(video.url).toBe('https://www.youtube.com/watch?v=abc');
        expect(video.channels[0]?.name).toBe('Adele');
        expect(video.thumbnails[0]?.url).toContain('abc');
    });

    it('formats time on stage', () => {
        expect(formatStageTime(600)).toBe('10 min');
        expect(formatStageTime(5400)).toBe('1 h 30 min');
    });
});
