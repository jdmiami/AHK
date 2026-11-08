import { describe, expect, it } from 'vitest';

import {
    allowedActions,
    isHostAction,
    isPinValid,
    mapHostState,
    runpodPodActionUrl,
    runpodPodUrl,
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

    it('validates actions and builds RunPod v2 urls', () => {
        expect(isHostAction('start')).toBe(true);
        expect(isHostAction('terminate')).toBe(false);
        expect(runpodPodUrl('abc123')).toBe('https://api.runpod.io/v2/pods/abc123');
        expect(runpodPodActionUrl('abc123')).toBe('https://api.runpod.io/v2/pods/abc123/action');
    });
});
