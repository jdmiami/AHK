/**
 * Big-screen sound for the announcer: synthesized applause, an intro chime and a lounge loop.
 * Everything is generated with Web Audio (no audio files, nothing licensed).
 * Browsers only allow sound after a click on the page; call `unlockHostAudio` from a gesture.
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): { ctx: Ctx; master: GainNode } | null {
    if (typeof window === 'undefined') return null;
    const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    if (!ctx) {
        ctx = new AudioCtor();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
    }
    return { ctx, master: master! };
}

export function unlockHostAudio(): void {
    const a = audio();
    if (a && a.ctx.state === 'suspended') void a.ctx.resume().catch(() => undefined);
}

/** Sound and speech are allowed: the audio engine runs and the page has had a click or key press. */
export function hostAudioReady(): boolean {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
        .userActivation;
    return Boolean(
        ctx && ctx.state === 'running' && (activation ? activation.hasBeenActive : true),
    );
}

function noiseBuffer(c: Ctx): AudioBuffer {
    if (noise && noise.sampleRate === c.sampleRate) return noise;
    const length = c.sampleRate; // 1 s
    noise = c.createBuffer(1, length, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return noise;
}

function panTo(c: Ctx, input: AudioNode, out: AudioNode, pan: number): void {
    if (typeof c.createStereoPanner === 'function') {
        const panner = c.createStereoPanner();
        panner.pan.value = pan;
        input.connect(panner).connect(out);
    } else {
        input.connect(out);
    }
}

/** Crowd applause, rising fast and tailing off. Resolves when it ends. */
export function playApplause(seconds = 4.5): Promise<void> {
    const a = audio();
    if (!a || a.ctx.state !== 'running') return Promise.resolve();
    const { ctx: c, master: out } = a;
    const buffer = noiseBuffer(c);
    const t0 = c.currentTime + 0.05;
    const end = t0 + seconds;

    const bus = c.createGain();
    bus.gain.value = 0.9;
    bus.connect(out);

    // Room bed under the claps.
    const bed = c.createBufferSource();
    bed.buffer = buffer;
    bed.loop = true;
    const bedFilter = c.createBiquadFilter();
    bedFilter.type = 'bandpass';
    bedFilter.frequency.value = 1400;
    bedFilter.Q.value = 0.6;
    const bedGain = c.createGain();
    bedGain.gain.setValueAtTime(0, t0);
    bedGain.gain.linearRampToValueAtTime(0.12, t0 + 0.4);
    bedGain.gain.setValueAtTime(0.12, end - 1.6);
    bedGain.gain.linearRampToValueAtTime(0, end);
    bed.connect(bedFilter).connect(bedGain).connect(bus);
    bed.start(t0);
    bed.stop(end + 0.1);

    // Individual claps: density ramps up, holds, then thins out.
    let t = t0;
    while (t < end) {
        const progress = (t - t0) / seconds;
        const density =
            progress < 0.12
                ? 8 + progress * 300
                : progress > 0.62
                  ? 3 + 42 * ((1 - progress) / 0.38)
                  : 45;
        t += -Math.log(1 - Math.random()) / density;
        if (t >= end) break;
        const src = c.createBufferSource();
        src.buffer = buffer;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900 + Math.random() * 1700;
        filter.Q.value = 0.9 + Math.random() * 1.4;
        const env = c.createGain();
        const peak =
            (0.18 + Math.random() * 0.32) * (progress > 0.62 ? (1 - progress) / 0.38 + 0.25 : 1);
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(peak, t + 0.002);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.05);
        src.connect(filter).connect(env);
        panTo(c, env, bus, Math.random() * 1.6 - 0.8);
        src.start(t, Math.random() * 0.85, 0.12);
    }

    // A couple of whistles from the crowd.
    for (let i = 0; i < 2; i++) {
        const at = t0 + 0.6 + Math.random() * (seconds * 0.45);
        const osc = c.createOscillator();
        osc.type = 'sine';
        const base = 1900 + Math.random() * 500;
        osc.frequency.setValueAtTime(base, at);
        osc.frequency.linearRampToValueAtTime(base * 1.25, at + 0.18);
        osc.frequency.setValueAtTime(base * 1.25, at + 0.4);
        osc.frequency.linearRampToValueAtTime(base * 1.05, at + 0.6);
        const env = c.createGain();
        env.gain.setValueAtTime(0.0001, at);
        env.gain.exponentialRampToValueAtTime(0.035, at + 0.05);
        env.gain.setValueAtTime(0.035, at + 0.45);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.65);
        osc.connect(env);
        panTo(c, env, bus, Math.random() - 0.5);
        osc.start(at);
        osc.stop(at + 0.7);
    }

    return new Promise((resolve) => setTimeout(resolve, (seconds + 0.1) * 1000));
}

function note(
    c: Ctx,
    out: AudioNode,
    freq: number,
    at: number,
    length: number,
    peak: number,
    type: OscillatorType,
) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.05);
}

