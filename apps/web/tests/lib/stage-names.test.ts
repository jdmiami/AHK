import { describe, expect, it } from 'vitest';

import { randomStageName } from '@/lib/stage-names';

function sequence(...values: number[]) {
    let i = 0;
    return () => values[i++ % values.length]!;
}

describe('randomStageName', () => {
    it('builds English names as adjective + noun', () => {
        expect(randomStageName('en', sequence(0, 0))).toBe('Velvet Falcon');
    });

    it('builds Spanish names as noun + agreeing adjective', () => {
        // Halcón (m) + Eléctrico; Estrella (f) + Eléctrica
        expect(randomStageName('es', sequence(0, 0))).toBe('Halcón Eléctrico');
        expect(randomStageName('es', sequence(7 / 12 + 0.001, 0))).toBe('Estrella Eléctrica');
    });

    it('always returns two or more words within the name limit', () => {
        for (let i = 0; i < 50; i += 1) {
            const name = randomStageName(i % 2 ? 'es' : 'en');
            expect(name.split(' ').length).toBeGreaterThanOrEqual(2);
            expect(name.length).toBeLessThanOrEqual(32);
        }
    });
});
