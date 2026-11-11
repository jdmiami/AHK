import { create } from 'zustand';
import type { YouTubeVideo } from '@vkara/youtube';

import {
    fetchProfile,
    ProfileError,
    setProfileFavorite,
    type ProfileData,
    type ProfileSong,
} from '@/lib/profile-api';
import { useSingerStore } from '@/store/singerStore';

type ProfileDataState = {
    data: ProfileData | null;
    loading: boolean;
    /** Load (or reload) the logged-in profile. Logs out when the session has expired. */
    refresh: () => Promise<void>;
    isFavorite: (videoId: string) => boolean;
    toggleFavorite: (video: YouTubeVideo) => Promise<void>;
    clear: () => void;
};

function videoToSong(video: YouTubeVideo): ProfileSong {
    return {
        videoId: video.id,
        title: video.title,
        channel: video.channels?.[0]?.name ?? null,
        thumbnail: video.thumbnails?.[0]?.url ?? null,
        durationFormatted: video.duration_formatted ?? null,
    };
}

export function handleSessionError(error: unknown): void {
    if (error instanceof ProfileError && error.code === 'invalid_session') {
        useSingerStore.getState().setProfile(null);
        useProfileDataStore.getState().clear();
    }
}

/** What the server knows about the logged-in profile (not persisted on the phone). */
export const useProfileDataStore = create<ProfileDataState>()((set, get) => ({
    data: null,
    loading: false,
    refresh: async () => {
        const token = useSingerStore.getState().profile?.token;
        if (!token) return set({ data: null });
        set({ loading: true });
        try {
            set({ data: await fetchProfile(token) });
        } catch (error) {
            handleSessionError(error);
        } finally {
            set({ loading: false });
        }
    },
    isFavorite: (videoId) => Boolean(get().data?.favorites.some((f) => f.videoId === videoId)),
    toggleFavorite: async (video) => {
        const token = useSingerStore.getState().profile?.token;
        const data = get().data;
        if (!token || !data) return;
        const on = !get().isFavorite(video.id);
        const favorites = on
            ? [videoToSong(video), ...data.favorites]
            : data.favorites.filter((f) => f.videoId !== video.id);
        set({ data: { ...data, favorites } });
        try {
            await setProfileFavorite(token, video, on);
        } catch (error) {
            set({ data });
            handleSessionError(error);
        }
    },
    clear: () => set({ data: null, loading: false }),
}));
