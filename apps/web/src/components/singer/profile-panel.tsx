'use client';

import { useState } from 'react';
import { LogOut, Trophy, UserRoundCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    claimProfile,
    isValidPin,
    loginProfile,
    logoutProfile,
    ProfileError,
    profilesEnabled,
    type ProfileErrorCode,
} from '@/lib/profile-api';
import { setUserDisplayName } from '@/lib/device-label';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { useProfileDataStore } from '@/store/profileStore';
import { useSingerStore } from '@/store/singerStore';

import { ProfileSheet } from './profile-sheet';

type Mode = 'save' | 'login';

/** Inside "Your stage name": save this name with a PIN, log in, or open the profile. */
export function ProfilePanel() {
    const t = useScopedI18n('profile');
    const { profile, stageName, emoji, color, setProfile, setIdentity } = useSingerStore();
    const [mode, setMode] = useState<Mode>('save');
    const [name, setName] = useState('');
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ProfileErrorCode | 'pin_format' | null>(null);
    const [viewing, setViewing] = useState(false);

    if (!profilesEnabled()) return null;

    if (profile) {
        return (
            <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                    <UserRoundCheck className="h-4 w-4 text-primary" aria-hidden />
                    {t('savedAs', { name: profile.stageName })}
                </p>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 flex-1"
                        onClick={() => setViewing(true)}
                    >
                        <Trophy className="h-4 w-4" />
                        {t('open')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9"
                        onClick={() => {
                            void logoutProfile(profile.token).catch(() => undefined);
                            setProfile(null);
                            useProfileDataStore.getState().clear();
                        }}
                    >
                        <LogOut className="h-4 w-4" />
                        {t('logout')}
                    </Button>
                </div>
                <ProfileSheet open={viewing} onOpenChange={setViewing} />
            </div>
        );
    }

    const submit = async () => {
        setError(null);
        if (!isValidPin(pin)) return setError('pin_format');
        setBusy(true);
        try {
            const session =
                mode === 'save'
                    ? await claimProfile(stageName, pin, emoji, color)
                    : await loginProfile(name.trim(), pin);
            setProfile(session);
            setIdentity({ stageName: session.stageName });
            setUserDisplayName(session.stageName);
            setPin('');
            await useProfileDataStore.getState().refresh();
            const look = useProfileDataStore.getState().data?.profile;
            if (mode === 'login' && look) setIdentity({ emoji: look.emoji, color: look.color });
        } catch (caught) {
            setError(caught instanceof ProfileError ? caught.code : 'unavailable');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3 rounded-2xl border p-3">
            <div>
                <p className="text-sm font-medium">{t('title')}</p>
                <p className="text-xs text-muted-foreground">{t('pitch')}</p>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
                {(['save', 'login'] as const).map((option) => (
                    <button
                        key={option}
                        type="button"
                        role="tab"
                        aria-selected={mode === option}
                        onClick={() => {
                            setMode(option);
                            setError(null);
                        }}
                        className={cn(
                            'ahk-press h-8 rounded-lg text-xs font-medium',
                            mode === option ? 'bg-background shadow-sm' : 'text-muted-foreground',
                        )}
                    >
                        {option === 'save' ? t('tabSave') : t('tabLogin')}
                    </button>
                ))}
            </div>
            <form
                className="space-y-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                }}
            >
                {mode === 'save' ? (
                    <p className="text-xs text-muted-foreground">
                        {t('saveHint', { name: stageName })}
                    </p>
                ) : (
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        aria-label={t('namePlaceholder')}
                        autoComplete="username"
                    />
                )}
                <Input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder={t('pinPlaceholder')}
                    aria-label={t('pinPlaceholder')}
                    inputMode="numeric"
                    type="password"
                    autoComplete={mode === 'save' ? 'new-password' : 'current-password'}
                />
                {error ? (
                    <p className="text-xs text-destructive" role="alert">
                        {t(`error.${error}`)}
                    </p>
                ) : null}
                <Button
                    type="submit"
                    size="sm"
                    className="h-9 w-full"
                    disabled={busy || (mode === 'login' && !name.trim())}
                >
                    {mode === 'save' ? t('saveButton') : t('loginButton')}
                </Button>
                {mode === 'save' ? (
                    <p className="text-[11px] text-muted-foreground">{t('pinWarning')}</p>
                ) : null}
            </form>
        </div>
    );
}
