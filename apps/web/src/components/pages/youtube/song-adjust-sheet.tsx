'use client';

import { useState } from 'react';
import { Gauge, Laptop, Loader2, Minus, Music2, Plus, RotateCcw } from 'lucide-react';

import {
    effectiveSongAdjust,
    KEY_MAX,
    KEY_MIN,
    TEMPO_MAX,
    TEMPO_MIN,
    TEMPO_STEP,
} from '@vkara/room';
import { getVideoThumbnailUrl } from '@vkara/tiktok';
import type { YouTubeVideo } from '@vkara/youtube';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { VideoListThumbnail } from '@/components/pages/youtube/video-list-thumbnail';
import { usePlayerAction } from '@/hooks/use-player-action';
import {
    KEY_VERSION_KINDS,
    keyVersionQuery,
    rankKeyVersions,
    type KeyVersionKind,
} from '@/lib/key-versions';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { checkEmbeddableStatus, searchYoutube } from '@/services/youtube-api';
import { useYouTubeStore } from '@/store/youtubeStore';

export function formatTempo(rate: number): string {
    return `${rate.toFixed(2)}×`;
}

export function formatSemitones(semitones: number): string {
    if (semitones === 0) return '0';
    return semitones > 0 ? `+${semitones}` : `−${Math.abs(semitones)}`;
}

/** Two chips under the transport controls; tapping either opens the tempo & key sheet. */
export function SongAdjustChips({
    className,
    extra,
}: {
    className?: string;
    extra?: React.ReactNode;
}) {
    const t = useScopedI18n('songAdjust');
    const [open, setOpen] = useState(false);
    // Select primitives: an object selector would re-render forever once values change.
    const rate = useYouTubeStore((s) => effectiveSongAdjust(s.room).rate);
    const semitones = useYouTubeStore((s) => effectiveSongAdjust(s.room).semitones);
    const changed = rate !== 1 || semitones !== 0;

    return (
        <>
            <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                        'ahk-press inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                        rate !== 1
                            ? 'border-primary/60 bg-primary/10 text-primary'
                            : 'border-border/80 text-muted-foreground',
                    )}
                    aria-label={t('openTempo')}
                >
                    <Gauge className="h-3.5 w-3.5" aria-hidden />
                    {t('tempo')} {formatTempo(rate)}
                </button>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={cn(
                        'ahk-press inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                        semitones !== 0
                            ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan'
                            : 'border-border/80 text-muted-foreground',
                    )}
                    aria-label={t('openKey')}
                >
                    <Music2 className="h-3.5 w-3.5" aria-hidden />
                    {t('key')} {formatSemitones(semitones)}
                </button>
                {extra}
                {changed ? <span className="sr-only">{t('resetsNote')}</span> : null}
            </div>
            <SongAdjustSheet open={open} onOpenChange={setOpen} />
        </>
    );
}

function SongAdjustSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useScopedI18n('songAdjust');
    const { handleSongAdjust } = usePlayerAction();
    // Select primitives: an object selector would re-render forever once values change.
    const rate = useYouTubeStore((s) => effectiveSongAdjust(s.room).rate);
    const semitones = useYouTubeStore((s) => effectiveSongAdjust(s.room).semitones);
    const keyEngineActive = useYouTubeStore((s) => Boolean(s.room?.keyEngineActive));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'bottom-0 top-auto max-h-[88dvh] max-w-lg translate-y-0 gap-0 overflow-y-auto rounded-t-3xl border-x-0 border-b-0 p-0 pb-safe-offset sm:bottom-4 sm:rounded-3xl sm:border',
                    'data-[state=closed]:slide-out-to-top-[100%] data-[state=open]:slide-in-from-top-[100%]',
                )}
            >
                <div className="space-y-6 px-5 pb-5 pt-6">
                    <div className="space-y-1 pr-8">
                        <DialogTitle className="text-lg">{t('title')}</DialogTitle>
                        <DialogDescription>{t('resetsNote')}</DialogDescription>
                    </div>

                    {/* Tempo */}
                    <section className="space-y-3" aria-labelledby="ahk-tempo-label">
                        <div className="flex items-center justify-between">
                            <h3
                                id="ahk-tempo-label"
                                className="flex items-center gap-2 text-sm font-semibold"
                            >
                                <Gauge className="h-4 w-4 text-primary" aria-hidden />
                                {t('tempo')}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm tabular-nums text-primary">
                                    {formatTempo(rate)}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    disabled={rate === 1}
                                    onClick={() => void handleSongAdjust({ rate: 1 })}
                                    aria-label={t('resetTempo')}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Slider
                            min={TEMPO_MIN}
                            max={TEMPO_MAX}
                            step={TEMPO_STEP}
                            value={[rate]}
                            onValueChange={([value]) => {
                                if (value !== undefined) void handleSongAdjust({ rate: value });
                            }}
                            aria-label={t('tempo')}
                            className="py-2"
                        />
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{t('slower')}</span>
                            <span>{t('normal')}</span>
                            <span>{t('faster')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('tempoHint')}</p>
                    </section>

                    {/* Key */}
                    <section className="space-y-3" aria-labelledby="ahk-key-label">
                        <h3
                            id="ahk-key-label"
                            className="flex items-center gap-2 text-sm font-semibold"
                        >
                            <Music2 className="h-4 w-4 text-neon-cyan" aria-hidden />
                            {t('key')}
                        </h3>
                        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card/60 p-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-xl"
                                disabled={semitones <= KEY_MIN}
                                onClick={() => void handleSongAdjust({ semitones: semitones - 1 })}
                                aria-label={t('keyDown')}
                            >
                                <Minus className="h-5 w-5" />
                            </Button>
                            <div className="text-center" aria-live="polite">
                                <p className="font-mono text-2xl font-semibold tabular-nums">
                                    {formatSemitones(semitones)}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {semitones === 0 ? t('originalKey') : t('semitones')}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-xl"
                                disabled={semitones >= KEY_MAX}
                                onClick={() => void handleSongAdjust({ semitones: semitones + 1 })}
                                aria-label={t('keyUp')}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                        <p
                            className={cn(
                                'flex items-start gap-2 text-xs',
                                keyEngineActive ? 'text-neon-cyan' : 'text-muted-foreground',
                            )}
                        >
                            <Laptop className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            {keyEngineActive ? t('engineOn') : t('engineOff')}
                        </p>
                    </section>

                    <KeyVersionFinder onPicked={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

type FinderState =
    | { status: 'idle' }
    | { status: 'loading'; kind: KeyVersionKind }
    | { status: 'done'; kind: KeyVersionKind; items: YouTubeVideo[] }
    | { status: 'error'; kind: KeyVersionKind };

/** Finds the same song uploaded in another key and swaps it in (no audio processing). */
function KeyVersionFinder({ onPicked }: { onPicked: () => void }) {
    const t = useScopedI18n('songAdjust');
    const playing = useYouTubeStore((s) => s.room?.playingNow ?? null);
    const { handlePlayVideoNow } = usePlayerAction();
    const [state, setState] = useState<FinderState>({ status: 'idle' });

    if (!playing) return null;

    const find = async (kind: KeyVersionKind) => {
        setState({ status: 'loading', kind });
        try {
            const { items } = await searchYoutube({
                query: keyVersionQuery(playing.title, kind),
                isKaraoke: false,
            });
            const candidates = rankKeyVersions(items, playing.id, 12);
            // Many karaoke channels block playback on other sites; only offer playable ones.
            const playable = await checkEmbeddableStatus(candidates.map((v) => v.id))
                .then((rows) => {
                    const ok = new Set(rows.filter((r) => r.canEmbed).map((r) => r.videoId));
                    return candidates.filter((v) => ok.has(v.id));
                })
                .catch(() => candidates);
            setState({ status: 'done', kind, items: playable.slice(0, 6) });
        } catch {
            setState({ status: 'error', kind });
        }
    };

    const activeKind = state.status === 'idle' ? null : state.kind;

    return (
        <section className="space-y-3 border-t pt-5" aria-labelledby="ahk-key-versions">
            <div className="space-y-1">
                <h3 id="ahk-key-versions" className="text-sm font-semibold">
                    {t('findTitle')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('findHint')}</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {KEY_VERSION_KINDS.map((kind) => (
                    <Button
                        key={kind}
                        type="button"
                        variant={activeKind === kind ? 'default' : 'outline'}
                        size="sm"
                        className="h-10 rounded-xl px-1 text-xs"
                        onClick={() => void find(kind)}
                    >
                        {t(`kind.${kind}`)}
                    </Button>
                ))}
            </div>

            {state.status === 'loading' ? (
                <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t('searching')}
                </p>
            ) : null}
            {state.status === 'error' ? (
                <p className="py-3 text-sm text-destructive">{t('searchError')}</p>
            ) : null}
            {state.status === 'done' && state.items.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">{t('noResults')}</p>
            ) : null}
            {state.status === 'done' && state.items.length > 0 ? (
                <ul className="space-y-1">
                    {state.items.map((video) => (
                        <li key={video.id}>
                            <button
                                type="button"
                                onClick={async () => {
                                    // Close only after the request is sent: closing unmounts
                                    // this component while play-now waits for the room session.
                                    await handlePlayVideoNow(video);
                                    onPicked();
                                }}
                                className="ahk-reveal flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-accent/50 active:bg-accent/70"
                            >
                                <VideoListThumbnail
                                    src={getVideoThumbnailUrl({ video, size: 'list' })}
                                    videoId={video.id}
                                    className="w-24 shrink-0"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 text-sm font-medium leading-snug">
                                        {video.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                        {video.channels?.[0]?.name ?? ''}
                                    </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                    {t('swap')}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
