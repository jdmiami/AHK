import { NextResponse } from 'next/server';

import { env } from '@/env';
import {
    isHostAction,
    isPinValid,
    mapHostState,
    runpodPodActionUrl,
    runpodPodUrl,
    type HostStatusResponse,
    type PodStatus,
} from '@/lib/host-switch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEALTH_TIMEOUT_MS = 3000;
const RUNPOD_TIMEOUT_MS = 8000;
const WRONG_PIN_DELAY_MS = 600;

function configured(): { apiKey: string; podId: string } | null {
    const apiKey = env.RUNPOD_API_KEY?.trim();
    const podId = env.RUNPOD_POD_ID?.trim();
    if (!apiKey || !podId) return null;
    return { apiKey, podId };
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

async function readPodStatus(apiKey: string, podId: string): Promise<PodStatus | null> {
    const res = await fetchWithTimeout(
        runpodPodUrl(podId),
        { headers: { Authorization: `Bearer ${apiKey}` } },
        RUNPOD_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: string };
    return (body.status as PodStatus | undefined) ?? null;
}

async function probeApi(): Promise<boolean> {
    const base = env.NEXT_PUBLIC_API_URL?.trim();
    if (!base || base.startsWith('/')) return false;
    try {
        const res = await fetchWithTimeout(
            `${base.replace(/\/$/, '')}/health`,
            { method: 'GET' },
            HEALTH_TIMEOUT_MS,
        );
        return res.ok;
    } catch {
        return false;
    }
}

async function buildStatus(): Promise<HostStatusResponse> {
    const config = configured();
    if (!config) {
        return {
            state: 'unconfigured',
            podStatus: null,
            apiReachable: false,
            checkedAt: new Date().toISOString(),
        };
    }
    const [podStatus, apiReachable] = await Promise.all([
        readPodStatus(config.apiKey, config.podId).catch(() => null),
        probeApi(),
    ]);
    return {
        state: mapHostState(podStatus, apiReachable),
        podStatus,
        apiReachable,
        checkedAt: new Date().toISOString(),
    };
}

/** Public, read-only: is the house on? */
export async function GET() {
    const status = await buildStatus();
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}

/** PIN-gated: start or stop the pod. */
export async function POST(request: Request) {
    const config = configured();
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
