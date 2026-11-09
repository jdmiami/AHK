import { describe, expect, it } from 'vitest';

import { pendingRoomLocks, withRoomLock } from '@/utils/room-lock';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('withRoomLock', () => {
    it('runs work for the same room one at a time, in arrival order', async () => {
        let store = { rate: 1, semitones: 0, engine: false };
        const order: string[] = [];
        // Read-modify-write with an await in between: without the lock the last writer would
        // drop the other two changes.
        const mutate = (label: string, change: Partial<typeof store>) =>
            withRoomLock('1234', async () => {
                const read = { ...store };
                await tick();
                store = { ...read, ...change };
                order.push(label);
            });

        await Promise.all([
            mutate('tempo', { rate: 0.8 }),
            mutate('key', { semitones: -3 }),
            mutate('engine', { engine: true }),
        ]);

        expect(store).toEqual({ rate: 0.8, semitones: -3, engine: true });
        expect(order).toEqual(['tempo', 'key', 'engine']);
        expect(pendingRoomLocks()).toBe(0);
    });

    it('does not block other rooms and releases after errors', async () => {
        const order: string[] = [];
        const slow = withRoomLock('1111', async () => {
            await tick();
            await tick();
            order.push('slow-1111');
        });
        const fast = withRoomLock('2222', async () => {
            order.push('fast-2222');
        });
        await Promise.all([slow, fast]);
        expect(order).toEqual(['fast-2222', 'slow-1111']);

        await expect(
            withRoomLock('3333', async () => {
                throw new Error('boom');
            }),
        ).rejects.toThrow('boom');
        await expect(withRoomLock('3333', async () => 'next')).resolves.toBe('next');
        expect(pendingRoomLocks()).toBe(0);
    });
});