/** Short bright chime before the announcer introduces the next singer. */
export function playIntroSting(): Promise<void> {
    const a = audio();
    if (!a || a.ctx.state !== 'running') return Promise.resolve();
    const { ctx: c, master: out } = a;
    const t0 = c.currentTime + 0.03;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        note(c, out, f, t0 + i * 0.09, 0.9, 0.12, 'triangle');
        note(c, out, f * 2, t0 + i * 0.09, 0.4, 0.03, 'sine');
    });
    return new Promise((resolve) => setTimeout(resolve, 700));
}

const mtof = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Four-bar lounge progressions (MIDI chord tones, bass root). */
const PROGRESSIONS: Array<Array<{ chord: number[]; bass: number }>> = [
    [
        { chord: [57, 60, 64, 65], bass: 41 }, // Fmaj7
        { chord: [57, 60, 62, 65], bass: 38 }, // Dm9-ish
        { chord: [57, 58, 62, 65], bass: 43 }, // Gm9
        { chord: [58, 62, 64, 69], bass: 36 }, // C13
    ],
    [
        { chord: [57, 58, 62, 65], bass: 46 }, // Bbmaj7
        { chord: [55, 60, 64, 67], bass: 45 }, // Am7
        { chord: [57, 58, 62, 65], bass: 43 }, // Gm7
        { chord: [58, 60, 64, 67], bass: 36 }, // C7
    ],
];
const COMP = [
    [1, 0, 0, 1, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0],
];
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81]; // F major pentatonic, upper register

/** Soft looping lounge music for the gaps between songs. */
export class LoungeMusic {
    private gain: GainNode | null = null;
    private timer: ReturnType<typeof setInterval> | null = null;
    private nextTime = 0;
    private step = 0;
    private level = 0.16;
    private ducked = false;

    get playing(): boolean {
        return this.timer !== null;
    }

    start(): void {
        const a = audio();
        if (!a || a.ctx.state !== 'running' || this.timer) return;
        const { ctx: c, master: out } = a;
        this.gain = c.createGain();
        this.gain.gain.setValueAtTime(0.0001, c.currentTime);
        this.gain.gain.linearRampToValueAtTime(this.target(), c.currentTime + 2.5);
        this.gain.connect(out);
        this.nextTime = c.currentTime + 0.1;
        this.step = 0;
        this.timer = setInterval(() => this.schedule(c), 60);
    }

    stop(fadeSeconds = 1.5): void {
        if (!this.timer || !ctx || !this.gain) return;
        clearInterval(this.timer);
        this.timer = null;
        const gain = this.gain;
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
        setTimeout(() => gain.disconnect(), (fadeSeconds + 1.5) * 1000);
        this.gain = null;
    }

    /** Lower the music while the announcer talks. */
    duck(on: boolean): void {
        this.ducked = on;
        if (!this.gain || !ctx) return;
        const now = ctx.currentTime;
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setValueAtTime(this.gain.gain.value, now);
        this.gain.gain.linearRampToValueAtTime(this.target(), now + 0.4);
    }

    private target(): number {
        return this.ducked ? this.level * 0.3 : this.level;
    }

    private schedule(c: Ctx): void {
        const eighth = 60 / 96 / 2;
        while (this.nextTime < c.currentTime + 0.35) {
            this.play(c, this.step, this.nextTime, eighth);
            this.nextTime += eighth;
            this.step += 1;
        }
    }

    private play(c: Ctx, step: number, at: number, eighth: number): void {
        const out = this.gain;
        if (!out) return;
        const bar = Math.floor(step / 8);
        const beat = step % 8;
        const progression = PROGRESSIONS[Math.floor(bar / 4) % PROGRESSIONS.length]!;
        const { chord, bass } = progression[bar % 4]!;

        // Electric-piano comping (bossa pattern).
        if (COMP[bar % 2]![beat]) {
            for (const midi of chord) {
                note(c, out, mtof(midi), at, 1.1, 0.045, 'sine');
                note(c, out, mtof(midi) * 2, at, 0.25, 0.01, 'sine');
            }
        }
        // Bass: root on 1, fifth on 3, approach note at the end of the bar.
        if (beat === 0) note(c, out, mtof(bass), at, eighth * 3, 0.16, 'triangle');
        if (beat === 4) note(c, out, mtof(bass + 7), at, eighth * 2.5, 0.12, 'triangle');
        if (beat === 7) note(c, out, mtof(bass + 5), at, eighth * 0.9, 0.08, 'triangle');
        // Shaker.
        const buffer = noiseBuffer(c);
        const src = c.createBufferSource();
        src.buffer = buffer;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const env = c.createGain();
        const accent = beat % 2 === 1 ? 0.05 : 0.025;
        env.gain.setValueAtTime(0.0001, at);
        env.gain.exponentialRampToValueAtTime(accent, at + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
        src.connect(hp).connect(env).connect(out);
        src.start(at, Math.random() * 0.9, 0.06);
        // Sparse vibraphone melody.
        if ((beat === 0 || beat === 3 || beat === 6) && Math.random() < 0.45) {
            const midi = SCALE[Math.floor(Math.random() * SCALE.length)]!;
            note(c, out, mtof(midi), at, 1.4, 0.035, 'sine');
            note(c, out, mtof(midi) * 4, at, 0.15, 0.008, 'sine');
        }
    }
}
