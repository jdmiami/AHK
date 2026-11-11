'use client';

import { SingerChip } from '@/components/singer/singer-chip';
import { useYouTubeStore } from '@/store/youtubeStore';
import { memo, type ReactNode } from 'react';
import { VideoChannels } from '@/components/video-channels';
import { LiveBadge } from '@/components/youtube-live-badge';
import { coerceViewCount, formatViewCount } from '@vkara/youtube';
import { getVideoThumbnailUrl, isTikTokVideo, isVideoLive } from '@vkara/tiktok';
import { formatUploadedAt } from '@/lib/format-uploaded-at';
import { cn } from '@/lib/utils';
import { useI18n } from '@/locales/client';
import type { YouTubeVideo } from '@vkara/youtube';

import { VideoListThumbnail } from './video-list-thumbnail';
import {
    VIDEO_LIST_ROW_HEIGHT,
    VIDEO_LIST_ROW_GAP,
    VIDEO_LIST_ROW_STRIDE,
} from '@/lib/video-list-layout';

export { VIDEO_LIST_ROW_HEIGHT, VIDEO_LIST_ROW_GAP, VIDEO_LIST_ROW_STRIDE };
/** Action chips row when a video is selected. */
export const VIDEO_LIST_ROW_ACTIONS_HEIGHT = 52;

export function getVideoListRowHeight(hasActions: boolean): number {
    return hasActions
        ? VIDEO_LIST_ROW_HEIGHT + VIDEO_LIST_ROW_ACTIONS_HEIGHT
        : VIDEO_LIST_ROW_HEIGHT;
}

interface VideoListItemProps {
    video: YouTubeVideo;
    viewsLabel: string;
    /** Place in the shared queue (1 = up next). */
    position?: number;
    isActive?: boolean;
    actions?: ReactNode;
    onSelect?: (video: YouTubeVideo) => void;
}

export const VideoListItem = memo(function VideoListItem({
    video,
    viewsLabel,
    position,
    isActive = false,
    actions,
    onSelect,
}: VideoListItemProps) {
    const singer = useYouTubeStore((s) =>
        video.singerId ? (s.room?.singers?.[video.singerId] ?? null) : null,
    );
    const t = useI18n();
    const uploadedAtLabel = video.uploadedAt ? formatUploadedAt(video.uploadedAt, t) : '';
    const views = coerceViewCount(video.views);
    const isLive = isVideoLive({ video });
    const isTikTok = isTikTokVideo(video);
    const thumbnailSrc = getVideoThumbnailUrl({ video, size: 'list' }) || null;

    const metadataLine = (() => {
        if (isLive) {
            if (views > 0) {
                return `${formatViewCount(views)} ${t('youtubePage.watching')}`;
            }
            return t('youtubePage.liveNow');
        }

        if (views > 0 && uploadedAtLabel) {
            return `${formatViewCount(views)} ${viewsLabel} • ${uploadedAtLabel}`;
        }
        if (views > 0) {
            return `${formatViewCount(views)} ${viewsLabel}`;
        }
        if (uploadedAtLabel) {
            return uploadedAtLabel;
        }
        return null;
    })();

    return (
        <div
            className={cn(
                'ahk-reveal w-full overflow-hidden rounded-lg text-left text-sm transition-colors',
                isActive && 'bg-primary/10 dark:bg-primary/15',
            )}
        >
            <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(video)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect?.(video);
                    }
                }}
                className={cn(
                    'flex h-[100px] w-full cursor-pointer items-start gap-3 py-2',
                    !isActive && 'hover:bg-accent/50 active:bg-accent/60',
                )}
            >
                <VideoListThumbnail
                    src={thumbnailSrc}
                    videoId={isTikTok ? undefined : video.id}
                    overlay={
                        isLive ? (
                            <div className="absolute bottom-1 right-1">
                                <LiveBadge />
                            </div>
                        ) : video.duration_formatted ? (
                            <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-xs text-white">
                                {video.duration_formatted}
                            </div>
                        ) : null
                    }
                />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
                    <div className="line-clamp-2 break-words text-sm font-medium leading-snug">
                        {position ? (
                            <span
                                className={cn(
                                    'mr-1.5 inline-flex min-w-6 items-center justify-center rounded-md px-1 text-[11px] font-semibold tabular-nums',
                                    position === 1
                                        ? 'bg-primary/15 text-primary'
                                        : 'bg-muted text-muted-foreground',
                                )}
                                aria-label={`#${position}`}
                            >
                                {position}
                            </span>
                        ) : null}
                        {video.title}
                    </div>
                    {singer ? (
                        <SingerChip singer={singer} className="self-start" />
                    ) : (
                        <VideoChannels video={video} tone="muted" maxLines={2} />
                    )}
                    {metadataLine ? (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                            {metadataLine}
                        </div>
                    ) : null}
                </div>
            </div>
            {actions ? (
                <div
                    className="pb-2 pt-1.5"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                >
                    {actions}
                </div>
            ) : null}
        </div>
    );
});
