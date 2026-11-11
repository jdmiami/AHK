'use client';

import type { Singer } from '@vkara/room';

import { useMySinger } from '@/hooks/use-singer';
import { useRoomLineup } from '@/hooks/use-room-lineup';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';

import { SingerChip } from './singer-chip';

const HOUSE = { stageName: '', emoji: '🏠', color: '#9CA3AF' };
const MORE_AFTER = 6;

/** Everyone's view of the room: who is singing, who is next, the rest in order, who sat out. */
export function LineupCard({ className }: { className?: string }) {
    const t = useScopedI18n('lineup');
    const { myId } = useMySinger();
    const { now, upcoming, sittingOut } = useRoomLineup();
    if (!now && upcoming.length === 0 && sittingOut.length === 0) return null;

    const [next, ...rest] = upcoming;
    const shown = rest.slice(0, MORE_AFTER);
    const hidden = rest.length - shown.length;
    const who = (singer: Singer | null) =>
        singer
            ? {
                  ...singer,
                  stageName:
                      singer.deviceId === myId
                          ? t('you', { name: singer.stageName })
                          : singer.stageName,
              }
            : { ...HOUSE, stageName: t('house') };

    return (
        <section
            className={cn('ahk-enter space-y-2.5 rounded-2xl border bg-card/60 p-3', className)}
            aria-label={t('title')}
        >
            {now ? (
                <Row label={t('singingNow')} accent>
                    <SingerChip singer={who(now.singer)} size="md" />
                    <SongTitle title={now.video.title} />
                </Row>
            ) : null}
            {next ? (
                <Row label={t('upNext')}>
                    <SingerChip singer={who(next.singer)} size="md" />
                    <SongTitle title={next.video.title} />
                </Row>
            ) : now ? (
                <p className="text-xs text-muted-foreground">{t('nobodyNext')}</p>
            ) : null}
            {shown.length > 0 ? (
                <Row label={t('then')}>
                    <ol className="flex flex-wrap items-center gap-1.5">
                        {shown.map((entry) => (
                            <li
                                key={`${entry.video.id}-${entry.position}`}
                                className="flex items-center gap-1"
                            >
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                    {entry.position}.
                                </span>
                                <SingerChip singer={who(entry.singer)} />
                            </li>
                        ))}
                        {hidden > 0 ? (
                            <li className="text-[11px] text-muted-foreground">
                                {t('more', { count: hidden })}
                            </li>
                        ) : null}
                    </ol>
                </Row>
            ) : null}
            {sittingOut.length > 0 ? (
                <Row label={t('sittingOut')}>
                    <ul className="flex flex-wrap gap-1.5">
                        {sittingOut.map(({ singer, songs }) => (
                            <li key={singer.deviceId}>
                                <SingerChip
                                    singer={who(singer)}
                                    suffix={songs > 0 ? `· ${songs}` : undefined}
                                    className="opacity-70"
                                />
                            </li>
                        ))}
                    </ul>
                </Row>
            ) : null}
        </section>
    );
}

function Row({
    label,
    accent,
    children,
}: {
    label: string;
    accent?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1">
            <p
                className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    accent ? 'text-primary' : 'text-muted-foreground',
                )}
            >
                {label}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}

function SongTitle({ title }: { title: string }) {
    return <span className="min-w-0 flex-1 truncate text-sm">{title}</span>;
}
