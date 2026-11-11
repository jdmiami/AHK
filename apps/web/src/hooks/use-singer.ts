'use client';

import { useEffect, useMemo } from 'react';
import {
    canControlPlayback,
    canEditQueuedSong,
    cleanStageName,
    defaultSingerLook,
    isRoomController,
    singerStanding,
    type Singer,
} from '@vkara/room';

import { getUserDisplayName, setUserDisplayName } from '@/lib/device-label';
import { getDeviceId } from '@/lib/device-id';
import { randomStageName } from '@/lib/stage-names';
import { useCurrentLocale } from '@/locales/client';
import { useWebSocket } from '@/providers/websocket-provider';
import { useSingerStore } from '@/store/singerStore';
import { useYouTubeStore } from '@/store/youtubeStore';

/** The rotation from this phone's point of view. */
export function useMySinger() {
    const room = useYouTubeStore((s) => s.room);
    const myId = getDeviceId();
    return useMemo(() => {
        const singers = room?.singers ?? {};
        const rotationOn = Object.keys(singers).length > 0;
        const me: Singer | null = (myId && singers[myId]) || null;
        const controller = room ? isRoomController(room, myId) : false;
        return {
            myId,
            me,
            rotationOn,
            isController: controller,
            canControl: !room || !rotationOn || canControlPlayback(room, myId),
            canEditSong: (videoId: string) =>
                !room || !rotationOn || canEditQueuedSong(room, myId, videoId),
            standing: room && myId ? singerStanding(room, myId) : null,
            singerFor: (deviceId: string | undefined) =>
                deviceId ? (singers[deviceId] ?? null) : null,
        };
    }, [room, myId]);
}

/**
 * Give this phone a stage name the first time, and keep the room's copy of it (name, emoji,
 * color, linked profile) in sync with what is saved on the phone.
 */
export function useSingerIdentitySync(): void {
    const locale = useCurrentLocale();
    const { stageName, emoji, color, profile, setIdentity } = useSingerStore();
    const roomId = useYouTubeStore((s) => s.room?.id ?? null);
    const remote = useYouTubeStore((s) => {
        const id = getDeviceId();
        return id ? (s.room?.singers?.[id] ?? null) : null;
    });
    const { ensureConnectedAndSend } = useWebSocket();

    useEffect(() => {
        if (stageName) return;
        const look = defaultSingerLook(getDeviceId() ?? Math.random().toString(36));
        setIdentity({
            // Keep a name the person already typed on this device; otherwise a random one.
            stageName: cleanStageName(getUserDisplayName()) || randomStageName(locale),
            emoji: emoji || look.emoji,
            color: color || look.color,
        });
    }, [stageName, emoji, color, locale, setIdentity]);

    // The device name (used when joining a room) always matches the stage name.
    useEffect(() => {
        if (stageName && getUserDisplayName() !== stageName) setUserDisplayName(stageName);
    }, [stageName]);

    const profileId = profile?.profileId ?? null;
    useEffect(() => {
        if (!roomId || !stageName) return;
        const inSync =
            remote &&
            remote.stageName === stageName &&
            remote.emoji === emoji &&
            remote.color === color &&
            (remote.profileId ?? null) === profileId;
        if (inSync) return;
        ensureConnectedAndSend({
            type: 'updateSinger',
            stageName,
            emoji: emoji || undefined,
            color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined,
            profileId,
        });
    }, [roomId, stageName, emoji, color, profileId, remote, ensureConnectedAndSend]);
}
