'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useTvRouteBootstrap } from '@/hooks/use-tv-route-bootstrap';
import { useTvOverlayStack } from '@/hooks/use-tv-overlay-stack';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { seedTvFocus, TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';

import { TvSpatialRoot } from './tv-spatial-root';
import { TvPlayerHost } from './tv-player-host';
import { TvEmbedFocusGuard } from './tv-embed-focus-guard';
import { TvNextUpGate } from './tv-next-up-gate';

const ConnectionStatusToast = dynamic(
    () =>
        import('@/components/connection-status-toast').then((m) => ({
            default: m.ConnectionStatusToast,
        })),
    { ssr: false },
);

const TvLobby = dynamic(() => import('./tv-lobby').then((m) => ({ default: m.TvLobby })), {
    ssr: false,
});
const TvPlayerChrome = dynamic(
    () => import('./tv-player-chrome').then((m) => ({ default: m.TvPlayerChrome })),
    { ssr: false },
);
const TvSettingsPanel = dynamic(
    () => import('./tv-settings-panel').then((m) => ({ default: m.TvSettingsPanel })),
    { ssr: false },
);

export default function TvPage() {
    useTvRouteBootstrap();
    useStripRoomQueryFromUrl();
    usePlaybackPositionSync();

    const tToast = useScopedI18n('toast');
    const {
        roomId,
        playingNow,
        videoQueueLength,
        tvSuppressAutoCreate,
    } = useYouTubeStore(
        useShallow((s) => ({
            roomId: s.room?.id,
            playingNow: s.room?.playingNow,
            videoQueueLength: s.room?.videoQueue?.length ?? 0,
            tvSuppressAutoCreate: s.tvSuppressAutoCreate,
        })),
    );
    const shouldShowNextUp = useCountdownStore((s) => s.shouldShowTimer);

    const showLobby = !roomId && tvSuppressAutoCreate;
    const inRoom = Boolean(roomId) && !showLobby;
    const isPlayerActive = inRoom && Boolean(playingNow);
    const nextUpVisible = isPlayerActive && shouldShowNextUp && videoQueueLength > 0;

    const {
        controlsVisible,
        settingsOpen,
        queueExpanded,
        revealControls,
        openSettings,
        focusQueue,
        collapseQueue,
        closeSettings,
        hideControls,
    } = useTvOverlayStack({
        controlsEnabled: isPlayerActive && !nextUpVisible,
        idleFocusKey: inRoom && !isPlayerActive ? TV_FOCUS_KEYS.idleQr : undefined,
        settingsCloseFocusKey: showLobby
            ? TV_FOCUS_KEYS.lobbyCreate
            : isPlayerActive
              ? TV_FOCUS_KEYS.ctrlPlayPause
              : TV_FOCUS_KEYS.idleQr,
        isNextUpVisible: nextUpVisible,
    });

    const isIdleScreen = inRoom && !isPlayerActive && !settingsOpen;
    /** Keep spatial tree mounted during playback so first D-pad reveal can focus immediately. */
    const chromeMounted = isPlayerActive && !nextUpVisible;

    useEffect(() => {
        let prevLastMessage = useWebSocketStore.getState().lastMessage;
        return useWebSocketStore.subscribe((state) => {
            if (state.lastMessage === prevLastMessage) {
                return;
            }
            prevLastMessage = state.lastMessage;
            if (!state.lastMessage) {
                return;
            }
            useYouTubeStore
                .getState()
                .handleServerMessage(state.lastMessage, tToast, { isTvLayout: true });
        });
    }, [tToast]);

    useEffect(() => {
        if (!isPlayerActive) {
            return;
        }
        void import('./tv-player-chrome');
        void import('./tv-player-fixed-qr');
    }, [isPlayerActive]);

    useEffect(() => {
        if (!showLobby) {
            return;
        }

        hideControls();
        closeSettings();

        seedTvFocus(TV_FOCUS_KEYS.lobbyCreate);
    }, [showLobby, hideControls, closeSettings]);

    useEffect(() => {
        if (!isIdleScreen) {
            return;
        }

        seedTvFocus(TV_FOCUS_KEYS.idleQr);
    }, [isIdleScreen]);

    useEffect(() => {
        if (isPlayerActive) {
            return;
        }

        hideControls();
    }, [isPlayerActive, hideControls]);

    return (
        <TvSpatialRoot>
            <div className="relative h-dvh-screen w-full overflow-hidden bg-zinc-950 text-zinc-100">
                <ConnectionStatusToast />
                <main className="relative h-full w-full overflow-hidden">
                    {showLobby ? (
                        <TvLobby />
                    ) : (
                        <>
                            <TvPlayerHost onOpenSettingsAction={openSettings} />

                            {isPlayerActive && playingNow ? (
                                <TvEmbedFocusGuard
                                    controlsVisible={controlsVisible && !nextUpVisible}
                                />
                            ) : null}

                            {isPlayerActive ? <TvNextUpGate /> : null}

                            {/* The room QR lives in the big screen's side panel (never on the video). */}

                            {chromeMounted ? (
                                <TvPlayerChrome
                                    visible={controlsVisible}
                                    settingsOpen={settingsOpen}
                                    queueExpanded={queueExpanded}
                                    onRevealAction={revealControls}
                                    onQueueFocusAction={focusQueue}
                                    onQueueCollapseAction={collapseQueue}
                                    onOpenSettingsAction={openSettings}
                                    onCloseSettingsAction={closeSettings}
                                />
                            ) : settingsOpen ? (
                                <TvSettingsPanel onCloseAction={closeSettings} />
                            ) : null}
                        </>
                    )}
                </main>
            </div>
        </TvSpatialRoot>
    );
}
