'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAT_ON_TV, type ReactionEvent } from '@vkara/room';

import { useReactionEvents, useRoomChat } from '@/hooks/use-party';

const MAX_FLOATING = 30;
const FLOAT_MS = 3500;

type Floating = {
    key: string;
    emoji: string;
    name: string;
    color: string;
    left: number;
    drift: number;
};

/** Big screen: cheers rising from the bottom, and the last lines of the party chat. */
export function TvPartyOverlay() {
    return (
        <>
            <TvReactions />
            <TvChatTicker />
        </>
    );
}

function TvReactions() {
    const [floating, setFloating] = useState<Floating[]>([]);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

    const add = useCallback((reaction: ReactionEvent) => {
        const item: Floating = {
            key: reaction.id,
            emoji: reaction.emoji,
            name: reaction.from.name,
            color: reaction.from.color,
            // Rise through the middle-right of the screen, clear of the chat on the left.
            left: 30 + Math.random() * 55,
            drift: Math.round((Math.random() - 0.5) * 160),
        };
        setFloating((list) => [...list.slice(-(MAX_FLOATING - 1)), item]);
        const timer = setTimeout(() => {
            timers.current.delete(timer);
            setFloating((list) => list.filter((entry) => entry.key !== item.key));
        }, FLOAT_MS);
        timers.current.add(timer);
    }, []);
    useReactionEvents(add);
    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach((timer) => clearTimeout(timer));
    }, []);

    if (floating.length === 0) return null;
    return (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
            {floating.map((item) => (
                <div
                    key={item.key}
                    className="ahk-float-emoji absolute bottom-[8vh] flex flex-col items-center"
                    style={
                        {
                            left: `${item.left}%`,
                            '--ahk-drift': `${item.drift}px`,
                        } as React.CSSProperties
                    }
                >
                    <span className="text-[min(9vh,5rem)] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                        {item.emoji}
                    </span>
                    <span
                        className="mt-1 max-w-[12rem] truncate rounded-full bg-black/60 px-2 py-0.5 text-sm font-medium"
                        style={{ color: item.color }}
                    >
                        {item.name}
                    </span>
                </div>
            ))}
        </div>
    );
}

function TvChatTicker() {
    const chat = useRoomChat();
    const lines = chat.slice(-CHAT_ON_TV);
    if (lines.length === 0) return null;
    return (
        <ol
            className="pointer-events-none absolute bottom-6 left-6 z-20 flex w-[min(40rem,46vw)] flex-col items-start gap-1.5"
            aria-label="Party chat"
        >
            {lines.map((line) => (
                <li
                    key={line.id}
                    className="ahk-enter max-w-full rounded-2xl bg-black/75 px-4 py-2 text-lg leading-snug text-white shadow-lg backdrop-blur"
                >
                    <span className="mr-1.5" aria-hidden>
                        {line.emoji}
                    </span>
                    <span className="font-semibold" style={{ color: line.color }}>
                        {line.name}
                    </span>
                    <span className="text-white/60">: </span>
                    <span className="break-words">{line.text}</span>
                </li>
            ))}
        </ol>
    );
}
