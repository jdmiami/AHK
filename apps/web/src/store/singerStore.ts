import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createMigratingPersistStorage, PERSIST_STORE_KEYS } from '@/lib/persisted-storage';

/** Saved profile session (Supabase), set after a PIN login. */
export type SingerProfileSession = {
    profileId: string;
    token: string;
    stageName: string;
};

type SingerState = {
    /** Empty until first use; then a random stage name the singer can change. */
    stageName: string;
    emoji: string;
    color: string;
    profile: SingerProfileSession | null;
    setIdentity: (patch: Partial<Pick<SingerState, 'stageName' | 'emoji' | 'color'>>) => void;
    setProfile: (profile: SingerProfileSession | null) => void;
};

/** This phone's karaoke identity (stage name, look, saved profile). */
export const useSingerStore = create<SingerState>()(
    persist(
        (set) => ({
            stageName: '',
            emoji: '',
            color: '',
            profile: null,
            setIdentity: (patch) => set(patch),
            setProfile: (profile) => set({ profile }),
        }),
        {
            name: PERSIST_STORE_KEYS.singer,
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({
                stageName: state.stageName,
                emoji: state.emoji,
                color: state.color,
                profile: state.profile,
            }),
        },
    ),
);
