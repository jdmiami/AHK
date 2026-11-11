/**
 * The announcer's voice: the browser's speech synthesis, picking the best "host" voice the
 * laptop has (natural Microsoft/Google voices first). Falls back to a timed pause if the
 * browser has no voices, so the show keeps its rhythm either way.
 */
import type { HostLocale } from './script';

const PREFERRED: Record<HostLocale, RegExp[]> = {
    en: [
        /Guy.*Natural/i,
        /Andrew.*Natural/i,
        /Christopher.*Natural/i,
        /Brian.*Natural/i,
        /Google UK English Male/i,
        /Google US English/i,
        /Daniel/i,
        /Alex/i,
    ],
    es: [/Alvaro.*Natural/i, /Jorge.*Natural/i, /Google español/i, /Jorge/i, /Diego/i, /Paulina/i],
};

function synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis
        : null;
}

export function pickHostVoice(locale: HostLocale): SpeechSynthesisVoice | null {
    const voices = synth()?.getVoices() ?? [];
    for (const pattern of PREFERRED[locale]) {
        const voice = voices.find(
            (v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith(locale),
        );
        if (voice) return voice;
    }
    return voices.find((v) => v.lang.toLowerCase().startsWith(locale)) ?? null;
}

/** Rough speaking time, used when speech is unavailable and as a safety timeout. */
export function estimateSpeechMs(text: string): number {
    return 900 + text.length * 65;
}

/** Say `text`; resolves when done (or after a safety timeout). */
export function speak(text: string, locale: HostLocale): Promise<void> {
    const s = synth();
    const fallback = estimateSpeechMs(text);
    if (!s || typeof SpeechSynthesisUtterance === 'undefined') {
        return new Promise((resolve) => setTimeout(resolve, fallback));
    }
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(finish, fallback * 2 + 2000);
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickHostVoice(locale);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? (locale === 'es' ? 'es-ES' : 'en-US');
        utterance.rate = 1.02;
        utterance.pitch = 0.9;
        utterance.volume = 1;
        utterance.onend = finish;
        utterance.onerror = finish;
        // No voices at all (some headless browsers): keep the timing, skip the sound.
        if (s.getVoices().length === 0) {
            setTimeout(finish, fallback);
            return;
        }
        s.speak(utterance);
    });
}

export function stopSpeaking(): void {
    synth()?.cancel();
}

/** Voices load asynchronously in Chrome; call once early so the first line uses the right one. */
export function warmUpVoices(): void {
    const s = synth();
    if (!s) return;
    s.getVoices();
    s.addEventListener?.('voiceschanged', () => s.getVoices(), { once: true });
}
