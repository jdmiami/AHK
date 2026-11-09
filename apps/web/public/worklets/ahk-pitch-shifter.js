/*
 * AHK key changer: real-time pitch shift without changing speed.
 *
 * Classic dual-delay-line ("harmonizer") shifter: two read taps sweep through a short delay
 * window in opposite phase and are crossfaded with Hann weights (sin² + cos² = 1), so the
 * output keeps tempo while the pitch moves by `ratio` (2^(semitones/12)). Cheap: a few
 * multiply-adds per sample, no FFT. At ratio 1 the input passes straight through.
 */
const WINDOW_SECONDS = 0.06;
const BUFFER_SIZE = 1 << 16; // > max delay at 192 kHz
const MASK = BUFFER_SIZE - 1;

class AhkPitchShifter extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: 'ratio',
                defaultValue: 1,
                minValue: 0.5,
                maxValue: 2,
                automationRate: 'k-rate',
            },
        ];
    }

    constructor() {
        super();
        this.windowSamples = Math.max(64, Math.round(sampleRate * WINDOW_SECONDS));
        this.buffers = [];
        this.writeIndex = 0;
        this.phase = 0;
    }

    read(buffer, position) {
        const base = Math.floor(position);
        const frac = position - base;
        const a = buffer[base & MASK];
        const b = buffer[(base + 1) & MASK];
        return a + (b - a) * frac;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!output || output.length === 0) return true;
        const frames = output[0].length;

        if (!input || input.length === 0) {
            for (let c = 0; c < output.length; c += 1) output[c].fill(0);
            return true;
        }

        const channels = output.length;
        while (this.buffers.length < channels) this.buffers.push(new Float32Array(BUFFER_SIZE));

        const start = this.writeIndex;
        for (let c = 0; c < channels; c += 1) {
            const source = input[c] || input[0];
            const buffer = this.buffers[c];
            for (let i = 0; i < frames; i += 1) buffer[(start + i) & MASK] = source[i];
        }
        this.writeIndex = (start + frames) & MASK;

        const ratio = parameters.ratio[0];
        if (Math.abs(ratio - 1) < 1e-4) {
            for (let c = 0; c < channels; c += 1) output[c].set(input[c] || input[0]);
            return true;
        }

        const W = this.windowSamples;
        const step = (1 - ratio) / W;
        let phase = this.phase;
        for (let i = 0; i < frames; i += 1) {
            const writePos = start + i;
            const p1 = phase;
            const p2 = phase + 0.5 < 1 ? phase + 0.5 : phase - 0.5;
            const s1 = Math.sin(Math.PI * p1);
            const s2 = Math.sin(Math.PI * p2);
            const g1 = s1 * s1;
            const g2 = s2 * s2;
            const d1 = writePos - (p1 * W + 1);
            const d2 = writePos - (p2 * W + 1);
            for (let c = 0; c < channels; c += 1) {
                const buffer = this.buffers[c];
                output[c][i] = this.read(buffer, d1) * g1 + this.read(buffer, d2) * g2;
            }
            phase += step;
            phase -= Math.floor(phase);
        }
        this.phase = phase;
        return true;
    }
}

registerProcessor('ahk-pitch-shifter', AhkPitchShifter);
