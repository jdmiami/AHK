/**
 * Saved singer profiles (Supabase). Phones call database functions directly with the
 * publishable key; the tables are closed and every function checks a session token or PIN.
 */
import type { YouTubeVideo } from '@vkara/youtube';

import { env } from '@/env';

export type ProfileSession = { token: string; profileId: string; stageName: string };

export type ProfileSong = {
    videoId: string;
    title: string;
    channel: string | null;
    thumbnail: string | null;
    durationSeconds?: number | null;
    durationFormatted?: string | null;
    sungAt?: string;
    createdAt?: string;
};

export type ProfileData = {
    profile: { id: string; stageName: string; emoji: string; color: string; createdAt: string };
    stats: {
        songs: number;
        nights: number;
        artists: number;
        secondsOnStage: number;
        bestNight: number;
        topArtists: { name: string; songs: number }[];
    };
    badges: BadgeId[];
    history: ProfileSong[];
    favorites: ProfileSong[];
};

export const BADGE_IDS = [
    'first_song',
    'ten_songs',
    'fifty_songs',
    'regular',
    'marathon',
    'explorer',
    'night_owl',
    'comeback',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export const BADGE_EMOJI: Record<BadgeId, string> = {
    first_song: '🎤',
    ten_songs: '🔟',
    fifty_songs: '🏆',
    regular: '🏠',
    marathon: '🏃',
    explorer: '🧭',
    night_owl: '🦉',
    comeback: '🔁',
};

export type ProfileErrorCode =
    | 'name_taken'
    | 'invalid_name'
    | 'invalid_pin'
    | 'wrong_name_or_pin'
    | 'locked'
    | 'invalid_session'
    | 'unavailable'
    | 'network';

export class ProfileError extends Error {
    constructor(public code: ProfileErrorCode) {
        super(code);
    }
}

export function profilesEnabled(): boolean {
    return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

const KNOWN: ProfileErrorCode[] = [
    'name_taken',
    'invalid_name',
    'invalid_pin',
    'wrong_name_or_pin',
    'locked',
    'invalid_session',
];

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
    if (!profilesEnabled()) throw new ProfileError('unavailable');
    let res: Response;
    try {
        res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
            method: 'POST',
            headers: {
                apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    } catch {
        throw new ProfileError('network');
    }
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
        const message = (data as { message?: string } | null)?.message ?? '';
        throw new ProfileError(KNOWN.find((code) => message.includes(code)) ?? 'unavailable');
    }
    const error = (data as { error?: string } | null)?.error;
    if (error) throw new ProfileError(KNOWN.find((code) => code === error) ?? 'unavailable');
    return data as T;
}

export function isValidPin(pin: string): boolean {
    return /^[0-9]{4,8}$/.test(pin);
}

export const claimProfile = (name: string, pin: string, emoji: string, color: string) =>
    rpc<ProfileSession>('ahk_claim_profile', {
        p_name: name,
        p_pin: pin,
        p_emoji: emoji,
        p_color: color,
    });

export const loginProfile = (name: string, pin: string) =>
    rpc<ProfileSession>('ahk_login', { p_name: name, p_pin: pin });

export const logoutProfile = (token: string) => rpc<null>('ahk_logout', { p_token: token });

export const fetchProfile = (token: string) => rpc<ProfileData>('ahk_profile', { p_token: token });

export const updateProfileLook = (token: string, emoji: string, color: string) =>
    rpc<null>('ahk_update_look', { p_token: token, p_emoji: emoji, p_color: color });

function songPayload(video: YouTubeVideo) {
    return {
        id: video.id,
        title: video.title,
        channel: video.channels?.[0]?.name ?? null,
        thumbnail: video.thumbnails?.[0]?.url ?? null,
        duration: video.duration ?? null,
        durationFormatted: video.duration_formatted ?? null,
    };
}

export const recordProfilePlay = (
    token: string,
    playKey: string,
    video: YouTubeVideo,
    roomId: string,
) =>
    rpc<{ ok: boolean }>('ahk_record_play', {
        p_token: token,
        p_play_key: playKey,
        p_video: songPayload(video),
        p_room_id: roomId,
        p_local_hour: new Date().getHours(),
    });

export const setProfileFavorite = (token: string, video: YouTubeVideo, on: boolean) =>
    rpc<null>('ahk_set_favorite', { p_token: token, p_video: songPayload(video), p_on: on });

/** Rebuild a queueable video from a saved song (history or favorites). */
export function songToVideo(song: ProfileSong): YouTubeVideo {
    return {
        id: song.videoId,
        title: song.title,
        duration: song.durationSeconds ?? 0,
        duration_formatted: song.durationFormatted ?? '',
        type: 'video',
        uploadedAt: '',
        url: `https://www.youtube.com/watch?v=${song.videoId}`,
        views: 0,
        channels: song.channel ? [{ name: song.channel, verified: false }] : [],
        thumbnails: song.thumbnail ? [{ url: song.thumbnail }] : [],
    } as YouTubeVideo;
}

export function formatStageTime(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
