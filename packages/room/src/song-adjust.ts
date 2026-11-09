import type { Room } from './websocket';

/** Tempo range offered on the remote (YouTube preserves pitch when the rate changes). */
export const TEMPO_MIN = 0.5;
export const TEMPO_MAX = 1.5;
export const TEMPO_STEP = 0.05;

/** Key range in semitones for the laptop key engine. */
export const KEY_MIN = -6;
export const KEY_MAX = 6;

/**
 * Per-song tempo and key. Scoped to `videoId`: when the playing video changes, the stored
 * values no longer match and every client falls back to normal tempo / original key, so the
 * reset happens no matter which code path changed the song.
 */
export interface SongAdjust {
    videoId: string | null;
    rate: number;
    semitones: number;
}

export interface EffectiveSongAdjust {
    rate: number;
    semitones: number;
}

export const NEUTRAL_SONG_ADJUST: EffectiveSongAdjust = { rate: 1, semitones: 0 };

export function clampTempo(rate: number): number {
    if (!Number.isFinite(rate)) return 1;
    const stepped = Math.round(rate / TEMPO_STEP) * TEMPO_STEP;
    const clamped = Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, stepped));
    return Math.round(clamped * 100) / 100;
}

export function clampSemitones(semitones: number): number {
    if (!Number.isFinite(semitones)) return 0;
    return Math.min(KEY_MAX, Math.max(KEY_MIN, Math.round(semitones)));
}

/** Tempo and key that apply to the song playing right now. */
export function effectiveSongAdjust(
    room: Pick<Room, 'playingNow' | 'songAdjust'> | null | undefined,
): EffectiveSongAdjust {
    const adjust = room?.songAdjust;
    const playingId = room?.playingNow?.id ?? null;
    if (!adjust || !playingId || adjust.videoId !== playingId) {
        return NEUTRAL_SONG_ADJUST;
    }
    return { rate: clampTempo(adjust.rate), semitones: clampSemitones(adjust.semitones) };
}

/**
 * Next stored value after a change for `videoId`. Returns null when `videoId` is not the
 * playing video (a stale tap from a phone that has not seen the song change yet).
 */
export function applySongAdjustChange(
    room: Pick<Room, 'playingNow' | 'songAdjust'>,
    videoId: string,
    change: { rate?: number; semitones?: number },
): SongAdjust | null {
    if (!room.playingNow || room.playingNow.id !== videoId) {
        return null;
    }
    const current = effectiveSongAdjust(room);
    return {
        videoId,
        rate: change.rate === undefined ? current.rate : clampTempo(change.rate),
        semitones:
            change.semitones === undefined ? current.semitones : clampSemitones(change.semitones),
    };
}
