import { create } from 'zustand';

export { STAGE_RAIL_FRACTION } from '@/lib/stage-layout';

/** Big screen stage: side panel open / race track shown (the video shrinks to make room). */
export const useStageRailStore = create<{
    open: boolean;
    raceOn: boolean;
    setOpen: (open: boolean) => void;
    setRaceOn: (raceOn: boolean) => void;
}>()((set) => ({
    open: false,
    raceOn: false,
    setOpen: (open) => set({ open }),
    setRaceOn: (raceOn) => set({ raceOn }),
}));
