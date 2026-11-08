## ADDED Requirements

### Requirement: English default, Spanish secondary

The web app MUST serve English at the root path (`/`) and Spanish at `/es`. The supported locale list MUST be exactly `['en', 'es']`, with `en` as fallback for client and server i18n providers.

#### Scenario: Root visit

- **WHEN** a visitor opens `/` with any `Accept-Language`
- **THEN** the English UI renders and the URL stays at `/` (no redirect to a locale prefix)

#### Scenario: Spanish visit

- **WHEN** a visitor opens `/es` or picks Spanish in Appearance settings
- **THEN** every UI string renders from `es.ts`

### Requirement: Locale key parity

`es.ts` MUST define exactly the same set of keys as `en.ts`. A Vitest test MUST fail when a key is missing or extra in either file.

#### Scenario: Missing translation

- **WHEN** a developer adds a key to `en.ts` without adding it to `es.ts`
- **THEN** `bun run test` fails with the missing key named

### Requirement: Vietnamese removed

`vi.ts`, `docs/vi/`, and the Vietnamese language option MUST be removed. Links that previously pointed to Vietnamese docs MUST be removed or repointed.

#### Scenario: Language switcher

- **WHEN** the user opens Appearance → Language
- **THEN** the options are English and Español only

### Requirement: Curated catalog locales follow the app

Any package that filters content by UI locale (currently `packages/curated-playlists`, later `packages/song-packs`) MUST type `UiLocale` as `'en' | 'es'` and its shipped data MUST use only those values.

#### Scenario: Catalog load

- **WHEN** the curated catalog loads
- **THEN** every `suggestLocales` entry is `en` or `es` and validation passes
