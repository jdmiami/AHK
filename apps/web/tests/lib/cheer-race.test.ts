import { describe, expect, it } from 'vitest';

import { pointOnLoop, RACE, stepRace, tapRacer, type Racer } from '@/lib/cheer-race';

const cheer = (id: string, emoji: string) => ({
    from: { deviceId: id, name: id, color: '#fff' },
    emoji,
});

describe('cheer race', () => {
    it('builds a combo on the same emoji and resets it on a switch', () => {
        const racers = new Map<string, Racer>();
        tapRacer(racers, cheer('ana', '❤️'), 0);
        tapRacer(racers, cheer('ana', '❤️'), 500);
        expect(tapRacer(racers, cheer('ana', '❤️'), 1000).combo).toBe(3);
        expect(tapRacer(racers, cheer('ana', '🔥'), 1200).combo).toBe(1);
        // Too slow keeps the emoji but restarts the combo.
        expect(tapRacer(racers, cheer('ana', '🔥'), 1200 + RACE.comboWindowMs + 1).combo).toBe(1);
    });

    it('goes faster the more you tap the same emoji', () => {
        const steady = new Map<string, Racer>();
        const switching = new Map<string, Racer>();
        const emojis = ['❤️', '🔥'];
        for (let i = 0; i < 10; i++) {
            tapRacer(steady, cheer('ana', '❤️'), i * 300);
            tapRacer(switching, cheer('ben', emojis[i % 2]!), i * 300);
        }
        expect(steady.get('ana')!.speed).toBeGreaterThan(switching.get('ben')!.speed * 1.8);
    });

    it('declares the first racer to finish a lap the winner', () => {
        const racers = new Map<string, Racer>();
        let winner: Racer | null = null;
        let now = 0;
        for (let i = 0; i < 400 && !winner; i++) {
            now += 300;
            tapRacer(racers, cheer('ana', '❤️'), now);
            if (i % 3 === 0) tapRacer(racers, cheer('ben', '👏'), now);
            winner = stepRace(racers, 0.3, now);
        }
        expect(winner?.id).toBe('ana');
        expect(racers.get('ben')!.progress).toBeLessThan(1);
    });

    it('drops racers who stop tapping', () => {
        const racers = new Map<string, Racer>();
        tapRacer(racers, cheer('cy', '🌟'), 0);
        for (let t = 1; t <= 40; t++) stepRace(racers, 1, t * 1000);
        expect(racers.has('cy')).toBe(false);
    });

    it('walks the loop clockwise from the top-left corner', () => {
        const box = { x: 10, y: 20, w: 100, h: 50 };
        const near = (t: number, x: number, y: number) => {
            const p = pointOnLoop(box, t);
            expect(p.x).toBeCloseTo(x, 6);
            expect(p.y).toBeCloseTo(y, 6);
        };
        near(0, 10, 20);
        near(100 / 300, 110, 20);
        near(0.5, 110, 70);
        near(0.75, 35, 70);
        near(1, 10, 20);
    });
});
