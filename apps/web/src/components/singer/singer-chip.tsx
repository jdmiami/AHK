'use client';

import type { Singer } from '@vkara/room';

import { cn } from '@/lib/utils';

/** "🎤 Velvet Falcon" in the singer's color. */
export function SingerChip({
    singer,
    className,
    size = 'sm',
    suffix,
}: {
    singer: Pick<Singer, 'stageName' | 'emoji' | 'color'>;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    suffix?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full border font-medium',
                size === 'sm' && 'px-2 py-0.5 text-[11px]',
                size === 'md' && 'px-2.5 py-1 text-xs',
                size === 'lg' && 'px-4 py-1.5 text-lg',
                className,
            )}
            style={{
                color: singer.color,
                borderColor: `${singer.color}66`,
                backgroundColor: `${singer.color}1a`,
            }}
        >
            <span aria-hidden>{singer.emoji}</span>
            <span className="truncate">{singer.stageName}</span>
            {suffix ? <span className="shrink-0 opacity-80">{suffix}</span> : null}
        </span>
    );
}
