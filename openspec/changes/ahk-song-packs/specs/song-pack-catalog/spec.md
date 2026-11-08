## ADDED Requirements

### Requirement: Pack schema

The system MUST define a Song Pack as a zod-validated object with: a slug `id`; `schemaVersion` 1; localized `title` and `description` (`en` required, `es` optional); a `cover` (gradient, video thumbnail, or image URL); `tags` with `genres`, `decades`, `moods` from a fixed taxonomy and `languages` from `en | es | other`; `difficulty` and `energy` in 1–3; `explicit` boolean; `curator` with `name` and `kind` `staff | user`; `featured` boolean with optional `featuredRank`; 1–300 `items`; and an ISO `updatedAt`. Items MUST be either a `video` (11-char YouTube id, `artist`, `title`, `karaoke: true`, optional `channel`) or a `playlist` (`listId`, optional localized `label`). Duplicate video ids within one pack MUST be rejected.

#### Scenario: Valid operator pack loads

- **WHEN** `loadOperatorPacks()` runs
- **THEN** every JSON file under `packages/song-packs/packs/` parses and validates, and the result is ordered featured-first by `featuredRank`, then by `updatedAt` descending

#### Scenario: Invalid pack fails tests

- **WHEN** a pack file has an unknown genre, a malformed video id, or two identical video ids
- **THEN** `bun run test` fails naming the file and the field

### Requirement: Karaoke-only video items

Every `video` item in an operator pack MUST set `karaoke: true` and SHOULD record the source `channel`. The schema MUST NOT accept `karaoke: false`.

#### Scenario: Original-version video rejected

- **WHEN** a pack item is written with `karaoke: false`
- **THEN** validation fails

### Requirement: Locale and filter helpers

The package MUST export `localize(text, locale)` returning the `es` string when present for locale `es` and the `en` string otherwise, and `filterPacks(packs, { locale, genres, decades, moods, languages, energy, difficulty, hideExplicit })` applying every provided filter conjunctively.

#### Scenario: Hide explicit

- **WHEN** `hideExplicit` is true
- **THEN** no returned pack has `explicit: true`

### Requirement: Seed packs

The shipped catalog MUST include at least: `crowd-pleasers`, `sing-along-anthems`, `hits-80s`, `hits-90s`, `hits-2000s`, `hits-2010s`, `reggaeton-party`, `bachata-nights`, `salsa-clasica`, `rock-en-espanol`, `duets`, `power-ballads`, `hip-hop-flow`, `country-night`, `late-night-slow-jams`, each with 25–40 items, and at least one `featured` pack per family.

#### Scenario: Cold start

- **WHEN** a new visitor opens the Packs tab
- **THEN** featured packs from every family are visible without scrolling past the first rail

### Requirement: Curation and verification tooling

The repo MUST provide `scripts/packs/curate.mjs` (from `seed.csv`, searches YouTube through the API's module, prefers a trusted karaoke channel list, checks embeddability, writes pack JSON and a review report) and `scripts/packs/verify.mjs` (reports dead or non-embeddable video ids). Neither MUST run in PR CI.

#### Scenario: Weekly verify

- **WHEN** the optional `packs-verify.yml` workflow runs
- **THEN** it lists unresolved video ids per pack in a single tracking issue and never fails the default branch
