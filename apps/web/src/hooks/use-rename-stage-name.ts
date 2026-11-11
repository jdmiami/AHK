'use client';

import { useCallback } from 'react';
import { cleanStageName } from '@vkara/room';

import { setUserDisplayName } from '@/lib/device-label';
import { ProfileError, renameProfile, type ProfileErrorCode } from '@/lib/profile-api';
import { useWebSocket } from '@/providers/websocket-provider';
import { handleSessionError, useProfileDataStore } from '@/store/profileStore';
import { useSingerStore } from '@/store/singerStore';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * The one way a phone changes its name. Updates the saved profile (its login name), this
 * phone, and the room: the people list, queue labels and the big screen.
 * Resolves to an error code when the name was not changed.
 */
export function useRenameStageName() {
    const { ensureConnectedAndSend } = useWebSocket();

    return useCallback(
        async (raw: string): Promise<ProfileErrorCode | null> => {
            const name = cleanStageName(raw);
            if (!name || name.length < 2) return 'invalid_name';
            const { stageName, profile, setIdentity, setProfile } = useSingerStore.getState();
            if (name === stageName) return null;

            let finalName = name;
            if (profile) {
                try {
                    finalName = (await renameProfile(profile.token, name)).stageName;
                } catch (error) {
                    handleSessionError(error);
                    return error instanceof ProfileError ? error.code : 'unavailable';
                }
                setProfile({ ...profile, stageName: finalName });
                void useProfileDataStore.getState().refresh();
            }

            setIdentity({ stageName: finalName });
            setUserDisplayName(finalName);
            if (useYouTubeStore.getState().room?.id) {
                ensureConnectedAndSend({ type: 'updateSinger', stageName: finalName });
            }
            return null;
        },
        [ensureConnectedAndSend],
    );
}
