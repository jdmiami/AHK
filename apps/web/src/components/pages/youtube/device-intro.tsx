'use client';

import { useRouter } from 'next/navigation';
import { MonitorPlay, Smartphone } from 'lucide-react';

import { BrandLockup } from '@/components/brand/ahk-mark';
import { HostPowerPanel } from '@/components/host/host-power-panel';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLayoutModeChange } from '@/hooks/use-layout-mode-change';
import { buildTvPublicPath, type AppLocale } from '@/lib/locale-path';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type ChoiceCardProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    accent: 'primary' | 'cyan';
    onSelect: () => void;
    /** Position in the entrance cascade. */
    order: number;
};

/** Inline custom property for the staggered `.ahk-enter` cascade. */
const stagger = (i: number) => ({ '--ahk-i': i }) as React.CSSProperties;

function ChoiceCard({ icon, title, description, accent, onSelect, order }: ChoiceCardProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            style={stagger(order)}
            className={cn(
                'ahk-enter ahk-press group flex w-full items-center gap-4 rounded-2xl border bg-card/80 p-5 text-left shadow-sm backdrop-blur-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                accent === 'primary'
                    ? 'border-primary/40 hover:border-primary hover:shadow-[var(--ahk-glow-primary)]'
                    : 'border-neon-cyan/40 hover:border-neon-cyan hover:shadow-[var(--ahk-glow-secondary)]',
            )}
        >
            <span
                className={cn(
                    'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-active:scale-95',
                    accent === 'primary'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-neon-cyan/15 text-neon-cyan',
                )}
                aria-hidden
            >
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block text-lg font-semibold text-foreground">{title}</span>
                <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                    {description}
                </span>
            </span>
        </button>
    );
}

/**
 * First screen on a new device: "Is this the big screen or a phone?"
 * The host's laptop/TV goes to the TV display (creates the room and shows the QR);
 * phones go to the join lobby. The choice is remembered; the mode switch at the bottom
 * of the lobby changes it later.
 */
export function DeviceIntro() {
    const t = useScopedI18n('deviceIntro');
    const router = useRouter();
    const locale = useCurrentLocale() as AppLocale;
    const { changeLayoutMode } = useLayoutModeChange();

    const chooseHost = () => {
        changeLayoutMode('player');
        router.push(buildTvPublicPath(locale));
    };

    const chooseGuest = () => {
        changeLayoutMode('remote');
    };

    return (
        <div className="relative min-h-dvh-screen overflow-y-auto overflow-x-hidden bg-background">
            <div className="ahk-ambient" aria-hidden />
            <div className="relative z-[1] mx-auto flex w-full max-w-md flex-col px-4 pb-safe-offset pt-safe-offset sm:max-w-lg sm:px-6">
                <div className="mb-6 flex justify-end">
                    <LanguageSwitcher />
                </div>

                <BrandLockup className="mb-8" animated />

                <header className="ahk-enter mb-6 space-y-2 text-center" style={stagger(3)}>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {t('title')}
                    </h1>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
                </header>

                <div className="space-y-3">
                    <ChoiceCard
                        icon={<MonitorPlay className="h-7 w-7" />}
                        title={t('hostTitle')}
                        description={t('hostDescription')}
                        accent="primary"
                        onSelect={chooseHost}
                        order={4}
                    />
                    <ChoiceCard
                        icon={<Smartphone className="h-7 w-7" />}
                        title={t('guestTitle')}
                        description={t('guestDescription')}
                        accent="cyan"
                        onSelect={chooseGuest}
                        order={5}
                    />
                </div>

                {/* The host sees whether the house (API) is on before heading to the big screen. */}
                <div className="ahk-enter" style={stagger(6)}>
                    <HostPowerPanel className="mt-6" />
                </div>

                <p
                    className="ahk-enter mt-6 text-center text-xs text-muted-foreground"
                    style={stagger(7)}
                >
                    {t('footnote')}
                </p>
            </div>
        </div>
    );
}
