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

/** Live numbers for the panel. Every field is optional: each comes from a different source. */
export type HostUsage = {
    /** Phones + TVs connected right now (API `/health` → `wsConnections`). */
    connectedDevices: number | null;
    /** Seconds the pod has been running (RunPod `runtime.uptime`), else the API process uptime. */
    uptimeSeconds: number | null;
    /** Pod hourly price in USD (RunPod `cost`). */
    costPerHour: number | null;
    /** `uptimeSeconds × costPerHour`, rounded to cents. */
    sessionCost: number | null;
    /** Prepaid RunPod credit in USD (GraphQL `myself.clientBalance`). */
    balance: number | null;
    /** Everything billing on the account right now, USD/h (GraphQL `myself.currentSpendPerHr`). */
    accountSpendPerHour: number | null;
};

/** The in-pod watchdog's rule (`containers/api-redis/idle-watchdog.sh`), echoed so guests know it. */
export type AutoOffPolicy = {
    idleMinutes: number;
    maxHours: number;
};

export type HostStatusResponse = {
    state: HostState;
    podStatus: PodStatus | null;
    apiReachable: boolean;
    /** True when the server has no RunPod key: status comes from `/health` only and actions are disabled. */
    readOnly: boolean;
    usage: HostUsage;
    autoOff: AutoOffPolicy;
    checkedAt: string;
};

export const RUNPOD_API_BASE = 'https://api.runpod.io/v2';
export const RUNPOD_GRAPHQL_URL = 'https://api.runpod.io/graphql';
export const BALANCE_QUERY = 'query AhkBalance { myself { clientBalance currentSpendPerHr } }';
export const DEFAULT_IDLE_STOP_MINUTES = 20;
export const DEFAULT_MAX_SESSION_HOURS = 6;
/** Below this balance the panel warns that RunPod will soon stop the pod by itself. */
/** Where the host starts the pod by hand while the app has no RunPod key. */
export const RUNPOD_CONSOLE_PODS_URL = 'https://www.runpod.io/console/pods';

export const LOW_BALANCE_USD = 2;

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

export function sessionCostUsd(
    uptimeSeconds: number | null,
    costPerHour: number | null,
): number | null {
    if (uptimeSeconds == null || costPerHour == null) return null;
    return Math.round((uptimeSeconds / 3600) * costPerHour * 100) / 100;
}

/** "1 h 05 min" / "12 min" / "under a minute". */
export function formatUptime(seconds: number | null): string | null {
    if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return '<1 min';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${minutes} min`;
}

export function formatUsd(value: number | null): string | null {
    if (value == null || !Number.isFinite(value)) return null;
    return `$${value.toFixed(2)}`;
}

export function parsePositiveNumber(raw: string | undefined, fallback: number): number {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Parse `/health` defensively: `{ runtime: { wsConnections }, uptime }`. */
export function parseHealth(body: unknown): { connections: number | null; uptime: number | null } {
    if (!body || typeof body !== 'object') return { connections: null, uptime: null };
    const record = body as { uptime?: unknown; runtime?: { wsConnections?: unknown } };
    const connections =
        typeof record.runtime?.wsConnections === 'number' ? record.runtime.wsConnections : null;
    const uptime = typeof record.uptime === 'number' ? record.uptime : null;
    return { connections, uptime };
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
export function allowedActions(state: HostState, readOnly = false): HostAction[] {
    if (readOnly) return [];
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
