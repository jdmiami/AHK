'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    hostAudioReady,
    LoungeMusic,
    playApplause,
    playIntroSting,
    unlockHostAudio,
} from '@/lib/host-show/audio';
import { hostLine, speakableTitle, toHostLocale, type HostLocale } from '@/lib/host-show/script';
import { speak, stopSpeaking, warmUpVoices } from '@/lib/host-show/voice';
import { useCurrentLocale } from '@/locales/client';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useHostShowStore } from '@/store/hostShowStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const INVITE_EVERY_MS = 4 * 60 * 1000;
const MAX_INVITES = 5;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The big screen's announcer: applause and "give it up for…" when a song ends, an intro of
 * who is next and with what song (the next song waits for it), and lounge music with an
 * invite to add songs while nothing is queued.
 */
export function TvHostShow() {
    const locale = toHostLocale(useCurrentLocale());
    const announcer = useHostShowStore((s) => s.announcer);
    const musicOn = useHostShowStore((s) => s.music);
    const cancelSeq = useHostShowStore((s) => s.cancelSeq);
    const playingId = useYouTubeStore((s) => s.room?.playingNow?.id ?? null);
    const queueLength = useYouTubeStore((s) => s.room?.videoQueue?.length ?? 0);
    const ended = useCountdownStore((s) => s.shouldShowTimer);
    const [audioReady, setAudioReady] = useState(false);

    const music = useRef<LoungeMusic | null>(null);
    const token = useRef(0);
    const introduced = useRef<string | null>(null);
    const lastPlaying = useRef<string | null | undefined>(undefined);
    const prevEnded = useRef(ended);
    const invites = useRef({ count: 0, last: 0 });
    const welcomed = useRef(false);

    if (!music.current && typeof window !== 'undefined') music.current = new LoungeMusic();

    // Test hook: `?ahk-debug=1` lets a browser test mark the song as ended (YouTube can't play there).
    useEffect(() => {
        if (!new URLSearchParams(window.location.search).has('ahk-debug')) return;
        (window as unknown as { __ahkHostShow?: object }).__ahkHostShow = {
            endSong: () => useCountdownStore.getState().setShouldShowTimer(true),
            state: () => ({
                ...useHostShowStore.getState(),
                musicPlaying: music.current?.playing ?? false,
            }),
        };
    }, []);

    // Sound needs one click on the page; any click or key press unlocks it.
    useEffect(() => {
        warmUpVoices();
        const unlock = () => {
            unlockHostAudio();
            setTimeout(() => setAudioReady(hostAudioReady()), 150);
        };
        unlock();
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);
        const poll = setInterval(() => {
            if (hostAudioReady()) {
                setAudioReady(true);
                clearInterval(poll);
            }
        }, 2000);
        return () => {
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
            clearInterval(poll);
        };
    }, []);

    const say = useCallback(async (text: string, alive: () => boolean, lang: HostLocale) => {
        if (!alive()) return;
        const store = useHostShowStore.getState();
        store.setCaption(text);
        music.current?.duck(true);
        await speak(text, lang);
        music.current?.duck(false);
        if (alive()) useHostShowStore.getState().setCaption(null);
    }, []);

    const begin = useCallback(() => {
        stopSpeaking();
        const mine = ++token.current;
        return () => token.current === mine;
    }, []);

    // "Play next" (or anything else) cut the announcer off.
    useEffect(() => {
        if (cancelSeq === 0) return;
        token.current += 1;
        stopSpeaking();
        music.current?.duck(false);
    }, [cancelSeq]);

    const introLine = useCallback(
        (videoId: string | undefined) => {
            const room = useYouTubeStore.getState().room;
            const video =
                room?.playingNow?.id === videoId
                    ? room?.playingNow
                    : room?.videoQueue?.find((v) => v.id === videoId);
            if (!video) return null;
            const singer = video.singerId ? room?.singers?.[video.singerId] : null;
            const song = speakableTitle(video.title, locale);
            return singer
                ? hostLine('intro', locale, { name: singer.stageName, song })
                : hostLine('introHouse', locale, { song });
        },
        [locale],
    );

    // A song just ended: applause, thanks, then introduce who is next (or invite people).
    useEffect(() => {
        const was = prevEnded.current;
        prevEnded.current = ended;
        if (!ended || was || !announcer) return;
        const room = useYouTubeStore.getState().room;
        const finished = room?.playingNow;
        if (!finished) return;
        const singer = finished.singerId ? room?.singers?.[finished.singerId] : null;
        const alive = begin();
        const store = useHostShowStore.getState();
        store.setBusy(true);
        void (async () => {
            const applause = playApplause(4.5);
            await wait(900);
            await say(
                singer
                    ? hostLine('thanks', locale, { name: singer.stageName })
                    : hostLine('thanksHouse', locale),
                alive,
                locale,
            );
            await applause;
            if (!alive()) return;
            const next = useYouTubeStore.getState().room?.videoQueue?.[0];
            if (next) {
                await playIntroSting();
                const line = introLine(next.id);
                if (line) await say(line, alive, locale);
                introduced.current = next.id;
            } else {
                await say(hostLine('invite', locale), alive, locale);
                invites.current = { count: 1, last: Date.now() };
            }
        })().finally(() => {
            if (alive()) useHostShowStore.getState().setBusy(false);
        });
    }, [ended, announcer, begin, introLine, locale, say]);

    // A song started that nobody introduced (first song, or the host skipped ahead):
    // introduce it over the opening with the song turned down.
    useEffect(() => {
        if (lastPlaying.current === undefined) {
            // First render: whatever is already playing was introduced before this page loaded.
            lastPlaying.current = playingId;
            introduced.current = playingId;
            return;
        }
        if (playingId === lastPlaying.current) return;
        lastPlaying.current = playingId;
        if (!playingId || !announcer || introduced.current === playingId) return;
        introduced.current = playingId;
        const line = introLine(playingId);
        if (!line) return;
        const alive = begin();
        void (async () => {
            const { player, room } = useYouTubeStore.getState();
            const volume = room?.volume ?? 100;
            try {
                player?.setVolume(Math.round(volume * 0.3));
            } catch {
                // Player not ready; speak over it anyway.
            }
            await playIntroSting();
            await say(line, alive, locale);
            try {
                const current = useYouTubeStore.getState();
                current.player?.setVolume(current.room?.volume ?? volume);
            } catch {
                // Ignore.
            }
        })();
    }, [playingId, announcer, begin, introLine, locale, say]);

    // Nothing to sing: lounge music, plus an invite now and then.
    const idle = !playingId || (ended && queueLength === 0);
    useEffect(() => {
        if (musicOn && idle && audioReady) music.current?.start();
        else music.current?.stop();
    }, [musicOn, idle, audioReady]);

    useEffect(() => {
        if (!idle) {
            invites.current = { count: 0, last: 0 };
            return;
        }
        if (!announcer || !audioReady) return;
        if (!welcomed.current && !playingId) {
            welcomed.current = true;
            const alive = begin();
            void say(hostLine('welcome', locale), alive, locale);
            invites.current = { count: 1, last: Date.now() };
        }
        const timer = setInterval(() => {
            const { busy } = useHostShowStore.getState();
            const { count, last } = invites.current;
            if (busy || count >= MAX_INVITES || Date.now() - last < INVITE_EVERY_MS) return;
            invites.current = { count: count + 1, last: Date.now() };
            const alive = begin();
            void say(hostLine('invite', locale), alive, locale);
        }, 15_000);
        return () => clearInterval(timer);
    }, [idle, announcer, audioReady, playingId, begin, locale, say]);

    useEffect(
        () => () => {
            music.current?.stop(0.2);
            stopSpeaking();
        },
        [],
    );

    // The caption is shown in the big screen's side panel (TvStageRail).
    return null;
}
