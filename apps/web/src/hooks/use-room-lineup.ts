'use client';

import { useMemo } from 'react';
import { roomLineup, type RoomLineup } from '@vkara/room';

import { useYouTubeStore } from '@/store/youtubeStore';

const EMPTY: RoomLineup = { now: null, upcoming: [], sittingOut: [] };

/** The room's lineup (singing now, up next, sitting out), the same on every screen. */
export function useRoomLineup(): RoomLineup {
    const playingNow = useYouTubeStore((s) => s.room?.playingNow ?? null);
    const videoQueue = useYouTubeStore((s) => s.room?.videoQueue);
    const singers = useYouTubeStore((s) => s.room?.singers);
    return useMemo(
        () => (videoQueue ? roomLineup({ playingNow, videoQueue, singers }) : EMPTY),
        [playingNow, videoQueue, singers],
    );
}
