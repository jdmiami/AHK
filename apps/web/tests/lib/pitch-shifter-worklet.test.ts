import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type Processor = {
    process: (
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        params: { ratio: Float32Array },
    ) => boolean;
};

const SAMPLE_RATE = 48_000;

function loadProcessor(): new () => Processor {
    const source = readFileSync(
        join(__dirname, '../../public/worklets/ahk-pitch-shifter.js'),
        'utf8',
    );
    let registered: (new () => Processor) | null = null;
    runInNewContext(source, {
        sampleRate: SAMPLE_RATE,
        AudioWorkletProcessor: class {},
        registerProcessor: (_name: string, ctor: new () => Processor) => {
            registered = ctor;
        },
        Math,
        Float32Array,
    });
    if (!registered) throw new Error('processor not registered');
    return registered;
}

/** Runs a sine through the shifter and estimates the output frequency from zero crossings. */
function shiftedFrequency(semitones: number, inputHz = 440): number {
    const Shifter = loadProcessor();
    const processor = new Shifter();
    const ratio = new Float32Array([2 ** (semitones / 12)]);
    const block = 128;
    const seconds = 1.5;
    const out: number[] = [];
    for (let start = 0; start < SAMPLE_RATE * seconds; start += block) {
        const input = new Float32Array(block);
        for (let i = 0; i < block; i += 1) {
            input[i] = Math.sin((2 * Math.PI * inputHz * (start + i)) / SAMPLE_RATE);
        }
        const output = new Float32Array(block);
        processor.process([[input]], [[output]], { ratio });
        out.push(...output);
    }
    const tail = out.slice(SAMPLE_RATE * 0.5);
    let crossings = 0;
    for (let i = 1; i < tail.length; i += 1) {
        if (tail[i - 1]! < 0 && tail[i]! >= 0) crossings += 1;
    }
    return crossings / (tail.length / SAMPLE_RATE);
}

describe('ahk-pitch-shifter worklet', () => {
    it('passes audio through unchanged at 0 semitones', () => {
        expect(shiftedFrequency(0)).toBeCloseTo(440, -1);
    });

    it('raises and lowers the pitch by the requested semitones', () => {
        expect(shiftedFrequency(2)).toBeGreaterThan(440 * 2 ** (2 / 12) * 0.97);
        expect(shiftedFrequency(2)).toBeLessThan(440 * 2 ** (2 / 12) * 1.03);
        expect(shiftedFrequency(-3)).toBeGreaterThan(440 * 2 ** (-3 / 12) * 0.97);
        expect(shiftedFrequency(-3)).toBeLessThan(440 * 2 ** (-3 / 12) * 1.03);
    });
});
