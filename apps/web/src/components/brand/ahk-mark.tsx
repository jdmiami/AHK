import type { CSSProperties } from 'react';

import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

type AhkMarkProps = {
    className?: string;
    style?: CSSProperties;
    /** Decorative by default; pass a label when the mark stands alone. */
    title?: string;
};

/**
 * Inline AHK monogram (same geometry as brand/ahk-mark.svg, without the blur filter so it
 * stays cheap on TV engines). Scale with width/height classes.
 */
export function AhkMark({ className, style, title }: AhkMarkProps) {
    return (
        <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-10 w-10 shrink-0', className)}
            style={style}
            role={title ? 'img' : undefined}
            aria-label={title}
            aria-hidden={title ? undefined : true}
        >
            <defs>
                <linearGradient id="ahk-neon" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FF2DAA" />
                    <stop offset="0.5" stopColor="#7C5CFF" />
                    <stop offset="1" stopColor="#22E6FF" />
                </linearGradient>
            </defs>
            <rect width="512" height="512" rx="112" fill="#07060B" />
            <g fill="none" stroke="url(#ahk-neon)" strokeWidth="48" strokeLinejoin="round">
                <path d="M62 366 L118 150 L174 366 M86 292 L150 292" />
                <path d="M226 146 V366 M318 146 V366 M226 256 H318" />
                <path d="M372 146 V366 M450 150 L372 262 L450 366" />
            </g>
        </svg>
    );
}

type BrandLockupProps = {
    className?: string;
    markClassName?: string;
    /** `tv` uses larger type for the lobby on a 3 m viewing distance. */
    size?: 'default' | 'tv';
};

/** Mark + wordmark + full name, used on the phone join lobby and the TV lobby. */
export function BrandLockup({ className, markClassName, size = 'default' }: BrandLockupProps) {
    const tv = size === 'tv';
    return (
        <div className={cn('flex items-center justify-center gap-3', className)}>
            <AhkMark className={cn(tv ? 'h-16 w-16' : 'h-10 w-10', markClassName)} />
            <div className="text-left leading-none">
                <p
                    className={cn(
                        'font-bold tracking-[0.18em] text-foreground',
                        tv ? 'text-3xl' : 'text-lg',
                    )}
                >
                    {BRAND.short}
                </p>
                <p
                    className={cn(
                        'mt-1 font-medium text-muted-foreground',
                        tv ? 'text-base' : 'text-[11px] tracking-wide',
                    )}
                >
                    {BRAND.full}
                </p>
            </div>
        </div>
    );
}
