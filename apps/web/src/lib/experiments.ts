import { isExperimentsEnabledOnWeb, parseEnvFlagValue } from '@vkara/env';

import { env } from '@/env';

/**
 * Experiments flag for the web app.
 *
 * Browser bundles only carry `NEXT_PUBLIC_*` values; reading the server-only
 * `VKARA_EXPERIMENTS` key on the client makes t3-env throw ("Attempted to access a
 * server-side environment variable on the client"), which upstream hit whenever
 * `NEXT_PUBLIC_VKARA_EXPERIMENTS` was unset. On the client we therefore read the public
 * flag only; the server keeps the public-then-server fallback.
 */
export function isExperimentsEnabled(): boolean {
    if (typeof window !== 'undefined') {
        return parseEnvFlagValue(env.NEXT_PUBLIC_VKARA_EXPERIMENTS, false);
    }
    return isExperimentsEnabledOnWeb(env);
}
