import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import '@/app/tv-root-scale.css';
import '@/app/tv-tokens.css';
import { TvRootScale } from '@/components/pages/tv/tv-root-scale';

export const metadata: Metadata = {
    title: 'AHK TV',
    description: 'TV display for AHK · Artist House Karaoke rooms',
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#07060b',
};

export default function TvLayout({ children }: { children: ReactNode }) {
    return (
        <div className="dark h-full min-h-dvh-screen bg-[#07060b] text-white" data-tv-route>
            {/* Apply before paint to avoid rem flash; TvRootScale clears on leave. */}
            <script
                dangerouslySetInnerHTML={{
                    __html: "document.documentElement.classList.add('tv-root-scale')",
                }}
            />
            <TvRootScale />
            {children}
        </div>
    );
}
