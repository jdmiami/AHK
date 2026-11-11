'use client';

import { useEffect, useRef } from 'react';

import { getDeviceId } from '@/lib/device-id';
import { profilesEnabled, recordProfilePlay, updateProfileLook } from '@/lib/profile-api';
import { handleSessionError, useProfileDataStore } from '@/store/profileStore';
import { useSingerStore } from '@/store/singerStore';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * Keeps a logged-in profile up to date: loads it, saves emoji/color changes, and records
 * each song this phone's singer starts on the big screen.
 */
export function useProfileSync(): void {
    const token = useSingerStore((s) => s.profile?.token ?? null);
    const emoji = useSingerStore((s) => s.emoji);
    const color = useSingerStore((s) => s.color);
    const roomId = useYouTubeStore((s) => s.room?.id ?? null);
    const playing = useYouTubeStore((s) => s.room?.playingNow ?? null);
    const songsSung = useYouTubeStore((s) => {
        const id = getDeviceId();
        return id ? (s.room?.singers?.[id]?.songsSung ?? 0) : 0;
    });
    const recorded = useRef<string | null>(null);

    useEffect(() => {
        if (!profilesEnabled()) return;
        if (token) void useProfileDataStore.getState().refresh();
        else useProfileDataStore.getState().clear();
    }, [token]);

    useEffect(() => {
        if (!token || !emoji || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
        const saved = useProfileDataStore.getState().data?.profile;
        if (!saved || (saved.emoji === emoji && saved.color === color)) return;
        const timer = setTimeout(() => {
            updateProfileLook(token, emoji, color).catch(handleSessionError);
        }, 600);
        return () => clearTimeout(timer);
    }, [token, emoji, color]);

    const mine = Boolean(playing && playing.singerId && playing.singerId === getDeviceId());
    useEffect(() => {
        if (!token || !roomId || !playing || !mine) return;
        const playKey = `${roomId}:${songsSung}:${playing.id}`;
        if (recorded.current === playKey) return;
        recorded.current = playKey;
        recordProfilePlay(token, playKey, playing, roomId)
            .then(() => useProfileDataStore.getState().refresh())
            .catch(handleSessionError);
    }, [token, roomId, playing, mine, songsSung]);
}
