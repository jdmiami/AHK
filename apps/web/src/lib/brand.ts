/**
 * Single source of truth for the product name.
 *
 * `short` is the wordmark used wherever space is tight (nav, TV lobby, icon label).
 * `full` is the spelled-out name used in page titles, about text, and the OG image.
 * Internal identifiers (`@vkara/*` packages, `VKARA_*` env vars, storage keys) are
 * deliberately not derived from this module; they stay stable across the rename.
 */
export const BRAND = {
    short: 'AHK',
    full: 'Artist House Karaoke',
    /** Short and full name together, for titles and the credit footer. */
    lockup: 'AHK · Artist House Karaoke',
    repoUrl: 'https://github.com/jdmiami/AHK',
    /** Upstream project this fork is based on (MIT). */
    basedOn: {
        name: 'vkara',
        url: 'https://github.com/lehuygiang28/vkara',
        authorHandle: '@lehuygiang28',
        authorUrl: 'https://github.com/lehuygiang28',
    },
} as const;
