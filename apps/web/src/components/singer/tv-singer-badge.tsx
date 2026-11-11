'use client';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useScopedI18n } from '@/locales/client';

import { SingerChip } from './singer-chip';

/** Big screen: who is singing now and who is up next. */
export function TvSingerBadge() {
    const t = useScopedI18n('singer');
    const playing = useYouTubeStore((s) => s.room?.playingNow ?? null);
    const queue = useYouTubeStore((s) => s.room?.videoQueue);
    const singers = useYouTubeStore((s) => s.room?.singers);
    if (!playing || !singers) return null;
    const now = playing.singerId ? singers[playing.singerId] : null;
    const nextSong = queue?.find((video) => video.singerId && singers[video.singerId]);
    const next = nextSong?.singerId ? singers[nextSong.singerId] : null;
    if (!now && !next) return null;
    return (
        <div className="pointer-events-none absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
            {now ? (
                <SingerChip
                    singer={now}
                    size="lg"
                    suffix={t('tvSinging')}
                    className="bg-black/70 shadow-lg backdrop-blur"
                />
            ) : null}
            {next && next.deviceId !== now?.deviceId ? (
                <SingerChip
                    singer={next}
                    size="md"
                    suffix={t('tvNext')}
                    className="bg-black/70 backdrop-blur"
                />
            ) : null}
        </div>
    );
}
