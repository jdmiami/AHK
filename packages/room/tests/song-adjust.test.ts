import { describe, expect, it } from 'vitest';

import {
    applySongAdjustChange,
    clampSemitones,
    clampTempo,
    computeExtrapolatedPlaybackSeconds,
    effectiveSongAdjust,
    NEUTRAL_SONG_ADJUST,
    normalizePersistedRoom,
} from '../src';
import type { Room } from '../src';

const video = (id: string) => ({ id }) as unknown as NonNullable<Room['playingNow']>;

describe('clampTempo / clampSemitones', () => {
    it('snaps tempo to 0.05 steps inside 0.5–1.5', () => {
        expect(clampTempo(0.87)).toBe(0.85);
        expect(clampTempo(0.1)).toBe(0.5);
        expect(clampTempo(3)).toBe(1.5);
        expect(clampTempo(Number.NaN)).toBe(1);
    });

    it('rounds key to whole semitones inside -6..+6', () => {
        expect(clampSemitones(2.4)).toBe(2);
        expect(clampSemitones(-9)).toBe(-6);
        expect(clampSemitones(Number.POSITIVE_INFINITY)).toBe(0);
    });
});

describe('effectiveSongAdjust', () => {
    it('applies only while the stored song is playing (auto reset on song change)', () => {
        const songAdjust = { videoId: 'a', rate: 0.8, semitones: -2 };
        expect(effectiveSongAdjust({ playingNow: video('a'), songAdjust })).toEqual({
            rate: 0.8,
            semitones: -2,
        });
        expect(effectiveSongAdjust({ playingNow: video('b'), songAdjust })).toEqual(
            NEUTRAL_SONG_ADJUST,
        );
        expect(effectiveSongAdjust({ playingNow: null, songAdjust })).toEqual(NEUTRAL_SONG_ADJUST);
        expect(effectiveSongAdjust(null)).toEqual(NEUTRAL_SONG_ADJUST);
    });
});

describe('applySongAdjustChange', () => {
    it('changes one field and keeps the other for the same song', () => {
        const room = {
            playingNow: video('a'),
            songAdjust: { videoId: 'a', rate: 0.9, semitones: 0 },
        };
        expect(applySongAdjustChange(room, 'a', { semitones: 3 })).toEqual({
            videoId: 'a',
            rate: 0.9,
            semitones: 3,
        });
    });

    it('starts from neutral for a new song and ignores stale video ids', () => {
        const room = {
            playingNow: video('b'),
            songAdjust: { videoId: 'a', rate: 0.6, semitones: 4 },
        };
        expect(applySongAdjustChange(room, 'b', { rate: 1.2 })).toEqual({
            videoId: 'b',
            rate: 1.2,
            semitones: 0,
        });
        expect(applySongAdjustChange(room, 'a', { rate: 1.2 })).toBeNull();
    });
});

describe('tempo-aware extrapolation', () => {
    it('advances the display clock at the TV playback rate', () => {
        const anchor = { baseSeconds: 10, syncedAtMs: 0, isPlaying: true, videoId: 'a', rate: 0.5 };
        expect(computeExtrapolatedPlaybackSeconds(anchor, 4_000)).toBe(12);
        expect(computeExtrapolatedPlaybackSeconds({ ...anchor, rate: undefined }, 4_000)).toBe(14);
    });
});

describe('normalizePersistedRoom', () => {
    it('clamps stored song adjustments and defaults the key engine flag', () => {
        const room = normalizePersistedRoom({
            id: '1234',
            songAdjust: { videoId: 'a', rate: 9, semitones: -40 },
        } as never);
        expect(room?.songAdjust).toEqual({ videoId: 'a', rate: 1.5, semitones: -6 });
        expect(room?.keyEngineActive).toBe(false);
    });
});
