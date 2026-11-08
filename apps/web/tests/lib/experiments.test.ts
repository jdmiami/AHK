import { afterEach, describe, expect, it, vi } from 'vitest';

const envMock = vi.hoisted(() => ({
    env: {} as Record<string, string | undefined>,
}));

vi.mock('@/env', () => ({
    get env() {
        return new Proxy(envMock.env, {
            get(target, key: string) {
                if (typeof window !== 'undefined' && !key.startsWith('NEXT_PUBLIC_')) {
                    throw new Error('Attempted to access a server-side environment variable on the client');
                }
                return target[key];
            },
        });
    },
}));

import { isExperimentsEnabled } from '@/lib/experiments';

describe('isExperimentsEnabled (web)', () => {
    afterEach(() => {
        envMock.env = {};
        vi.unstubAllGlobals();
    });

    it('never touches the server-only flag in the browser', () => {
        vi.stubGlobal('window', {});
        envMock.env = { VKARA_EXPERIMENTS: 'true' };
        expect(() => isExperimentsEnabled()).not.toThrow();
        expect(isExperimentsEnabled()).toBe(false);
    });

    it('reads the public flag in the browser', () => {
        vi.stubGlobal('window', {});
        envMock.env = { NEXT_PUBLIC_VKARA_EXPERIMENTS: '1' };
        expect(isExperimentsEnabled()).toBe(true);
    });

    it('falls back to the server flag when rendering on the server', () => {
        envMock.env = { VKARA_EXPERIMENTS: 'on' };
        expect(isExperimentsEnabled()).toBe(true);
    });
});
