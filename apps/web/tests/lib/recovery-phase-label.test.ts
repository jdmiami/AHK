import { describe, expect, it } from 'vitest';

import { recoveryPhaseLabel } from '@/lib/recovery-phase-label';

describe('recoveryPhaseLabel', () => {
    it('uses Spanish copy when lang is es', () => {
        expect(recoveryPhaseLabel('retrying', 'es')).toBe('Recuperando automáticamente…');
        expect(recoveryPhaseLabel('reporting', 'es')).toBe('Reportando el problema…');
        expect(recoveryPhaseLabel('redirecting', 'es')).toBe('Llevándote de vuelta…');
    });

    it('uses English copy when lang is en', () => {
        expect(recoveryPhaseLabel('retrying', 'en')).toBe('Recovering automatically…');
        expect(recoveryPhaseLabel('reporting', 'en')).toBe('Reporting the issue…');
        expect(recoveryPhaseLabel('redirecting', 'en')).toBe('Taking you back…');
    });

    it('falls back to English for missing or unknown lang', () => {
        expect(recoveryPhaseLabel('retrying', undefined)).toBe('Recovering automatically…');
        expect(recoveryPhaseLabel('retrying', '')).toBe('Recovering automatically…');
        expect(recoveryPhaseLabel('retrying', 'vi')).toBe('Recovering automatically…');
    });
});
