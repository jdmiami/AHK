/**
 * Cheer race: every cheer from a phone pushes that person's emoji racer around the track
 * that frames the big-screen video. Tapping the same emoji again and again builds a combo
 * (bigger pushes); switching emoji starts the combo over. First to finish one lap wins.
 * Pure logic so it can be tested; the big screen animates it.
 */

export const RACE = {
    /** Lap share added per tap at combo 1. */
    impulse: 0.012,
    /** Extra push per combo step (×(1 + boost × combo)). */
    comboBoost: 0.25,
    maxCombo: 12,
    /** A tap of the same emoji within this window keeps the combo going. */
    comboWindowMs: 2500,
    /** Speed decays by e^(−friction × seconds). */
    friction: 0.6,
    /** Racers with no taps for this long leave the track. */
    idleDropMs: 15_000,
    /** How long the winner is shown before the next race. */
    winHoldMs: 6_000,
} as const;

export interface Racer {
    id: string;
    name: string;
    color: string;
    emoji: string;
    combo: number;
    lastTapAt: number;
    /** Laps per second. */
    speed: number;
    /** 0 = start line, 1 = one full lap. */
    progress: number;
}

export interface Cheer {
    from: { deviceId: string; name: string; color: string };
    emoji: string;
}

export function tapRacer(racers: Map<string, Racer>, cheer: Cheer, now: number): Racer {
    const existing = racers.get(cheer.from.deviceId);
    const sameStreak =
        existing &&
        existing.emoji === cheer.emoji &&
        now - existing.lastTapAt <= RACE.comboWindowMs;
    const racer: Racer = existing ?? {
        id: cheer.from.deviceId,
        name: cheer.from.name,
        color: cheer.from.color,
        emoji: cheer.emoji,
        combo: 0,
        lastTapAt: now,
        speed: 0,
        progress: 0,
    };
    racer.combo = sameStreak ? Math.min(RACE.maxCombo, racer.combo + 1) : 1;
    racer.emoji = cheer.emoji;
    racer.name = cheer.from.name;
    racer.color = cheer.from.color;
    racer.lastTapAt = now;
    racer.speed += RACE.impulse * (1 + RACE.comboBoost * racer.combo);
    racers.set(racer.id, racer);
    return racer;
}

/** Advance the race by `dt` seconds. Returns the winner when someone completes the lap. */
export function stepRace(racers: Map<string, Racer>, dt: number, now: number): Racer | null {
    let winner: Racer | null = null;
    const decay = Math.exp(-RACE.friction * dt);
    for (const racer of racers.values()) {
        racer.progress = Math.min(1, racer.progress + racer.speed * dt);
        racer.speed *= decay;
        if (racer.progress >= 1 && (!winner || racer.lastTapAt < winner.lastTapAt)) winner = racer;
        if (!winner && now - racer.lastTapAt > RACE.idleDropMs && racer.speed < 0.002) {
            racers.delete(racer.id);
        }
    }
    return winner;
}

export function standings(racers: Map<string, Racer>): Racer[] {
    return [...racers.values()].sort((a, b) => b.progress - a.progress);
}

/** A point on a rectangular loop, clockwise from the top-left corner. */
export function pointOnLoop(
    box: { x: number; y: number; w: number; h: number },
    t: number,
): { x: number; y: number } {
    const perimeter = 2 * (box.w + box.h);
    let d = (((t % 1) + 1) % 1) * perimeter;
    if (d <= box.w) return { x: box.x + d, y: box.y };
    d -= box.w;
    if (d <= box.h) return { x: box.x + box.w, y: box.y + d };
    d -= box.h;
    if (d <= box.w) return { x: box.x + box.w - d, y: box.y + box.h };
    d -= box.w;
    return { x: box.x, y: box.y + box.h - d };
}
