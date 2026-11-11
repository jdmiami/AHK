import { create } from 'zustand';

export type RaceStanding = {
    id: string;
    name: string;
    color: string;
    emoji: string;
    progress: number;
    combo: number;
};

/** What the side panel shows about the race (the track animates on its own). */
export const useCheerRaceStore = create<{
    standings: RaceStanding[];
    winner: RaceStanding | null;
    set: (patch: { standings?: RaceStanding[]; winner?: RaceStanding | null }) => void;
}>()((set) => ({ standings: [], winner: null, set: (patch) => set(patch) }));
