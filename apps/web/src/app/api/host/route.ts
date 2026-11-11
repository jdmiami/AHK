import { NextResponse } from 'next/server';

import { env } from '@/env';
import {
    BALANCE_QUERY,
    DEFAULT_IDLE_STOP_MINUTES,
    DEFAULT_MAX_SESSION_HOURS,
    RUNPOD_GRAPHQL_URL,
    isHostAction,
    isPinValid,
    mapHostState,
    parseHealth,
    parsePositiveNumber,
    runpodPodActionUrl,
    runpodPodUrl,
    sessionCostUsd,
    type HostStatusResponse,
    type PodStatus,
} from '@/lib/host-switch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEALTH_TIMEOUT_MS = 3000;
const RUNPOD_TIMEOUT_MS = 8000;
const WRONG_PIN_DELAY_MS = 600;

function runpodConfig(): { apiKey: string; podId: string } | null {
    const apiKey = env.RUNPOD_API_KEY?.trim();
    const podId = env.RUNPOD_POD_ID?.trim();
    if (!apiKey || !podId) return null;
    return { apiKey, podId };
}

function apiBase(): string | null {
    const base = env.NEXT_PUBLIC_API_URL?.trim();
    if (!base || base.startsWith('/')) return null;
    return base.replace(/\/$/, '');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    } finally {
        clearTimeout(timer);
    }
}

type PodRead = { status: PodStatus | null; costPerHour: number | null; uptime: number | null };

async function readPod(apiKey: string, podId: string): Promise<PodRead> {
    const res = await fetchWithTimeout(
        runpodPodUrl(podId),
        { headers: { Authorization: `Bearer ${apiKey}` } },
        RUNPOD_TIMEOUT_MS,
    );
    if (!res.ok) return { status: null, costPerHour: null, uptime: null };
    const body = (await res.json()) as {
        status?: string;
        cost?: number;
        runtime?: { uptime?: number } | null;
    };
    return {
        status: (body.status as PodStatus | undefined) ?? null,
        costPerHour: typeof body.cost === 'number' ? body.cost : null,
        uptime: typeof body.runtime?.uptime === 'number' ? body.runtime.uptime : null,
    };
}

async function readBalance(
    apiKey: string,
): Promise<{ balance: number | null; spend: number | null }> {
    try {
        const res = await fetchWithTimeout(
            RUNPOD_GRAPHQL_URL,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: BALANCE_QUERY }),
            },
            RUNPOD_TIMEOUT_MS,
        );
        if (!res.ok) return { balance: null, spend: null };
        const body = (await res.json()) as {
            data?: { myself?: { clientBalance?: number; currentSpendPerHr?: number } };
        };
        const me = body.data?.myself;
        return {
            balance: typeof me?.clientBalance === 'number' ? me.clientBalance : null,
            spend: typeof me?.currentSpendPerHr === 'number' ? me.currentSpendPerHr : null,
        };
    } catch {
        return { balance: null, spend: null };
    }
}

async function probeApi(): Promise<{
    ok: boolean;
    connections: number | null;
    uptime: number | null;
}> {
    const base = apiBase();
    if (!base) return { ok: false, connections: null, uptime: null };
    try {
        const res = await fetchWithTimeout(`${base}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
        if (!res.ok) return { ok: false, connections: null, uptime: null };
        const parsed = parseHealth(await res.json().catch(() => null));
        return { ok: true, ...parsed };
    } catch {
        return { ok: false, connections: null, uptime: null };
    }
}

async function buildStatus(): Promise<HostStatusResponse> {
    const config = runpodConfig();
    const autoOff = {
        idleMinutes: parsePositiveNumber(env.AHK_IDLE_STOP_MINUTES, DEFAULT_IDLE_STOP_MINUTES),
        maxHours: parsePositiveNumber(env.AHK_MAX_SESSION_HOURS, DEFAULT_MAX_SESSION_HOURS),
    };
    const checkedAt = new Date().toISOString();

    if (!config && !apiBase()) {
        return {
            state: 'unconfigured',
            podStatus: null,
            apiReachable: false,
            readOnly: true,
            usage: {
                connectedDevices: null,
                uptimeSeconds: null,
                costPerHour: null,
                sessionCost: null,
                balance: null,
                accountSpendPerHour: null,
            },
            autoOff,
            checkedAt,
        };
    }

    const [pod, health, money] = await Promise.all([
        config
            ? readPod(config.apiKey, config.podId).catch(
                  (): PodRead => ({ status: null, costPerHour: null, uptime: null }),
              )
            : Promise.resolve<PodRead>({ status: null, costPerHour: null, uptime: null }),
        probeApi(),
        config ? readBalance(config.apiKey) : Promise.resolve({ balance: null, spend: null }),
    ]);

    const uptimeSeconds = pod.uptime ?? health.uptime;
    return {
        state: mapHostState(pod.status, health.ok),
        podStatus: pod.status,
        apiReachable: health.ok,
        readOnly: !config,
        usage: {
            connectedDevices: health.ok ? health.connections : null,
            uptimeSeconds: health.ok || pod.status === 'RUNNING' ? uptimeSeconds : null,
            costPerHour: pod.costPerHour,
            sessionCost: sessionCostUsd(health.ok ? uptimeSeconds : null, pod.costPerHour),
            balance: money.balance,
            accountSpendPerHour: money.spend,
        },
        autoOff,
        checkedAt,
    };
}

/** Public, read-only: is the house on, and what is it costing? */
export async function GET() {
    const status = await buildStatus();
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}

/** PIN-gated: start or stop the pod. */
export async function POST(request: Request) {
    const config = runpodConfig();
    if (!config || !env.AHK_HOST_PIN) {
        return NextResponse.json({ error: 'unconfigured' }, { status: 503 });
    }

    let body: { action?: unknown; pin?: unknown } = {};
    try {
        body = (await request.json()) as typeof body;
    } catch {
        return NextResponse.json({ error: 'invalidBody' }, { status: 400 });
    }

    if (!isHostAction(body.action)) {
        return NextResponse.json({ error: 'invalidAction' }, { status: 400 });
    }

    if (!isPinValid(body.pin, env.AHK_HOST_PIN)) {
        await new Promise((resolve) => setTimeout(resolve, WRONG_PIN_DELAY_MS));
        return NextResponse.json({ error: 'wrongPin' }, { status: 401 });
    }

    const res = await fetchWithTimeout(
        runpodPodActionUrl(config.podId),
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: body.action }),
        },
        RUNPOD_TIMEOUT_MS,
    ).catch(() => null);

    // 409 = action not valid for the current state (e.g. start on a RUNNING pod); report status instead.
    if (!res || (!res.ok && res.status !== 409)) {
        return NextResponse.json(
            { error: 'runpodFailed', status: res?.status ?? 0 },
            { status: 502 },
        );
    }

    const status = await buildStatus();
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
