import { describe, expect, it } from 'vitest';

import {
    allowedActions,
    formatUptime,
    formatUsd,
    isHostAction,
    isPinValid,
    mapHostState,
    parseHealth,
    parsePositiveNumber,
    runpodPodActionUrl,
    runpodPodUrl,
    sessionCostUsd,
} from '@/lib/host-switch';

describe('mapHostState', () => {
    it('is on only when the API answers, whatever the pod says', () => {
        expect(mapHostState('RUNNING', true)).toBe('on');
        expect(mapHostState(null, true)).toBe('on');
    });

    it('treats a running pod with a silent API as still starting', () => {
        expect(mapHostState('RUNNING', false)).toBe('starting');
        expect(mapHostState('STARTING', false)).toBe('starting');
        expect(mapHostState('PROVISIONING', false)).toBe('starting');
    });

    it('maps stopped, errored and deleted pods', () => {
        expect(mapHostState('EXITED', false)).toBe('off');
        expect(mapHostState('ERROR', false)).toBe('error');
        expect(mapHostState('TERMINATED', false)).toBe('missing');
        expect(mapHostState(null, false)).toBe('off');
    });
});

describe('isPinValid', () => {
    it('accepts only the exact configured PIN', () => {
        expect(isPinValid('4821', '4821')).toBe(true);
        expect(isPinValid('4822', '4821')).toBe(false);
        expect(isPinValid('48210', '4821')).toBe(false);
        expect(isPinValid('', '4821')).toBe(false);
        expect(isPinValid(4821, '4821')).toBe(false);
        expect(isPinValid('4821', undefined)).toBe(false);
    });
});

describe('actions and urls', () => {
    it('only offers start when off and stop when on or starting', () => {
        expect(allowedActions('off')).toEqual(['start']);
        expect(allowedActions('error')).toEqual(['start']);
        expect(allowedActions('on')).toEqual(['stop']);
        expect(allowedActions('starting')).toEqual(['stop']);
        expect(allowedActions('unconfigured')).toEqual([]);
        expect(allowedActions('missing')).toEqual([]);
    });

    it('offers no actions in read-only mode', () => {
        expect(allowedActions('on', true)).toEqual([]);
        expect(allowedActions('off', true)).toEqual([]);
    });

    it('validates actions and builds RunPod v2 urls', () => {
        expect(isHostAction('start')).toBe(true);
        expect(isHostAction('terminate')).toBe(false);
        expect(runpodPodUrl('abc123')).toBe('https://api.runpod.io/v2/pods/abc123');
        expect(runpodPodActionUrl('abc123')).toBe('https://api.runpod.io/v2/pods/abc123/action');
    });
});

describe('usage helpers', () => {
    it('computes session cost to the cent', () => {
        expect(sessionCostUsd(3600, 0.06)).toBe(0.06);
        expect(sessionCostUsd(5400, 0.06)).toBe(0.09);
        expect(sessionCostUsd(null, 0.06)).toBeNull();
        expect(sessionCostUsd(3600, null)).toBeNull();
    });

    it('formats uptime and money', () => {
        expect(formatUptime(30)).toBe('<1 min');
        expect(formatUptime(12 * 60)).toBe('12 min');
        expect(formatUptime(65 * 60)).toBe('1 h 05 min');
        expect(formatUptime(null)).toBeNull();
        expect(formatUsd(23.4)).toBe('$23.40');
        expect(formatUsd(null)).toBeNull();
    });

    it('parses the API health payload defensively', () => {
        expect(parseHealth({ status: 'ok', uptime: 101.2, runtime: { wsConnections: 3 } })).toEqual(
            {
                connections: 3,
                uptime: 101.2,
            },
        );
        expect(parseHealth({ status: 'ok' })).toEqual({ connections: null, uptime: null });
        expect(parseHealth(null)).toEqual({ connections: null, uptime: null });
    });

    it('falls back to defaults for invalid policy numbers', () => {
        expect(parsePositiveNumber('30', 20)).toBe(30);
        expect(parsePositiveNumber('0', 20)).toBe(20);
        expect(parsePositiveNumber('abc', 20)).toBe(20);
        expect(parsePositiveNumber(undefined, 6)).toBe(6);
    });
});
