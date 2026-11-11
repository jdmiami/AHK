import type { YouTubeVideo } from '@vkara/youtube';

import type { Participant, Room } from './websocket';

/**
 * Singer rotation ("fairness first"): every singer keeps their own song list, and the room queue
 * is built from those lists. Whoever has waited longest since they last sang goes next; someone
 * who has not sung yet counts their wait from when they joined. Each round takes one song per
 * singer, so nobody sings twice before everyone in line has had a turn.
 */

/** Lane for songs added by the TV, AI agents or before rotation existed. */
export const HOUSE_SINGER_ID = '__house';

export const SINGER_COLORS = [
    '#FF2DAA',
    '#22E6FF',
    '#7C5CFF',
    '#FFB020',
    '#3DFF8F',
    '#FF5A5A',
    '#4DA3FF',
    '#F7F06D',
] as const;

export const SINGER_EMOJIS = [
    '🎤',
    '🎸',
    '🎹',
    '🥁',
    '🎷',
    '🎺',
    '🪩',
    '🦄',
    '🔥',
    '⭐',
    '🌙',
    '🐯',
] as const;

export const STAGE_NAME_MAX = 32;

export interface Singer {
    deviceId: string;
    stageName: string;
    emoji: string;
    color: string;
    /** ms since epoch — first time this device took part in the rotation. */
    joinedAt: number;
    /** ms since epoch — when this singer's last song started; null = has not sung yet. */
    lastSangAt: number | null;
    /** Sitting out: songs are kept aside and skipped until they come back. */
    paused: boolean;
    /** Songs held while paused, in the singer's own order. */
    parked: YouTubeVideo[];
    /** Songs sung tonight in this room. */
    songsSung: number;
    /** Saved profile (Supabase) linked by PIN login, if any. */
    profileId?: string | null;
}

type RotationRoom = Pick<Room, 'videoQueue' | 'playingNow'> & {
    singers?: Record<string, Singer>;
};

