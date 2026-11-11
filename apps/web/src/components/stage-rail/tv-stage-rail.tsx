'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';
import { CHAT_ON_TV, resolveRoomPasswordForShare, type ReactionEvent } from '@vkara/room';

import { SingerChip } from '@/components/singer/singer-chip';
import { useReactionEvents, useRoomChat } from '@/hooks/use-party';
import { useRoomLineup } from '@/hooks/use-room-lineup';
import { useViewportSize } from '@/hooks/use-viewport-size';
import { pointOnLoop, RACE, standings, stepRace, tapRacer, type Racer } from '@/lib/cheer-race';
import { generateShareableUrl } from '@/lib/room-share';
import { stageLayout, STAGE_RAIL_FRACTION } from '@/lib/stage-layout';
import { cn } from '@/lib/utils';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { useCheerRaceStore, type RaceStanding } from '@/store/cheerRaceStore';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useStageRailStore } from '@/store/stageRailStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const CHAT_OPEN_MS = 15_000;
const UP_NEXT = 3;
const HOUSE = { emoji: '🏠', color: '#9CA3AF' };

const toStanding = (r: Racer): RaceStanding => ({
    id: r.id,
    name: r.name,
    color: r.color,
    emoji: r.emoji,
    progress: r.progress,
    combo: r.combo,
});

/** The video (or idle screen), placed in the largest box left free by the panel and track. */
export function TvStageArea({ children }: { children: React.ReactNode }) {
    const open = useStageRailStore((s) => s.open);
    const raceOn = useStageRailStore((s) => s.raceOn);
    const { width, height } = useViewportSize();
    const { video, scale } = stageLayout(width, height, open, raceOn);
    const moved = open || raceOn;
    useEffect(() => {
        const root = document.documentElement.style;
        root.setProperty('--ahk-stage-x', `${moved ? video.x : 0}px`);
        root.setProperty('--ahk-stage-y', `${moved ? video.y : 0}px`);
        root.setProperty('--ahk-stage-w', moved ? `${video.w}px` : '100%');
        root.setProperty('--ahk-stage-h', moved ? `${video.h}px` : '100%');
    }, [moved, video.x, video.y, video.w, video.h]);
    return (
        <div
            className="ahk-stage-area tv-fill"
            style={{
                transform: moved
                    ? `translate3d(${video.x}px, ${video.y}px, 0) scale(${scale})`
                    : 'none',
            }}
        >
            {children}
        </div>
    );
}

/**
 * Cheer race on the big screen: cheers from phones push each person's emoji around a road
 * that frames the video. Same emoji again and again = combo = faster. First lap wins.
 * The road only appears while a race is on; the video shrinks inside it, nothing on top.
 */
