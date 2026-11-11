'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MousePointerClick, Play } from 'lucide-react';
import { isTikTokVideo } from '@vkara/tiktok';

import {
    hasUserActivation,
    shouldOfferTapToStart,
    TAP_TO_START_AFTER_MS,
} from '@/lib/playback-unlock';
import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';

const YT_PLAYING = 1;

/**
 * Big screen guard against blocked autoplay:
 * - before anyone has clicked the page, a small note asks for one click (so the first song
 *   can start with sound);
 * - if a song still cannot start, a full-screen "Click to start the music" button (or any key
 *   on a TV remote) unmutes and plays it. After that the browser allows autoplay for the rest
 *   of the night on this page.
 */
export function TvPlaybackUnlock() {
    const t = useScopedI18n('tvUnlock');
    const player = useYouTubeStore((s) => s.player);
    const roomId = useYouTubeStore((s) => s.room?.id ?? null);
    const playing = useYouTubeStore((s) => s.room?.playingNow ?? null);
    const roomIsPlaying = useYouTubeStore((s) => Boolean(s.room?.isPlaying));
    const videoId = playing && !isTikTokVideo(playing) ? playing.id : null;

    const [activated, setActivated] = useState(true);
    const [offer, setOffer] = useState(false);
    const hasPlayedRef = useRef(false);
    const blockedRef = useRef(false);
    const wantedPlayRef = useRef(false);
    const dismissedRef = useRef(false);
    const loadedAtRef = useRef(0);

    const evaluate = useCallback(() => {
        setOffer(
            shouldOfferTapToStart({
                hasPlayed: hasPlayedRef.current,
                roomWantedPlay: wantedPlayRef.current,
                autoplayBlocked: blockedRef.current,
                dismissed: dismissedRef.current,
                elapsedMs: Date.now() - loadedAtRef.current,
            }),
        );
    }, []);

    const start = useCallback(() => {
        setActivated(true);
        setOffer(false);
        dismissedRef.current = true;
        if (!player) return;
        try {
            player.unMute();
            player.playVideo();
        } catch {
            // Player not ready; the room's play state will start it when it is.
        }
    }, [player]);

    // Track the first click / key press on this page.
    useEffect(() => {
        setActivated(hasUserActivation());
        const onGesture = () => setActivated(true);
        window.addEventListener('pointerdown', onGesture, { capture: true });
        window.addEventListener('keydown', onGesture, { capture: true });
        return () => {
            window.removeEventListener('pointerdown', onGesture, { capture: true });
            window.removeEventListener('keydown', onGesture, { capture: true });
        };
    }, []);

    // Watch the current song: did it start, did YouTube report blocked autoplay?
    useEffect(() => {
        hasPlayedRef.current = false;
        blockedRef.current = false;
        dismissedRef.current = false;
        wantedPlayRef.current = useYouTubeStore.getState().room?.isPlaying ?? false;
        loadedAtRef.current = Date.now();
        setOffer(false);
        if (!player || !videoId) return;

        const onState = (event: YT.OnStateChangeEvent) => {
            if (event.data === YT_PLAYING) {
                hasPlayedRef.current = true;
                setOffer(false);
            }
        };
        const onBlocked = () => {
            blockedRef.current = true;
            evaluate();
        };
        player.addEventListener('onStateChange', onState);
        // Not in the YT typings, but fired by the IFrame API when the browser blocks autoplay.
        (player.addEventListener as (event: string, listener: () => void) => void)(
            'onAutoplayBlocked',
            onBlocked,
        );
        const timer = window.setTimeout(evaluate, TAP_TO_START_AFTER_MS);
        return () => {
            window.clearTimeout(timer);
            try {
                player.removeEventListener('onStateChange', onState);
                (player.removeEventListener as (event: string, listener: () => void) => void)(
                    'onAutoplayBlocked',
                    onBlocked,
                );
            } catch {
                // Player already destroyed.
            }
        };
    }, [player, videoId, evaluate]);

    // Remember that the room asked for play (a blocked start flips the room back to paused).
    useEffect(() => {
        if (roomIsPlaying) wantedPlayRef.current = true;
    }, [roomIsPlaying, videoId]);

    // While the button shows, any key (TV remote OK) also starts the song.
    useEffect(() => {
        if (!offer) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') return;
            start();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [offer, start]);

    if (offer && videoId) {
        return (
            <button
                type="button"
                onClick={start}
                autoFocus
                className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-black/70 text-center text-white backdrop-blur-sm"
            >
                <span className="ahk-enter flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--ahk-glow-primary)]">
                    <Play className="h-14 w-14 translate-x-1" aria-hidden />
                </span>
                <span
                    className="ahk-enter text-3xl font-semibold"
                    style={{ ['--ahk-i' as string]: 1 }}
                >
                    {t('title')}
                </span>
                <span
                    className="ahk-enter max-w-md px-6 text-base text-zinc-300"
                    style={{ ['--ahk-i' as string]: 2 }}
                >
                    {t('hint')}
                </span>
            </button>
        );
    }

    if (!activated && roomId && !videoId) {
        return (
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[40] flex justify-center px-4">
                <p className="ahk-enter flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-black/80 px-4 py-2 text-sm text-zinc-200 shadow-[var(--ahk-glow-secondary)]">
                    <MousePointerClick className="h-4 w-4 text-neon-cyan" aria-hidden />
                    {t('idleHint')}
                </p>
            </div>
        );
    }

    return null;
}
