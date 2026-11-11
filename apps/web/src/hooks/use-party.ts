'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import type { ChatMessage, ReactionEvent } from '@vkara/room';

import { getDeviceId } from '@/lib/device-id';
import { useWebSocketStore } from '@/store/websocketStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const EMPTY_CHAT: ChatMessage[] = [];

/** Calls `onReaction` for every cheer sent in the room (cheers are not stored). */
export function useReactionEvents(onReaction: (reaction: ReactionEvent) => void): void {
    const handler = useRef(onReaction);
    handler.current = onReaction;
    useEffect(
        () =>
            useWebSocketStore.subscribe((state, prev) => {
                const message = state.lastMessage;
                if (message && message !== prev.lastMessage && message.type === 'reaction') {
                    handler.current(message.reaction);
                }
            }),
        [],
    );
}

export function useRoomChat(): ChatMessage[] {
    return useYouTubeStore((s) => s.room?.chat ?? EMPTY_CHAT);
}

/** Which chat line this phone has seen, for the unread badge on the Party tab. */
export const usePartySeenStore = create<{
    seenId: string | null;
    setSeen: (id: string | null) => void;
}>()((set) => ({ seenId: null, setSeen: (seenId) => set({ seenId }) }));

export function useUnreadChatCount(): number {
    const chat = useRoomChat();
    const seenId = usePartySeenStore((s) => s.seenId);
    const myId = getDeviceId();
    const start = seenId ? chat.findIndex((line) => line.id === seenId) + 1 : 0;
    return chat.slice(start).filter((line) => line.deviceId !== myId).length;
}
