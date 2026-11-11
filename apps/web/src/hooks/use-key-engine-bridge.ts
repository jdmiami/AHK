'use client';

import { useEffect, useRef, useState } from 'react';
import { effectiveSongAdjust } from '@vkara/room';

import {
    KEY_ENGINE_CHANNEL,
    KEY_ENGINE_STALE_MS,
    type KeyEngineFromEngine,
    type KeyEngineToEngine,
} from '@/lib/key-engine-bridge';
import { useWebSocket } from '@/providers/websocket-provider';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * Big-screen side of the key changer: sends the current key to the key-engine window and
 * reports to the room whether the engine is running (so phones know key changes are audible).
 */
export function useKeyEngineBridge(): { active: boolean } {
    const semitones = useYouTubeStore((s) => effectiveSongAdjust(s.room).semitones);
    const roomId = useYouTubeStore((s) => s.room?.id ?? null);
    const roomActive = useYouTubeStore((s) => Boolean(s.room?.keyEngineActive));
    const { ensureConnectedAndSend } = useWebSocket();
    const [active, setActive] = useState(false);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const semitonesRef = useRef(semitones);
    semitonesRef.current = semitones;

    useEffect(() => {
        if (typeof BroadcastChannel !== 'function') return;
        const channel = new BroadcastChannel(KEY_ENGINE_CHANNEL);
        channelRef.current = channel;
        let lastBeat = 0;

        const post = (message: KeyEngineToEngine) => channel.postMessage(message);
        channel.onmessage = (event: MessageEvent<KeyEngineFromEngine>) => {
            const message = event.data;
            if (message.type === 'hello') {
                post({ type: 'key', semitones: semitonesRef.current });
            } else if (message.type === 'status') {
                lastBeat = message.active ? Date.now() : 0;
                setActive(message.active);
                if (message.active) post({ type: 'key', semitones: semitonesRef.current });
            } else if (message.type === 'heartbeat') {
                lastBeat = Date.now();
                setActive(true);
            }
        };

        const staleTimer = window.setInterval(() => {
            if (lastBeat && Date.now() - lastBeat > KEY_ENGINE_STALE_MS) {
                lastBeat = 0;
                setActive(false);
            }
        }, 1_000);

        return () => {
            window.clearInterval(staleTimer);
            channel.close();
            channelRef.current = null;
        };
    }, []);

    useEffect(() => {
        channelRef.current?.postMessage({ type: 'key', semitones } satisfies KeyEngineToEngine);
    }, [semitones]);

    // Only the tab that saw the engine reports it: another big-screen device without the
    // engine must not flip the room back to "off".
    const reportedRef = useRef(false);
    useEffect(() => {
        if (!roomId) return;
        if (active && (!roomActive || !reportedRef.current)) {
            reportedRef.current = true;
            ensureConnectedAndSend({ type: 'setKeyEngineActive', active: true });
        } else if (!active && reportedRef.current) {
            reportedRef.current = false;
            if (roomActive) ensureConnectedAndSend({ type: 'setKeyEngineActive', active: false });
        }
    }, [active, roomActive, roomId, ensureConnectedAndSend]);

    return { active };
}
