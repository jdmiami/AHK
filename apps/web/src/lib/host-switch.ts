/** RunPod pod lifecycle states (RunPod REST v2 `PodStatus`). */
export type PodStatus = 'PROVISIONING' | 'STARTING' | 'RUNNING' | 'EXITED' | 'ERROR' | 'TERMINATED';

/** What the lobby shows. */
export type HostState =
    | 'unconfigured'
    | 'off'
    | 'starting'
    | 'on'
    | 'stopping'
    | 'missing'
    | 'error';

export type HostStatusResponse = {
    state: HostState;
    podStatus: PodStatus | null;
    apiReachable: boolean;
    checkedAt: string;
};

export const RUNPOD_API_BASE = 'https://api.runpod.io/v2';

export function runpodPodUrl(podId: string): string {
    return `${RUNPOD_API_BASE}/pods/${encodeURIComponent(podId)}`;
}

export function runpodPodActionUrl(podId: string): string {
    return `${runpodPodUrl(podId)}/action`;
}

/**
 * Combine the pod's lifecycle state with a live health probe of the API.
 * A RUNNING pod whose API has not bound yet is still "starting" for the user.
 */
export function mapHostState(podStatus: PodStatus | null, apiReachable: boolean): HostState {
    if (apiReachable) return 'on';
    switch (podStatus) {
        case 'RUNNING':
        case 'STARTING':
        case 'PROVISIONING':
            return 'starting';
        case 'EXITED':
            return 'off';
        case 'ERROR':
            return 'error';
        case 'TERMINATED':
            return 'missing';
        default:
            return 'off';
    }
}

/**
 * Constant-time PIN comparison without Node APIs (this module is shared with the client
 * bundle for its types and state helpers). Rejects empty or length-mismatched input.
 */
export function isPinValid(input: unknown, expected: string | undefined): boolean {
    if (!expected || typeof input !== 'string' || input.length === 0) return false;
    const a = new TextEncoder().encode(input);
    const b = new TextEncoder().encode(expected);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i]! ^ b[i]!;
    }
    return diff === 0;
}

export type HostAction = 'start' | 'stop';

export function isHostAction(value: unknown): value is HostAction {
    return value === 'start' || value === 'stop';
}

/** Which actions make sense from a given state (the UI greys out the rest). */
export function allowedActions(state: HostState): HostAction[] {
    switch (state) {
        case 'off':
        case 'error':
            return ['start'];
        case 'on':
        case 'starting':
            return ['stop'];
        default:
            return [];
    }
}
