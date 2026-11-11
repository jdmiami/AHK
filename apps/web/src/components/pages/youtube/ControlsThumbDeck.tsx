'use client';

import { SingerChip } from '@/components/singer/singer-chip';
import { useMySinger } from '@/hooks/use-singer';
import { usePlaybackDisplayTime } from '@/hooks/use-playback-display-time';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';
import { isTikTokPhotoPost, isTikTokVideo, isVideoLive } from '@vkara/tiktok';
import { useScopedI18n } from '@/locales/client';

import { PlaybackScrubber } from '@/components/pages/youtube/PlaybackScrubber';
import { PlayerControls } from '@/components/pages/youtube/PlayerControls';
import { SongAdjustChips } from '@/components/pages/youtube/song-adjust-sheet';
import { FavoriteStar } from '@/components/singer/favorite-star';
import { useRoomLineup } from '@/hooks/use-room-lineup';
import {
    TikTokPhotoNavigationBar,
    useTikTokPhotoIndex,
} from '@/components/pages/youtube/tiktok-photo-controls';
import { VideoChannels } from '@/components/video-channels';

/**
 * Bottom control dock (Spotify / YouTube Music / SoundCloud pattern):
 * metadata, scrubber, transport, and volume pinned above bottom nav.
 */
type ControlsThumbDeckProps = {
    className?: string;
    /** When false, pauses the 1s extrapolation tick (tab hidden but kept mounted). */
    tickEnabled?: boolean;
};

export function ControlsThumbDeck({ className, tickEnabled = true }: ControlsThumbDeckProps) {
    const t = useScopedI18n('youtubePage');
    const { room } = useYouTubeStore();
    const displayTime = usePlaybackDisplayTime({ enabled: tickEnabled });
    const { handleSeekToSeconds, handleTikTokPhotoNavigate } = usePlayerAction();

    const playing = room?.playingNow;
    const tSinger = useScopedI18n('singer');
    const { canControl, singerFor } = useMySinger();
    const singingNow = singerFor(playing?.singerId);
    const tLineup = useScopedI18n('lineup');
    const upNext = useRoomLineup().upcoming[0] ?? null;
    const isPhotoPost = playing ? isTikTokPhotoPost({ video: playing }) : false;
    const { index: photoIndex, maxIndex: photoMaxIndex } = useTikTokPhotoIndex(isPhotoPost);

    if (!playing) {
        return null;
    }

    const isLive = isVideoLive({ video: playing });
    const duration = playing.duration ?? 0;

    return (
        <section
            className={cn(
                'shrink-0 px-1 pb-2 pt-1 short-viewport:pb-1.5 min-[400px]:px-2 min-[400px]:pb-3',
                className,
            )}
            aria-label="Playback controls"
        >
            <div className="mx-auto flex w-full max-w-md flex-col gap-3 short-viewport:gap-2.5 min-[400px]:gap-4">
                <div className="space-y-0.5 px-0.5 text-center">
                    <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug">
                        {playing.title}
                    </h2>
                    <VideoChannels
                        video={playing}
                        tone="emphasis"
                        align="center"
                        maxLines={2}
                        className="text-sm text-muted-foreground short-viewport:text-xs"
                    />
                </div>

                {isPhotoPost ? (
                    <TikTokPhotoNavigationBar
                        index={photoIndex}
                        maxIndex={photoMaxIndex}
                        prevLabel={t('tiktokPhotoPrev')}
                        nextLabel={t('tiktokPhotoNext')}
                        onNavigateAction={handleTikTokPhotoNavigate}
                    />
                ) : !isLive && duration > 0 ? (
                    <PlaybackScrubber
                        displayTime={displayTime}
                        duration={duration}
                        durationLabel={playing.duration_formatted}
                        onSeek={handleSeekToSeconds}
                    />
                ) : null}

                {singingNow || upNext?.singer ? (
                    <div className="flex flex-col items-center gap-1">
                        {singingNow ? (
                            <SingerChip
                                singer={singingNow}
                                size="md"
                                suffix={tSinger('singingSuffix')}
                            />
                        ) : null}
                        {upNext?.singer ? (
                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                {tLineup('upNext')}
                                <SingerChip singer={upNext.singer} />
                            </p>
                        ) : null}
                        {!canControl ? (
                            <p className="text-center text-[11px] text-muted-foreground">
                                {tSinger('controlsLocked')}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                <div
                    className={cn(!canControl && 'pointer-events-none opacity-50')}
                    aria-disabled={!canControl}
                >
                    <PlayerControls variant="panel" className="gap-3 p-0" />
                </div>

                {!isTikTokVideo(playing) && !isLive ? (
                    <SongAdjustChips extra={<FavoriteStar video={playing} />} />
                ) : null}
            </div>
        </section>
    );
}
