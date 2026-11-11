/**
 * Where the big-screen video goes. It always gets the largest 16:9 box that fits the space
 * left over by the side panel (when open) and the race track (when a race is on), so nothing
 * is ever drawn on top of it.
 */
export const STAGE_RAIL_FRACTION = 0.28;

export interface StageLayout {
    /** The video box, in px. */
    video: { x: number; y: number; w: number; h: number };
    /** Scale applied to the full-screen video to fit that box. */
    scale: number;
    /** Width of the race track band around the video (0 when no race). */
    band: number;
    /** Centre line of the track (a rectangle around the video). */
    track: { x: number; y: number; w: number; h: number };
}

export function stageLayout(
    width: number,
    height: number,
    railOpen: boolean,
    raceOn: boolean,
): StageLayout {
    const areaW = railOpen ? width * (1 - STAGE_RAIL_FRACTION) : width;
    const band = raceOn ? Math.round(Math.min(width, height) * 0.09) : 0;
    const innerW = Math.max(1, areaW - band * 2);
    const innerH = Math.max(1, height - band * 2);
    const scale = Math.min(innerW / width, innerH / height, 1);
    const w = width * scale;
    const h = height * scale;
    const x = band + (innerW - w) / 2;
    const y = band + (innerH - h) / 2;
    const half = band / 2;
    return {
        video: { x, y, w, h },
        scale,
        band,
        track: { x: x - half, y: y - half, w: w + band, h: h + band },
    };
}
