import { describe, expect, it } from 'vitest';

import { shouldOfferTapToStart, TAP_TO_START_AFTER_MS } from '@/lib/playback-unlock';

const base = {
    hasPlayed: false,
    roomWantedPlay: true,
    autoplayBlocked: false,
    dismissed: false,
    elapsedMs: 0,
};

describe('shouldOfferTapToStart', () => {
    it('offers the click at once when YouTube reports blocked autoplay', () => {
        expect(shouldOfferTapToStart({ ...base, autoplayBlocked: true })).toBe(true);
    });

    it('offers it when a song the room wanted playing has not started in time', () => {
        expect(shouldOfferTapToStart({ ...base, elapsedMs: TAP_TO_START_AFTER_MS - 1 })).toBe(
            false,
        );
        expect(shouldOfferTapToStart({ ...base, elapsedMs: TAP_TO_START_AFTER_MS })).toBe(true);
    });

    it('stays away for paused rooms, songs that played, and after the host pressed it', () => {
        const late = { ...base, elapsedMs: 60_000 };
        expect(shouldOfferTapToStart({ ...late, roomWantedPlay: false })).toBe(false);
        expect(shouldOfferTapToStart({ ...late, hasPlayed: true, autoplayBlocked: true })).toBe(
            false,
        );
        expect(shouldOfferTapToStart({ ...late, dismissed: true })).toBe(false);
    });
});
