'use client';

import { BRAND } from '@/lib/brand';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type CreatorCreditProps = {
    /** Phone settings link to GitHub. TV stays plain text so D-pad never lands here. */
    linked?: boolean;
    tone?: 'default' | 'tv';
    className?: string;
};

export function CreatorCredit({ linked = true, tone = 'default', className }: CreatorCreditProps) {
    const t = useScopedI18n('credit');
    const { basedOn } = BRAND;

    const upstream = linked ? (
        <a
            href={basedOn.authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
        >
            {basedOn.authorHandle}
        </a>
    ) : (
        <span>{basedOn.authorHandle}</span>
    );

    return (
        <footer
            className={cn(
                tone === 'tv'
                    ? 'tv-settings-credit'
                    : 'px-1 text-center text-xs leading-relaxed text-muted-foreground',
                className,
            )}
        >
            <p className="font-semibold tracking-wide text-foreground/80">{BRAND.lockup}</p>
            <p>{t('tagline')}</p>
            <p>
                {t('bylinePrefix')} {upstream}
            </p>
        </footer>
    );
}
