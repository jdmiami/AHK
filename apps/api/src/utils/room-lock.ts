/**
 * Serializes async work per room inside this API process.
 *
 * Room mutations use Redis WATCH/MULTI, but WATCH is per connection and every handler shares
 * one ioredis connection, so two mutations of the same room running at the same moment could
 * both "succeed" and the later write would drop the earlier change (e.g. a phone's key change
 * and the TV's key-engine status). Queuing per room removes that race for the single-process
 * deployment; WATCH still guards against other processes.
 */
const tails = new Map<string, Promise<void>>();

export async function withRoomLock<T>(roomId: string, work: () => Promise<T>): Promise<T> {
    const previous = tails.get(roomId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
        release = resolve;
    });
    const tail = previous.then(() => current);
    tails.set(roomId, tail);

    await previous;
    try {
        return await work();
    } finally {
        release();
        if (tails.get(roomId) === tail) {
            tails.delete(roomId);
        }
    }
}

/** Number of rooms with queued work (for tests). */
export function pendingRoomLocks(): number {
    return tails.size;
}
