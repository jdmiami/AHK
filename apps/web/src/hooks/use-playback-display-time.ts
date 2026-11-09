'use client';

import { useEffect, useRef, useState } from 'react';

import {
    computeExtrapolatedPlaybackSeconds,
    effectiveSongAdjust,
    type PlaybackDisplayAnchor,
} from '@vkara/room';
import { useYouTubeStore } from '@/store/youtubeStore';

const TICK_MS = 1_000;

type UsePlaybackDisplayTimeOptions = {
    /** When false, skips the extrapolation interval (e.g. hidden controls tab). */
    enabled?: boolean;
};

function createPlaybackDisplayAnchorFromStore(): PlaybackDisplayAnchor {
    const room = useYouTubeStore.getState().room;
    return {
        baseSeconds: room?.currentTime ?? 0,
        syncedAtMs: Date.now(),
        isPlaying: Boolean(room?.isPlaying),
        videoId: room?.playingNow?.id ?? null,
        rate: effectiveSongAdjust(room).rate,
    };
}

/**
 * Smooth playback position for UI: extrapolates from the last server anchor while playing.
 */
export function usePlaybackDisplayTime(options?: UsePlaybackDisplayTimeOptions): number {
    const enabled = options?.enabled ?? true;
    const videoId = useYouTubeStore((s) => s.room?.playingNow?.id ?? null);
    const serverTime = useYouTubeStore((s) => s.room?.currentTime ?? 0);
    const isPlaying = useYouTubeStore((s) => Boolean(s.room?.isPlaying));
    const rate = useYouTubeStore((s) => effectiveSongAdjust(s.room).rate);
    const anchorRef = useRef<PlaybackDisplayAnchor | null>(null);
    if (anchorRef.current === null) {
        anchorRef.current = createPlaybackDisplayAnchorFromStore();
    }
    const [displayTime, setDisplayTime] = useState(() =>
        computeExtrapolatedPlaybackSeconds(anchorRef.current!),
    );

    useEffect(() => {
        anchorRef.current = {
            baseSeconds: serverTime,
            syncedAtMs: Date.now(),
            isPlaying,
            videoId,
            rate,
        };
        setDisplayTime(computeExtrapolatedPlaybackSeconds(anchorRef.current));
    }, [serverTime, isPlaying, videoId, rate]);

    useEffect(() => {
        if (!enabled || !isPlaying || !videoId) {
            return;
        }

        const tick = () => {
            setDisplayTime(computeExtrapolatedPlaybackSeconds(anchorRef.current!));
        };

        // Resume from the existing anchor (do not rewrite from potentially-stale serverTime).
        tick();
        const id = window.setInterval(tick, TICK_MS);
        return () => window.clearInterval(id);
    }, [enabled, isPlaying, videoId]);

    return displayTime;
}
