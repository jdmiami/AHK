'use client';

import { useEffect, useState } from 'react';
import { Coffee, Dices, Pencil, SkipForward, Undo2 } from 'lucide-react';
import { SINGER_COLORS, SINGER_EMOJIS, STAGE_NAME_MAX } from '@vkara/room';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMySinger } from '@/hooks/use-singer';
import { randomStageName } from '@/lib/stage-names';
import { cn } from '@/lib/utils';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { useWebSocket } from '@/providers/websocket-provider';
import { useRenameStageName } from '@/hooks/use-rename-stage-name';
import { useSingerStore } from '@/store/singerStore';

import { ProfilePanel } from './profile-panel';

/** This phone's place in the rotation, with sit out / skip my turn / edit. */
export function SingerCard({ className, extra }: { className?: string; extra?: React.ReactNode }) {
    const t = useScopedI18n('singer');
    const { me, standing } = useMySinger();
    const { stageName, emoji, color } = useSingerStore();
    const { ensureConnectedAndSend } = useWebSocket();
    const [editing, setEditing] = useState(false);

    const name = me?.stageName || stageName;
    const look = { emoji: me?.emoji || emoji || '🎤', color: me?.color || color || '#FF2DAA' };
    const paused = Boolean(me?.paused);

    const status = standing?.isSinging
        ? t('statusSinging')
        : paused
          ? t('statusPaused', { count: standing?.queuedCount ?? 0 })
          : standing?.position
            ? t('statusPosition', { position: standing.position })
            : t('statusEmpty');

    return (
        <section
            className={cn(
                'ahk-enter rounded-2xl border bg-card/80 p-3 shadow-sm',
                standing?.isSinging && 'shadow-[var(--ahk-glow-primary)]',
                className,
            )}
            style={{ borderColor: `${look.color}66` }}
            aria-label={t('cardLabel')}
        >
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="ahk-press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: `${look.color}26` }}
                    aria-label={t('edit')}
                >
                    {look.emoji}
                </button>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold" style={{ color: look.color }}>
                        {name}
                    </p>
                    <p className="text-xs text-muted-foreground">{status}</p>
                </div>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(true)}
                    aria-label={t('edit')}
                >
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
            <div className="mt-3 flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1"
                    onClick={() =>
                        ensureConnectedAndSend({ type: 'setSingerPaused', paused: !paused })
                    }
                >
                    {paused ? <Undo2 className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                    {paused ? t('comeBack') : t('sitOut')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1"
                    disabled={!standing?.position || paused}
                    onClick={() => ensureConnectedAndSend({ type: 'skipMyTurn' })}
                >
                    <SkipForward className="h-4 w-4" />
                    {t('skipTurn')}
                </Button>
            </div>
            <SingerEditSheet open={editing} onOpenChange={setEditing} extra={extra} />
        </section>
    );
}

function SingerEditSheet({
    open,
    onOpenChange,
    extra,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    extra?: React.ReactNode;
}) {
    const t = useScopedI18n('singer');
    const locale = useCurrentLocale();
    const tProfile = useScopedI18n('profile');
    const { stageName, emoji, color, profile, setIdentity } = useSingerStore();
    const rename = useRenameStageName();
    const [draft, setDraft] = useState(stageName);
    const [nameError, setNameError] = useState<string | null>(null);
    // A profile login or a rename elsewhere replaces the name while the sheet is open.
    useEffect(() => setDraft(stageName), [stageName]);

    const commitName = async (next: string) => {
        setNameError(null);
        if (!next.trim() || next.trim() === stageName) return true;
        const error = await rename(next);
        if (!error) return true;
        setNameError(tProfile(`error.${error}`));
        setDraft(useSingerStore.getState().stageName);
        return false;
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) setDraft(stageName);
                onOpenChange(next);
            }}
        >
            <DialogContent
                overlayClassName="z-[80]"
                className="bottom-0 top-auto z-[80] max-h-[90dvh] max-w-lg translate-y-0 gap-5 overflow-y-auto rounded-t-3xl p-5 pb-safe-offset sm:bottom-4 sm:rounded-3xl"
            >
                <div className="space-y-1 pr-8">
                    <DialogTitle>{t('editTitle')}</DialogTitle>
                    <DialogDescription>{t('editHint')}</DialogDescription>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="ahk-stage-name">
                        {t('stageName')}
                    </label>
                    <div className="flex gap-2">
                        <Input
                            id="ahk-stage-name"
                            value={draft}
                            maxLength={STAGE_NAME_MAX}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => void commitName(draft)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            aria-invalid={nameError ? true : undefined}
                            enterKeyHint="done"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t('randomName')}
                            onClick={() => {
                                const name = randomStageName(locale);
                                setDraft(name);
                                void commitName(name);
                            }}
                        >
                            <Dices className="h-4 w-4" />
                        </Button>
                    </div>
                    {nameError ? (
                        <p className="text-xs text-destructive" role="alert">
                            {nameError}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            {profile ? tProfile('renameHint') : t('nameEverywhere')}
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium">{t('emoji')}</p>
                    <div className="grid grid-cols-6 gap-2">
                        {SINGER_EMOJIS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setIdentity({ emoji: option })}
                                className={cn(
                                    'ahk-press flex h-11 items-center justify-center rounded-xl border text-xl',
                                    option === emoji
                                        ? 'border-primary bg-primary/15'
                                        : 'border-border',
                                )}
                                aria-pressed={option === emoji}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium">{t('color')}</p>
                    <div className="flex flex-wrap gap-2">
                        {SINGER_COLORS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setIdentity({ color: option })}
                                className={cn(
                                    'ahk-press h-9 w-9 rounded-full border-2',
                                    option === color ? 'border-foreground' : 'border-transparent',
                                )}
                                style={{ backgroundColor: option }}
                                aria-label={option}
                                aria-pressed={option === color}
                            />
                        ))}
                    </div>
                </div>
                <ProfilePanel />
                {extra}
                <Button
                    type="button"
                    className="h-11"
                    onClick={() => {
                        void commitName(draft).then((ok) => ok && onOpenChange(false));
                    }}
                >
                    {t('done')}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
