'use client';

import { useRoomLineup } from '@/hooks/use-room-lineup';
import { useScopedI18n } from '@/locales/client';

import { SingerChip } from './singer-chip';

const TV_UP_NEXT = 3;
const HOUSE = { emoji: '🏠', color: '#9CA3AF' };

/** Big screen: who is singing now and the next few in line, readable from the room. */
export function TvSingerBadge() {
    const t = useScopedI18n('lineup');
    const { now, upcoming } = useRoomLineup();
    const anySinger = Boolean(now?.singer) || upcoming.some((entry) => entry.singer);
    if (!now || !anySinger) return null;
    const next = upcoming.slice(0, TV_UP_NEXT);

    return (
        <div
            className="pointer-events-none absolute bottom-6 right-6 z-20 flex w-[min(36rem,46vw)] flex-col items-end gap-2"
            aria-label={t('title')}
        >
            {now.singer ? (
                <SingerChip
                    singer={now.singer}
                    size="lg"
                    suffix={t('tvSinging')}
                    className="bg-black/75 shadow-lg backdrop-blur"
                />
            ) : null}
            {next.length > 0 ? (
                <div className="w-full rounded-2xl bg-black/75 px-5 py-4 text-white shadow-lg backdrop-blur">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/60">
                        {t('upNext')}
                    </p>
                    <ol className="space-y-2">
                        {next.map((entry) => (
                            <li
                                key={`${entry.video.id}-${entry.position}`}
                                className="flex min-w-0 items-center gap-2"
                            >
                                <span className="w-6 shrink-0 text-right text-lg tabular-nums text-white/50">
                                    {entry.position}
                                </span>
                                <SingerChip
                                    singer={entry.singer ?? { ...HOUSE, stageName: t('house') }}
                                    size="md"
                                    className="shrink-0 px-3 text-base"
                                />
                                <span className="min-w-0 truncate text-lg text-white/90">
                                    {entry.video.title}
                                </span>
                            </li>
                        ))}
                    </ol>
                    {upcoming.length > next.length ? (
                        <p className="mt-2 text-sm text-white/50">
                            {t('more', { count: upcoming.length - next.length })}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
