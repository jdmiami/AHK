'use client';

import { Star } from 'lucide-react';
import type { YouTubeVideo } from '@vkara/youtube';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { useProfileDataStore } from '@/store/profileStore';
import { useSingerStore } from '@/store/singerStore';

/** Save a song to "My songs". Only shown while logged in to a profile. */
export function FavoriteStar({ video, className }: { video: YouTubeVideo; className?: string }) {
    const t = useScopedI18n('profile');
    const loggedIn = useSingerStore((s) => Boolean(s.profile));
    const on = useProfileDataStore((s) =>
        Boolean(s.data?.favorites.some((f) => f.videoId === video.id)),
    );
    const ready = useProfileDataStore((s) => Boolean(s.data));
    if (!loggedIn || !ready) return null;
    return (
        <button
            type="button"
            onClick={() => void useProfileDataStore.getState().toggleFavorite(video)}
            className={cn(
                'ahk-press inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium',
                on
                    ? 'border-amber-400/60 bg-amber-400/10 text-amber-500'
                    : 'border-border/80 text-muted-foreground',
                className,
            )}
            aria-pressed={on}
            aria-label={on ? t('unfavorite') : t('favorite')}
        >
            <Star className={cn('h-3.5 w-3.5', on && 'fill-current')} aria-hidden />
            {on ? t('saved') : t('save')}
        </button>
    );
}
