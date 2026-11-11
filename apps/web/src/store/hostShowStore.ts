import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createMigratingPersistStorage, PERSIST_STORE_KEYS } from '@/lib/persisted-storage';

type HostShowState = {
    /** Announcer intros, applause and invites (saved on this big screen). */
    announcer: boolean;
    /** Lounge music while nothing is playing (saved on this big screen). */
    music: boolean;
    /** True while the announcer is mid-sequence; the next song waits for it. */
    busy: boolean;
    /** What the announcer is saying right now (shown on screen). */
    caption: string | null;
    /** Bumped to cut the announcer off (e.g. "Play next" pressed). */
    cancelSeq: number;
    setAnnouncer: (on: boolean) => void;
    setMusic: (on: boolean) => void;
    setBusy: (busy: boolean) => void;
    setCaption: (caption: string | null) => void;
    cancel: () => void;
};

export const useHostShowStore = create<HostShowState>()(
    persist(
        (set) => ({
            announcer: true,
            music: true,
            busy: false,
            caption: null,
            cancelSeq: 0,
            setAnnouncer: (announcer) => set({ announcer }),
            setMusic: (music) => set({ music }),
            setBusy: (busy) => set({ busy }),
            setCaption: (caption) => set({ caption }),
            cancel: () => set((s) => ({ cancelSeq: s.cancelSeq + 1, busy: false, caption: null })),
        }),
        {
            name: PERSIST_STORE_KEYS.hostShow,
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({ announcer: state.announcer, music: state.music }),
        },
    ),
);

/**
 * Run `advance` once the announcer has finished (immediately if it is quiet).
 * Gives up waiting after `maxWaitMs` so a stuck voice never blocks the night.
 */
export function whenHostIdle(advance: () => void, maxWaitMs = 25_000): void {
    if (!useHostShowStore.getState().busy) {
        advance();
        return;
    }
    let fired = false;
    const fire = () => {
        if (fired) return;
        fired = true;
        unsubscribe();
        clearTimeout(timer);
        advance();
    };
    const unsubscribe = useHostShowStore.subscribe((state) => {
        if (!state.busy) fire();
    });
    const timer = setTimeout(fire, maxWaitMs);
}
