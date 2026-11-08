'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Power, PowerOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { env } from '@/env';
import { allowedActions, type HostAction, type HostStatusResponse } from '@/lib/host-switch';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

const POLL_ACTIVE_MS = 8000;
const POLL_IDLE_MS = 60000;

export function isHostSwitchEnabled(): boolean {
    const raw = env.NEXT_PUBLIC_HOST_SWITCH?.trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes';
}

type PanelError = 'wrongPin' | 'failed' | null;

/**
 * "Turn on the house": starts/stops the RunPod pod that runs the API, from the lobby.
 * Status is public; actions need the house PIN (checked server-side).
 */
export function HostPowerPanel({ className }: { className?: string }) {
    const t = useScopedI18n('hostSwitch');
    const [status, setStatus] = useState<HostStatusResponse | null>(null);
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState<HostAction | null>(null);
    const [error, setError] = useState<PanelError>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch('/api/host', { cache: 'no-store' });
            if (!res.ok) return;
            setStatus((await res.json()) as HostStatusResponse);
        } catch {
            /* keep last known status */
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loop = async () => {
            await refresh();
            if (cancelled) return;
            const delay = status?.state === 'on' ? POLL_IDLE_MS : POLL_ACTIVE_MS;
            timer.current = setTimeout(loop, delay);
        };
        void loop();
        return () => {
            cancelled = true;
            if (timer.current) clearTimeout(timer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh, status?.state === 'on']);

    const act = useCallback(
        async (action: HostAction) => {
            setBusy(action);
            setError(null);
            try {
                const res = await fetch('/api/host', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, pin }),
                });
                if (res.status === 401) {
                    setError('wrongPin');
                    return;
                }
                if (!res.ok) {
                    setError('failed');
                    return;
                }
                setStatus((await res.json()) as HostStatusResponse);
                setPin('');
            } catch {
                setError('failed');
            } finally {
                setBusy(null);
            }
        },
        [pin],
    );

    if (!isHostSwitchEnabled()) return null;
    if (!status || status.state === 'unconfigured') return null;

    const state = status.state;
    const actions = allowedActions(state);
    const isOn = state === 'on';
    const isStarting = state === 'starting';

    return (
        <section
            className={cn(
                'rounded-2xl border border-border/70 bg-card/80 p-4 text-sm shadow-sm',
                isOn && 'border-primary/40 shadow-[var(--ahk-glow-primary)]',
                className,
            )}
            aria-live="polite"
        >
            <div className="flex items-center gap-3">
                <span
                    className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        isOn
                            ? 'bg-primary/15 text-primary'
                            : isStarting
                              ? 'bg-neon-cyan/15 text-neon-cyan'
                              : 'bg-muted text-muted-foreground',
                    )}
                    aria-hidden
                >
                    {isStarting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isOn ? (
                        <Power className="h-5 w-5" />
                    ) : (
                        <PowerOff className="h-5 w-5" />
                    )}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                        {isOn ? t('stateOn') : isStarting ? t('stateStarting') : t('stateOff')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {isOn
                            ? t('hintOn')
                            : isStarting
                              ? t('hintStarting')
                              : state === 'missing'
                                ? t('hintMissing')
                                : t('hintOff')}
                    </p>
                </div>
            </div>

            {actions.length > 0 ? (
                <div className="mt-3 flex items-center gap-2">
                    <Input
                        value={pin}
                        onChange={(e) => {
                            setPin(e.target.value);
                            if (error) setError(null);
                        }}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t('pinPlaceholder')}
                        aria-label={t('pinLabel')}
                        className="h-10 max-w-[9rem]"
                    />
                    {actions.includes('start') ? (
                        <Button
                            type="button"
                            className="h-10 flex-1"
                            disabled={!pin || busy !== null}
                            loading={busy === 'start'}
                            onClick={() => void act('start')}
                        >
                            <Power className="h-4 w-4" />
                            {t('turnOn')}
                        </Button>
                    ) : null}
                    {actions.includes('stop') ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 flex-1"
                            disabled={!pin || busy !== null}
                            loading={busy === 'stop'}
                            onClick={() => void act('stop')}
                        >
                            <PowerOff className="h-4 w-4" />
                            {t('turnOff')}
                        </Button>
                    ) : null}
                </div>
            ) : null}

            {error ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                    {error === 'wrongPin' ? t('wrongPin') : t('failed')}
                </p>
            ) : null}
        </section>
    );
}
