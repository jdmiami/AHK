'use client';

import { useEffect, useState } from 'react';
import { Plus, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePlayerAction } from '@/hooks/use-player-action';
import {
    BADGE_EMOJI,
    BADGE_IDS,
    formatStageTime,
    songToVideo,
    type ProfileSong,
} from '@/lib/profile-api';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { useProfileDataStore } from '@/store/profileStore';

type Tab = 'favorites' | 'history';

/** A saved singer's stats, badges, favorite songs and recent history. */
export function ProfileSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useScopedI18n('profile');
    const data = useProfileDataStore((s) => s.data);
    const loading = useProfileDataStore((s) => s.loading);
    const [tab, setTab] = useState<Tab>('favorites');

    useEffect(() => {
        if (open) void useProfileDataStore.getState().refresh();
    }, [open]);

    const earned = new Set(data?.badges ?? []);
    const stats = data?.stats;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                overlayClassName="z-[80]"
                className="bottom-0 top-auto z-[80] max-h-[90dvh] max-w-lg overflow-x-hidden [&>*]:min-w-0 translate-y-0 gap-4 overflow-y-auto rounded-t-3xl p-5 pb-safe-offset sm:bottom-4 sm:rounded-3xl"
            >
                <div className="flex items-center gap-3 pr-8">
                    <span
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                        style={{ backgroundColor: `${data?.profile.color ?? '#FF2DAA'}26` }}
                    >
                        {data?.profile.emoji ?? '🎤'}
                    </span>
                    <div className="min-w-0">
                        <DialogTitle
                            className="truncate"
                            style={{ color: data?.profile.color ?? undefined }}
                        >
                            {data?.profile.stageName ?? '…'}
                        </DialogTitle>
                        <DialogDescription>
                            {data
                                ? t('since', {
                                      date: new Date(data.profile.createdAt).toLocaleDateString(),
                                  })
                                : loading
                                  ? t('loading')
                                  : t('loadFailed')}
                        </DialogDescription>
                    </div>
                </div>

                {stats ? (
                    <div className="grid grid-cols-3 gap-2">
                        <StatTile value={stats.songs} label={t('statSongs')} />
                        <StatTile value={stats.nights} label={t('statNights')} />
                        <StatTile value={stats.artists} label={t('statArtists')} />
                        <StatTile
                            value={formatStageTime(stats.secondsOnStage)}
                            label={t('statTime')}
                        />
                        <StatTile value={stats.bestNight} label={t('statBestNight')} />
                        <StatTile value={earned.size} label={t('statBadges')} />
                    </div>
                ) : null}

                <section className="space-y-2">
                    <h3 className="text-sm font-semibold">{t('badges')}</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {BADGE_IDS.map((id) => (
                            <div
                                key={id}
                                className={cn(
                                    'flex flex-col items-center gap-1 rounded-xl border p-2 text-center',
                                    earned.has(id)
                                        ? 'border-primary/40 bg-primary/10'
                                        : 'border-border opacity-40 grayscale',
                                )}
                                title={t(`badge.${id}.hint`)}
                            >
                                <span className="text-2xl" aria-hidden>
                                    {BADGE_EMOJI[id]}
                                </span>
                                <span className="text-[10px] font-medium leading-tight">
                                    {t(`badge.${id}.name`)}
                                </span>
                                <span className="sr-only">
                                    {earned.has(id) ? t('earned') : t('locked')}:{' '}
                                    {t(`badge.${id}.hint`)}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {stats && stats.topArtists.length > 0 ? (
                    <section className="space-y-2">
                        <h3 className="text-sm font-semibold">{t('topArtists')}</h3>
                        <ol className="space-y-1 text-sm">
                            {stats.topArtists.map((artist, index) => (
                                <li key={artist.name} className="flex justify-between gap-2">
                                    <span className="truncate">
                                        {index + 1}. {artist.name}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">
                                        {t('songCount', { count: artist.songs })}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                ) : null}

                <section className="space-y-2">
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
                        {(['favorites', 'history'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                role="tab"
                                aria-selected={tab === option}
                                onClick={() => setTab(option)}
                                className={cn(
                                    'ahk-press h-8 rounded-lg text-xs font-medium',
                                    tab === option
                                        ? 'bg-background shadow-sm'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {option === 'favorites' ? t('mySongs') : t('history')}
                            </button>
                        ))}
                    </div>
                    <SongList
                        songs={(tab === 'favorites' ? data?.favorites : data?.history) ?? []}
                        empty={tab === 'favorites' ? t('mySongsEmpty') : t('historyEmpty')}
                    />
                </section>
            </DialogContent>
        </Dialog>
    );
}

function StatTile({ value, label }: { value: number | string; label: string }) {
    return (
        <div className="rounded-xl border bg-card/60 p-2 text-center">
            <p className="text-lg font-bold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
    );
}

function SongList({ songs, empty }: { songs: ProfileSong[]; empty: string }) {
    const t = useScopedI18n('profile');
    const { handleAddVideoToQueue } = usePlayerAction();
    const favorites = useProfileDataStore((s) => s.data?.favorites ?? []);
    const [added, setAdded] = useState<string | null>(null);

    if (songs.length === 0)
        return <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>;

    return (
        <ul className="space-y-2">
            {songs.map((song, index) => {
                const starred = favorites.some((f) => f.videoId === song.videoId);
                return (
                    <li
                        key={`${song.videoId}-${song.sungAt ?? index}`}
                        className="flex items-center gap-2"
                    >
                        {song.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={song.thumbnail}
                                alt=""
                                className="h-10 w-16 shrink-0 rounded-md object-cover"
                                loading="lazy"
                            />
                        ) : null}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{song.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {song.channel ?? ''}
                                {song.sungAt
                                    ? ` · ${new Date(song.sungAt).toLocaleDateString()}`
                                    : ''}
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0"
                            aria-pressed={starred}
                            aria-label={starred ? t('unfavorite') : t('favorite')}
                            onClick={() =>
                                void useProfileDataStore
                                    .getState()
                                    .toggleFavorite(songToVideo(song))
                            }
                        >
                            <Star
                                className={cn(
                                    'h-4 w-4',
                                    starred && 'fill-amber-400 text-amber-400',
                                )}
                            />
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 shrink-0"
                            onClick={() => {
                                handleAddVideoToQueue(songToVideo(song));
                                setAdded(song.videoId);
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            {added === song.videoId ? t('added') : t('add')}
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}
