'use client';

import { useEffect, useState } from 'react';

export function useViewportSize(): { width: number; height: number } {
    const [size, setSize] = useState(() =>
        typeof window === 'undefined'
            ? { width: 1920, height: 1080 }
            : { width: window.innerWidth, height: window.innerHeight },
    );
    useEffect(() => {
        const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return size;
}
