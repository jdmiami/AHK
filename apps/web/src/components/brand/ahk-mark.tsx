import type { CSSProperties } from 'react';

import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

type AhkMarkProps = {
    className?: string;
    style?: CSSProperties;
    /** Decorative by default; pass a label when the mark stands alone. */
    title?: string;
    /** Draw the letters in once on mount (CSS only; skipped with reduced motion). */
    animated?: boolean;
};

/**
 * Inline AHK monogram (same geometry as brand/ahk-mark.svg, without the blur filter so it
 * stays cheap on TV engines). Scale with width/height classes.
 */
export function AhkMark({ className, style, title, animated = false }: AhkMarkProps) {
    return (
        <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-10 w-10 shrink-0', animated && 'ahk-mark-draw', className)}
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
                <path pathLength={1} d="M62 366 L118 150 L174 366 M86 292 L150 292" />
                <path pathLength={1} d="M226 146 V366 M318 146 V366 M226 256 H318" />
                <path pathLength={1} d="M372 146 V366 M450 150 L372 262 L450 366" />
            </g>
        </svg>
    );
}

type BrandLockupProps = {
    className?: string;
    markClassName?: string;
    /** `tv` uses larger type for the lobby on a 3 m viewing distance. */
    size?: 'default' | 'tv';
    /** Draw the mark in and fade the name up on mount. */
    animated?: boolean;
};

/**
 * Mark + full name. The mark already reads "AHK", so the name next to it is the long form
 * only (never "AHK" twice).
 */
export function BrandLockup({
    className,
    markClassName,
    size = 'default',
    animated = false,
}: BrandLockupProps) {
    const tv = size === 'tv';
    const words = BRAND.full.split(' ');
    const lastWord = words.pop();
    return (
        <div
            className={cn('flex items-center justify-center gap-3', className)}
            role="img"
            aria-label={BRAND.lockup}
        >
            <span className={cn('relative inline-flex', animated && 'ahk-mark-halo')}>
                <AhkMark
                    animated={animated}
                    className={cn(tv ? 'h-16 w-16' : 'h-11 w-11', markClassName)}
                />
            </span>
            <p
                className={cn(
                    'text-left font-semibold leading-[1.1] tracking-tight text-foreground',
                    tv ? 'text-3xl' : 'text-lg',
                    animated && 'ahk-enter',
                )}
                style={animated ? ({ '--ahk-i': 2 } as CSSProperties) : undefined}
                aria-hidden
            >
                {words.join(' ')}
                <span className="block bg-gradient-to-r from-neon-pink via-neon-violet to-neon-cyan bg-clip-text text-transparent">
                    {lastWord}
                </span>
            </p>
        </div>
    );
}
