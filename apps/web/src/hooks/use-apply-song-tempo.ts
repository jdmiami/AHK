'use client';

import { useEffect } from 'react';
import { effectiveSongAdjust } from '@vkara/room';

import { useYouTubeStore } from '@/store/youtubeStore';

const YT_PLAYING = 1;

/**
 * Applies the room's tempo for the playing song to the YouTube player on this device.
 * YouTube keeps the pitch when the rate changes. Re-applied when playback starts because the
 * player can fall back to 1x after loading a new video.
 */
export function useApplySongTempo(): void {
    const player = useYouTubeStore((s) => s.player);
    const videoId = useYouTubeStore((s) => s.room?.playingNow?.id ?? null);
    const rate = useYouTubeStore((s) => effectiveSongAdjust(s.room).rate);

    useEffect(() => {
        if (!player || !videoId) return;

        const apply = () => {
            try {
                if (player.getPlaybackRate() !== rate) {
                    player.setPlaybackRate(rate);
                }
            } catch {
                // Player not ready yet (iframe still loading); the PLAYING event re-applies.
            }
        };

        const onStateChange = (event: YT.OnStateChangeEvent) => {
            if (event.data === YT_PLAYING) apply();
        };

        apply();
        player.addEventListener('onStateChange', onStateChange);
        return () => {
            try {
                player.removeEventListener('onStateChange', onStateChange);
            } catch {
                // Player already destroyed.
            }
        };
    }, [player, videoId, rate]);
}