function hashString(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function cleanStageName(name: string | undefined | null): string {
    return (name ?? '').replace(/\s+/g, ' ').trim().slice(0, STAGE_NAME_MAX);
}

/** Stable default look for a device (used until the singer picks their own). */
export function defaultSingerLook(deviceId: string): { emoji: string; color: string } {
    const hash = hashString(deviceId);
    return {
        emoji: SINGER_EMOJIS[hash % SINGER_EMOJIS.length]!,
        color: SINGER_COLORS[(hash >>> 8) % SINGER_COLORS.length]!,
    };
}

export type SingerInit = {
    stageName?: string;
    emoji?: string;
    color?: string;
    /** When they joined the room (their wait starts here); defaults to now. */
    joinedAt?: number;
};

export function createSinger(deviceId: string, now: number, init: SingerInit = {}): Singer {
    const look = defaultSingerLook(deviceId);
    return {
        deviceId,
        stageName: cleanStageName(init.stageName) || 'Singer',
        emoji: init.emoji || look.emoji,
        color: init.color || look.color,
        joinedAt: init.joinedAt ?? now,
        lastSangAt: null,
        paused: false,
        parked: [],
        songsSung: 0,
        profileId: null,
    };
}

/** Get or create the singer for a device. */
export function ensureSinger(
    room: { singers?: Record<string, Singer> },
    deviceId: string,
    now: number,
    init?: SingerInit,
): Singer {
    room.singers ??= {};
    const existing = room.singers[deviceId];
    if (existing) return existing;
    const singer = createSinger(deviceId, now, init);
    room.singers[deviceId] = singer;
    return singer;
}

function laneOf(video: YouTubeVideo): string {
    return video.singerId ?? HOUSE_SINGER_ID;
}

/** How long a lane has been waiting: earlier = goes first. The person singing now waits last. */
function waitKey(
    singers: Record<string, Singer>,
    lane: string,
    singingNow?: string | null,
): number {
    const singer = singers[lane];
    if (!singer) return Number.NEGATIVE_INFINITY; // house songs keep their place at the front
    if (singingNow && lane === singingNow) return Number.POSITIVE_INFINITY;
    return singer.lastSangAt ?? singer.joinedAt;
}

/** Order a queue into fairness rounds, keeping each singer's own song order. */
export function orderByRotation(
    queue: readonly YouTubeVideo[],
    singers: Record<string, Singer>,
    singingNow?: string | null,
): YouTubeVideo[] {
    const lanes = new Map<string, YouTubeVideo[]>();
    for (const video of queue) {
        const lane = laneOf(video);
        const list = lanes.get(lane);
        if (list) list.push(video);
        else lanes.set(lane, [video]);
    }
    const order = [...lanes.keys()].sort((a, b) => {
        const ka = waitKey(singers, a, singingNow);
        const kb = waitKey(singers, b, singingNow);
        if (ka !== kb) return ka < kb ? -1 : 1;
        return a < b ? -1 : a > b ? 1 : 0;
    });
    const rounds = Math.max(0, ...[...lanes.values()].map((list) => list.length));
    const result: YouTubeVideo[] = [];
    for (let round = 0; round < rounds; round += 1) {
        for (const lane of order) {
            const video = lanes.get(lane)![round];
            if (video) result.push(video);
        }
    }
    return result;
}

/**
 * Bring a room in line with the rotation rules after any change:
 * - a newly started song counts for its singer; when a singer's song ends their wait restarts;
 * - paused singers' songs move aside (and come back when they return);
 * - the queue is re-ordered by fairness.
 * No-op for rooms with no singers (legacy behaviour).
 */
export function applyRotation(
    room: RotationRoom,
    now: number,
    previousPlayingId: string | null,
    previousSingerId: string | null = null,
): void {
    const singers = room.singers;
    if (!singers || Object.keys(singers).length === 0) return;

    const playing = room.playingNow;
    const songChanged = (playing?.id ?? null) !== previousPlayingId;
    if (songChanged && previousSingerId && singers[previousSingerId]) {
        // Their song just ended (or was skipped): their wait starts now.
        singers[previousSingerId].lastSangAt = now;
    }
    if (playing && songChanged && playing.singerId) {
        const singer = singers[playing.singerId];
        if (singer) {
            singer.lastSangAt = now;
            singer.songsSung += 1;
        }
    }

    const keep: YouTubeVideo[] = [];
    for (const video of room.videoQueue) {
        const singer = video.singerId ? singers[video.singerId] : undefined;
        if (singer?.paused) singer.parked.push(video);
        else keep.push(video);
    }
    for (const singer of Object.values(singers)) {
        if (!singer.paused && singer.parked.length > 0) {
            keep.push(...singer.parked);
            singer.parked = [];
        }
    }
    room.videoQueue = orderByRotation(keep, singers, playing?.singerId ?? null);
}

/** Move a singer to the back of the line for one turn ("skip my turn"). */
export function skipSingerTurn(singer: Singer, now: number): void {
    singer.lastSangAt = now;
}

export type SingerStanding = {
    /** 1-based position of this singer's next song in the queue; null when they have none queued. */
    position: number | null;
    /** Songs this singer has queued (or parked while paused). */
    queuedCount: number;
    /** This singer's song is playing now. */
    isSinging: boolean;
};

export function singerStanding(
    room: Pick<Room, 'videoQueue' | 'playingNow'> & { singers?: Record<string, Singer> },
    deviceId: string,
): SingerStanding {
    const singer = room.singers?.[deviceId];
    const index = room.videoQueue.findIndex((video) => video.singerId === deviceId);
    const queued = room.videoQueue.filter((video) => video.singerId === deviceId).length;
    return {
        position: index >= 0 ? index + 1 : null,
        queuedCount: queued + (singer?.parked.length ?? 0),
        isSinging: room.playingNow?.singerId === deviceId,
    };
}

type PolicyRoom = Pick<Room, 'playingNow' | 'videoQueue'> & {
    participants?: Record<string, Participant>;
    hostDeviceId?: string;
};

/** Host, TV screens and AI agents run the room. */
export function isRoomController(room: PolicyRoom, deviceId: string | null | undefined): boolean {
    if (!deviceId) return false;
    const participant = room.participants?.[deviceId];
    if (room.hostDeviceId && room.hostDeviceId === deviceId) return true;
    return Boolean(
        participant &&
        (participant.role === 'host' || participant.isTvConnection || participant.isAgent),
    );
}

/** Play/pause/skip/seek/volume/tempo/key: the host, or the person whose song is playing. */
export function canControlPlayback(room: PolicyRoom, deviceId: string | null | undefined): boolean {
    if (isRoomController(room, deviceId)) return true;
    const owner = room.playingNow?.singerId;
    return Boolean(deviceId && owner && owner === deviceId);
}

/** Remove or reorder a queued song: the host, or the singer it belongs to. */
export function canEditQueuedSong(
    room: PolicyRoom,
    deviceId: string | null | undefined,
    videoId: string,
): boolean {
    if (isRoomController(room, deviceId)) return true;
    const video = room.videoQueue.find((item) => item.id === videoId);
    return Boolean(deviceId && video?.singerId && video.singerId === deviceId);
}
