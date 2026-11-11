export type RecoveryPhase = 'reporting' | 'retrying' | 'redirecting';

const EN_LABELS: Record<RecoveryPhase, string> = {
    reporting: 'Reporting the issue…',
    retrying: 'Recovering automatically…',
    redirecting: 'Taking you back…',
};

const ES_LABELS: Record<RecoveryPhase, string> = {
    reporting: 'Reportando el problema…',
    retrying: 'Recuperando automáticamente…',
    redirecting: 'Llevándote de vuelta…',
};

/**
 * Sr-only recovery copy without next-intl / Intl.PluralRules.
 * Keep strings in sync with `error.boundary.*` in locales/en.ts and locales/es.ts.
 */
export function recoveryPhaseLabel(phase: RecoveryPhase, lang?: string | null): string {
    return (lang === 'es' ? ES_LABELS : EN_LABELS)[phase];
}

export function documentRecoveryPhaseLabel(phase: RecoveryPhase): string {
    const lang = typeof document !== 'undefined' ? document.documentElement.lang : undefined;
    return recoveryPhaseLabel(phase, lang);
}
