'use client';

import { useCallback, useEffect, useState } from 'react';

import { getDeviceLabel, getUserDisplayName, setUserDisplayName } from '@/lib/device-label';
import { useWebSocket } from '@/providers/websocket-provider';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useScopedI18n } from '@/locales/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDeviceId } from '@/lib/device-id';
import { useRenameStageName } from '@/hooks/use-rename-stage-name';
import { useSingerStore } from '@/store/singerStore';

type DeviceDisplayNameFieldProps = {
    className?: string;
};

/**
 * Personal device label — document-flow form so the settings ScrollArea and the
 * browser can keep the field visible when the mobile keyboard opens.
 */
export function DeviceDisplayNameField({ className }: DeviceDisplayNameFieldProps) {
    const tRoom = useScopedI18n('roomSettings');
    const tProfile = useScopedI18n('profile');
    const tSinger = useScopedI18n('singer');
    const roomId = useYouTubeStore((s) => s.room?.id);
    // Phones sing: their name here is their stage name, kept the same everywhere.
    const isPhone = useYouTubeStore((s) => {
        const id = getDeviceId();
        const me = id ? s.room?.participants?.[id] : undefined;
        return Boolean(me && !me.isTvConnection && !me.isAgent);
    });
    const stageName = useSingerStore((s) => s.stageName);
    const rename = useRenameStageName();
    const { ensureConnectedAndSend } = useWebSocket();
    const autoLabel = getDeviceLabel();
    const [value, setValue] = useState(() => getUserDisplayName() ?? '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setValue(isPhone ? stageName : (getUserDisplayName() ?? ''));
    }, [roomId, isPhone, stageName]);

    const save = useCallback(() => {
        if (isPhone) {
            setError(null);
            void rename(value).then((code) => {
                if (!code) return;
                setError(tProfile(`error.${code}`));
                setValue(useSingerStore.getState().stageName);
            });
            return;
        }
        const trimmed = value.trim().slice(0, 40);
        setUserDisplayName(trimmed);
        const next = trimmed || getDeviceLabel();
        if (roomId) {
            ensureConnectedAndSend({ type: 'setDisplayName', displayName: next });
        }
        setValue(trimmed);
    }, [value, roomId, ensureConnectedAndSend, isPhone, rename, tProfile]);

    return (
        <div className={cn('space-y-2', className)}>
            <div className="space-y-1">
                <Label htmlFor="device-display-name" className="text-sm font-medium">
                    {tRoom('yourDisplayName')}
                </Label>
                <p className="text-xs text-muted-foreground">
                    {isPhone ? tSinger('nameEverywhere') : tRoom('yourDisplayNameHintShort')}
                </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    id="device-display-name"
                    value={value}
                    onChange={(event) => setValue(event.target.value.slice(0, 40))}
                    placeholder={isPhone ? undefined : autoLabel}
                    maxLength={isPhone ? 32 : 40}
                    autoComplete="nickname"
                    enterKeyHint="done"
                    inputMode="text"
                    // text-base on mobile avoids iOS focus zoom; md:text-sm matches settings density.
                    className="min-h-11 text-base sm:min-h-9 sm:text-sm"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            save();
                            event.currentTarget.blur();
                        }
                    }}
                />
                <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 shrink-0 sm:min-h-9"
                    onClick={save}
                >
                    {tRoom('saveDisplayName')}
                </Button>
            </div>
            {error ? (
                <p className="text-xs text-destructive" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
