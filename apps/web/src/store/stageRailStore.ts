import { create } from 'zustand';

/** Share of the screen width the big screen's side panel takes when open. */
export const STAGE_RAIL_FRACTION = 0.28;

/** Whether the big screen's side panel is open (the video shrinks to make room). */
export const useStageRailStore = create<{ open: boolean; setOpen: (open: boolean) => void }>()(
    (set) => ({ open: false, setOpen: (open) => set({ open }) }),
);