export function TvCheerRace() {
    const raceOn = useStageRailStore((s) => s.raceOn);
    const open = useStageRailStore((s) => s.open);
    const { width, height } = useViewportSize();
    const racers = useRef(new Map<string, Racer>());
    const nodes = useRef(new Map<string, HTMLDivElement>());
    const [ids, setIds] = useState<string[]>([]);
    /** Set from the finish until the next race starts: the track stays, nothing moves. */
    const finished = useRef(false);
    const layout = stageLayout(width, height, open, true);
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    const sync = useCallback(() => {
        const next = [...racers.current.keys()];
        setIds((prev) => (prev.join() === next.join() ? prev : next));
        useCheerRaceStore.getState().set({ standings: standings(racers.current).map(toStanding) });
        useStageRailStore.getState().setRaceOn(racers.current.size > 0 || finished.current);
    }, []);

    const onCheer = useCallback(
        (reaction: ReactionEvent) => {
            if (finished.current) return; // victory moment: the next race starts after it
            tapRacer(racers.current, reaction, Date.now());
            sync();
        },
        [sync],
    );
    useReactionEvents(onCheer);

    // Animation loop: move racers along the track, check for a winner.
    useEffect(() => {
        let frame = 0;
        let last = performance.now();
        let lastSync = 0;
        const tick = (nowPerf: number) => {
            const dt = Math.min(0.1, (nowPerf - last) / 1000);
            last = nowPerf;
            const now = Date.now();
            const before = racers.current.size;
            const winner = finished.current ? null : stepRace(racers.current, dt, now);
            if (winner) {
                finished.current = true;
                useCheerRaceStore.getState().set({ winner: toStanding(winner) });
                setTimeout(() => {
                    racers.current.clear();
                    finished.current = false;
                    useCheerRaceStore.getState().set({ winner: null, standings: [] });
                    sync();
                }, RACE.winHoldMs);
            }
            const { track } = layoutRef.current;
            for (const racer of racers.current.values()) {
                const node = nodes.current.get(racer.id);
                if (!node) continue;
                const p = pointOnLoop(track, racer.progress);
                node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`;
            }
            if (racers.current.size !== before || nowPerf - lastSync > 250) {
                lastSync = nowPerf;
                sync();
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [sync]);

    useEffect(
        () => () => {
            useStageRailStore.getState().setRaceOn(false);
            useCheerRaceStore.getState().set({ standings: [], winner: null });
        },
        [],
    );

    // Test hook (`?ahk-debug=1`): read the race state.
    useEffect(() => {
        if (!new URLSearchParams(window.location.search).has('ahk-debug')) return;
        (window as unknown as { __ahkRace?: object }).__ahkRace = {
            racers: () => standings(racers.current).map(toStanding),
            layout: () => layoutRef.current,
            raceOn: () => useStageRailStore.getState().raceOn,
            winner: () => useCheerRaceStore.getState().winner,
        };
    }, []);

    const { track, band } = layout;
    const emojiSize = Math.round(band * 0.62);
    return (
        <div
            className={cn(
                'ahk-race pointer-events-none absolute inset-0 z-[44]',
                raceOn ? 'ahk-race--on' : 'ahk-race--off',
            )}
            aria-hidden
        >
            <svg className="absolute inset-0 h-full w-full" width={width} height={height}>
                <defs>
                    <pattern
                        id="ahk-checker"
                        width={band / 4}
                        height={band / 4}
                        patternUnits="userSpaceOnUse"
                    >
                        <rect width={band / 8} height={band / 8} fill="#fff" />
                        <rect
                            x={band / 8}
                            y={band / 8}
                            width={band / 8}
                            height={band / 8}
                            fill="#fff"
                        />
                    </pattern>
                </defs>
                {/* Asphalt */}
                <rect
                    x={track.x}
                    y={track.y}
                    width={track.w}
                    height={track.h}
                    rx={band * 0.12}
                    fill="none"
                    stroke="#1d1b26"
                    strokeWidth={band * 0.92}
                />
                {/* Centre line */}
                <rect
                    x={track.x}
                    y={track.y}
                    width={track.w}
                    height={track.h}
                    rx={band * 0.12}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.35}
                    strokeWidth={Math.max(2, band * 0.05)}
                    strokeDasharray={`${band * 0.5} ${band * 0.45}`}
                />
                {/* Start / finish line across the top-left of the track */}
                <rect
                    x={track.x + band * 0.7}
                    y={track.y - band * 0.46}
                    width={band / 4}
                    height={band * 0.92}
                    fill="#111"
                />
                <rect
                    x={track.x + band * 0.7}
                    y={track.y - band * 0.46}
                    width={band / 4}
                    height={band * 0.92}
                    fill="url(#ahk-checker)"
                />
            </svg>
            {ids.map((id) => {
                const racer = racers.current.get(id);
                if (!racer) return null;
                return (
                    <div
                        key={id}
                        ref={(node) => {
                            if (node) nodes.current.set(id, node);
                            else nodes.current.delete(id);
                        }}
                        className="absolute left-0 top-0 flex flex-col items-center"
                        style={{ willChange: 'transform' }}
                    >
                        <span
                            className="flex items-center justify-center rounded-full"
                            style={{
                                width: emojiSize + 8,
                                height: emojiSize + 8,
                                fontSize: emojiSize,
                                lineHeight: 1,
                                boxShadow: `0 0 0 3px ${racer.color}, 0 0 16px ${racer.color}`,
                                background: '#0b0a12',
                            }}
                        >
                            {racer.emoji}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Big screen side panel. Closed, the video has the whole screen. It opens (and the video
 * shrinks beside it) between songs, for a while after a chat message, and to show a race winner.
 */
export function TvStageRail() {
    const t = useScopedI18n('lineup');
    const tParty = useScopedI18n('party');
    const tPage = useScopedI18n('youtubePage');
    const locale = useCurrentLocale();
    const ended = useCountdownStore((s) => s.shouldShowTimer);
    const playingId = useYouTubeStore((s) => s.room?.playingNow?.id ?? null);
    const roomId = useYouTubeStore((s) => s.room?.id ?? null);
    const roomPassword = useYouTubeStore((s) => s.room?.password);
    const showQr = useYouTubeStore((s) => s.room?.showQRInPlayer ?? true);
    const chat = useRoomChat();
    const { now, upcoming } = useRoomLineup();
    const open = useStageRailStore((s) => s.open);
    const race = useCheerRaceStore((s) => s.standings);
    const winner = useCheerRaceStore((s) => s.winner);

    const [chatUntil, setChatUntil] = useState(0);
    const [, setTick] = useState(0);

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

    useEffect(() => {
        const until = chatUntil - Date.now();
        if (until <= 0) return;
        const timer = setTimeout(() => setTick((n) => n + 1), until + 50);
        return () => clearTimeout(timer);
    }, [chatUntil]);

    const intermission = ended && Boolean(playingId);
    const wantOpen = intermission || Boolean(winner) || Date.now() < chatUntil;

    useEffect(() => {
        useStageRailStore.getState().setOpen(wantOpen);
    }, [wantOpen]);
    useEffect(() => () => useStageRailStore.getState().setOpen(false), []);

    // Test hook (`?ahk-debug=1`): mark the song as ended (YouTube can't play in test browsers).
    useEffect(() => {
        if (!new URLSearchParams(window.location.search).has('ahk-debug')) return;
        (window as unknown as { __ahkStage?: object }).__ahkStage = {
            endSong: () => useCountdownStore.getState().setShouldShowTimer(true),
        };
    }, []);

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

            {winner ? (
                <section
                    role="status"
                    aria-label={tParty('raceTitle')}
                    className="ahk-enter rounded-2xl border border-amber-400/50 bg-amber-400/10 px-4 py-3"
                >
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        <Flag className="h-4 w-4" aria-hidden />
                        {tParty('raceTitle')}
                    </p>
                    <p className="mt-1 text-[min(3.4vh,1.9rem)] font-bold leading-tight">
                        <span className="mr-2">{winner.emoji}</span>
                        <span style={{ color: winner.color }}>{winner.name}</span>{' '}
                        {tParty('raceWins')}
                    </p>
                    {race.length > 1 ? (
                        <ol className="mt-2 space-y-0.5 text-sm text-white/80">
                            {race.slice(0, 3).map((r, i) => (
                                <li key={r.id} className="flex justify-between gap-2">
                                    <span className="truncate">
                                        {['🥇', '🥈', '🥉'][i]} {r.emoji} {r.name}
                                    </span>
                                    <span className="tabular-nums text-white/50">
                                        {Math.round(r.progress * 100)}%
                                    </span>
                                </li>
                            ))}
                        </ol>
                    ) : null}
                </section>
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

            <div className="min-h-0 flex-1" />

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
