/**
 * Same-origin channel between the big-screen tab and the key-changer window
 * (`/key-engine.html`). The window captures this tab's audio, shifts the pitch and plays it.
 */
export const KEY_ENGINE_CHANNEL = 'ahk-key-engine';
export const KEY_ENGINE_WINDOW_NAME = 'ahk-key-engine';
/** The engine posts a heartbeat this often while it is processing audio. */
export const KEY_ENGINE_HEARTBEAT_MS = 1_500;
/** Treat the engine as gone when no heartbeat arrived for this long. */
export const KEY_ENGINE_STALE_MS = 4_500;

export type KeyEngineToEngine = { type: 'key'; semitones: number };
export type KeyEngineFromEngine =
    | { type: 'hello' }
    | { type: 'status'; active: boolean }
    | { type: 'heartbeat' };

/** Desktop Chromium with tab-audio capture and AudioWorklet (not TV engines or phones). */
export function supportsKeyEngine(): boolean {
    if (typeof window === 'undefined') return false;
    const nav = window.navigator;
    const hasCapture = Boolean(nav.mediaDevices && 'getDisplayMedia' in nav.mediaDevices);
    const hasWorklet = typeof window.AudioWorkletNode === 'function';
    const hasChannel = typeof window.BroadcastChannel === 'function';
    const isMobile = /Android|iPhone|iPad|Mobile|SmartTV|Tizen|Web0S|CrKey|AFT/i.test(
        nav.userAgent,
    );
    return hasCapture && hasWorklet && hasChannel && !isMobile;
}

export function keyEngineUrl(locale: string): string {
    return `/key-engine.html?lang=${locale === 'es' ? 'es' : 'en'}`;
}

export function openKeyEngineWindow(locale: string): Window | null {
    return window.open(keyEngineUrl(locale), KEY_ENGINE_WINDOW_NAME, 'popup,width=420,height=560');
}
