'use client';

import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { effectiveSongAdjust } from '@vkara/room';
import { isTikTokVideo } from '@vkara/tiktok';

import { useKeyEngineBridge } from '@/hooks/use-key-engine-bridge';
import { openKeyEngineWindow, supportsKeyEngine } from '@/lib/key-engine-bridge';
import { cn } from '@/lib/utils';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * Big-screen prompt for the key changer. Appears only when a phone picked a key other than
 * the original and the engine is not running yet; one click opens the key-changer window.
 */
export function KeyEngineLauncher() {
    const t = useScopedI18n('keyEngine');
    const locale = useCurrentLocale();
    const { active } = useKeyEngineBridge();
    const semitones = useYouTubeStore((s) => effectiveSongAdjust(s.room).semitones);
    const playing = useYouTubeStore((s) => s.room?.playingNow ?? null);
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        setSupported(supportsKeyEngine());
    }, []);

    if (!supported || active || semitones === 0 || !playing || isTikTokVideo(playing)) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => openKeyEngineWindow(locale)}
            className={cn(
                'ahk-enter ahk-press absolute right-4 top-4 z-30 flex max-w-xs items-center gap-3 rounded-2xl border border-neon-cyan/50 bg-black/80 px-4 py-3 text-left text-white shadow-[var(--ahk-glow-secondary)] backdrop-blur',
            )}
        >
            <Music2 className="h-6 w-6 shrink-0 text-neon-cyan" aria-hidden />
            <span>
                <span className="block text-sm font-semibold">{t('launchTitle')}</span>
                <span className="block text-xs text-zinc-300">{t('launchHint')}</span>
            </span>
        </button>
    );
}
