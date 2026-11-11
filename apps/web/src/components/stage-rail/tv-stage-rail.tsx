'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';
import { resolveRoomPasswordForShare } from '@vkara/room';
import { CHAT_ON_TV, type ReactionEvent } from '@vkara/room';

import { SingerChip } from '@/components/singer/singer-chip';
import { useReactionEvents, useRoomChat } from '@/hooks/use-party';
import { useRoomLineup } from '@/hooks/use-room-lineup';
import { generateShareableUrl } from '@/lib/room-share';
import { cn } from '@/lib/utils';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useHostShowStore } from '@/store/hostShowStore';
import { STAGE_RAIL_FRACTION, useStageRailStore } from '@/store/stageRailStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const CHAT_OPEN_MS = 15_000;
const CHEER_OPEN_MS = 8_000;
const FLOAT_MS = 3500;
const MAX_FLOATING = 24;
const UP_NEXT = 3;
const HOUSE = { emoji: '🏠', color: '#9CA3AF' };

type Floating = {
    key: string;
    emoji: string;
    name: string;
    color: string;
    left: number;
    drift: number;
};

/**
 * Big screen side panel. Closed, the video has the whole screen. It opens (and the video
 * shrinks beside it, nothing on top) during the intermission between songs, for a while after
 * a chat message, and while cheers are coming in.
 */
export function TvStageRail() {
    const t = useScopedI18n('lineup');
    const caption = useHostShowStore((s) => s.caption);
    const busy = useHostShowStore((s) => s.busy);
    const ended = useCountdownStore((s) => s.shouldShowTimer);
    const playingId = useYouTubeStore((s) => s.room?.playingNow?.id ?? null);
    const chat = useRoomChat();
    const { now, upcoming } = useRoomLineup();
    const open = useStageRailStore((s) => s.open);
    const tPage = useScopedI18n('youtubePage');
    const locale = useCurrentLocale();
    const roomId = useYouTubeStore((s) => s.room?.id ?? null);
    const roomPassword = useYouTubeStore((s) => s.room?.password);
    const showQr = useYouTubeStore((s) => s.room?.showQRInPlayer ?? true);

    const [chatUntil, setChatUntil] = useState(0);
    const [cheerUntil, setCheerUntil] = useState(0);
    const [, setTick] = useState(0);
    const [floating, setFloating] = useState<Floating[]>([]);

    // A new chat line (not the history loaded on join) opens the panel for a while.
    const lastChatId = chat.at(-1)?.id ?? null;
    const seenChat = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (seenChat.current === undefined) {
            seenChat.current = lastChatId;
            return;
        }
        if (lastChatId && lastChatId !== seenChat.current) setChatUntil(Date.now() + CHAT_OPEN_MS);
        seenChat.current = lastChatId;
    }, [lastChatId]);

    const onCheer = useCallback((reaction: ReactionEvent) => {
        setCheerUntil(Date.now() + CHEER_OPEN_MS);
        const item: Floating = {
            key: reaction.id,
            emoji: reaction.emoji,
            name: reaction.from.name,
            color: reaction.from.color,
            left: 8 + Math.random() * 70,
            drift: Math.round((Math.random() - 0.5) * 80),
        };
        setFloating((list) => [...list.slice(-(MAX_FLOATING - 1)), item]);
        setTimeout(() => setFloating((list) => list.filter((e) => e.key !== item.key)), FLOAT_MS);
    }, []);
    useReactionEvents(onCheer);

    // Re-check when the chat / cheer windows run out.
    useEffect(() => {
        const until = Math.max(chatUntil, cheerUntil) - Date.now();
        if (until <= 0) return;
        const timer = setTimeout(() => setTick((n) => n + 1), until + 50);
        return () => clearTimeout(timer);
    }, [chatUntil, cheerUntil]);

    const intermission = busy || Boolean(caption) || (ended && Boolean(playingId));
    const wantOpen = intermission || Date.now() < chatUntil || Date.now() < cheerUntil;

    useEffect(() => {
        useStageRailStore.getState().setOpen(wantOpen);
        document.documentElement.style.setProperty(
            '--ahk-stage-rail',
            wantOpen ? `${STAGE_RAIL_FRACTION * 100}vw` : '0px',
        );
    }, [wantOpen]);
    useEffect(
        () => () => {
            useStageRailStore.getState().setOpen(false);
            document.documentElement.style.removeProperty('--ahk-stage-rail');
        },
        [],
    );

    const lines = chat.slice(-CHAT_ON_TV);
    const next = upcoming.slice(0, UP_NEXT);

    return (
        <aside
            className={cn(
                'ahk-stage-rail pointer-events-none absolute inset-y-0 right-0 z-[45] flex flex-col gap-4 overflow-hidden border-l border-white/10 bg-[#0b0a12] px-5 py-6 text-white',
                open ? 'ahk-stage-rail--open' : 'ahk-stage-rail--closed',
            )}
            style={{ width: `${STAGE_RAIL_FRACTION * 100}vw` }}
            aria-hidden={!open}
            aria-label={t('title')}
        >
            {roomId && showQr ? (
                <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-xl bg-white p-1">
                        <QRCode
                            value={generateShareableUrl({
                                roomId,
                                password: resolveRoomPasswordForShare(roomPassword ?? undefined),
                                locale,
                            })}
                            size={92}
                            qrStyle="dots"
                            eyeRadius={5}
                            quietZone={2}
                            ecLevel="M"
                            bgColor="#ffffff"
                            fgColor="#0a0a0a"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                            {tPage('tvRoomCode')}
                        </p>
                        <p className="font-mono text-3xl font-bold tabular-nums tracking-widest">
                            {roomId}
                        </p>
                    </div>
                </div>
            ) : null}

            {caption ? (
                <p
                    role="status"
                    aria-label="Announcer"
                    className="ahk-enter flex items-start gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-[min(3.2vh,1.75rem)] font-semibold leading-tight shadow-[var(--ahk-glow-primary)]"
                >
                    <Mic className="mt-1 h-[1em] w-[1em] shrink-0 text-primary" aria-hidden />
                    <span>{caption}</span>
                </p>
            ) : null}

            {now?.singer ? (
                <section className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {t('singingNow')}
                    </p>
                    <SingerChip singer={now.singer} size="lg" className="max-w-full" />
                </section>
            ) : null}

            <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {t('upNext')}
                </p>
                {next.length === 0 ? (
                    <p className="text-base text-white/60">{t('nobodyNext')}</p>
                ) : (
                    <ol className="space-y-2">
                        {next.map((entry) => (
                            <li
                                key={`${entry.video.id}-${entry.position}`}
                                className="min-w-0 space-y-1"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="w-5 shrink-0 text-right text-base tabular-nums text-white/50">
                                        {entry.position}
                                    </span>
                                    <SingerChip
                                        singer={entry.singer ?? { ...HOUSE, stageName: t('house') }}
                                        size="md"
                                        className="max-w-full px-3 text-base"
                                    />
                                </div>
                                <p className="truncate pl-7 text-sm text-white/80">
                                    {entry.video.title}
                                </p>
                            </li>
                        ))}
                    </ol>
                )}
                {upcoming.length > next.length ? (
                    <p className="pl-7 text-xs text-white/50">
                        {t('more', { count: upcoming.length - next.length })}
                    </p>
                ) : null}
            </section>

            {/* Cheers rise inside the panel. */}
            <div className="relative min-h-0 flex-1" aria-hidden>
                {floating.map((item) => (
                    <div
                        key={item.key}
                        className="ahk-float-emoji absolute bottom-0 flex flex-col items-center"
                        style={
                            {
                                left: `${item.left}%`,
                                '--ahk-drift': `${item.drift}px`,
                            } as React.CSSProperties
                        }
                    >
                        <span className="text-[min(7vh,3.5rem)] leading-none">{item.emoji}</span>
                        <span
                            className="mt-0.5 max-w-[9rem] truncate text-xs font-medium"
                            style={{ color: item.color }}
                        >
                            {item.name}
                        </span>
                    </div>
                ))}
            </div>

            {lines.length > 0 ? (
                <ol className="space-y-1.5" aria-label="Party chat">
                    {lines.map((line) => (
                        <li
                            key={line.id}
                            className="ahk-enter rounded-2xl bg-white/[0.06] px-3 py-2 text-base leading-snug"
                        >
                            <span className="mr-1" aria-hidden>
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
            ) : null}
        </aside>
    );
}

/** Wraps the video (or idle screen) and shrinks it beside the side panel, never under it. */
export function TvStageArea({ children }: { children: React.ReactNode }) {
    const open = useStageRailStore((s) => s.open);
    return (
        <div
            className="ahk-stage-area tv-fill"
            style={{ transform: open ? `scale(${1 - STAGE_RAIL_FRACTION})` : 'none' }}
        >
            {children}
        </div>
    );
}
