## Why

This repository is a fork of vkara being turned into **AHK · Artist House Karaoke**, a browser-first karaoke app for a private community. Today the product name, icons, SEO, docs, and locale copy all say vkara, the default language is Vietnamese, and the repo carries TV-shell apps and upstream deployment identifiers the fork will not use. A user opening the app or the README should see AHK, in English or Spanish, with a look of its own.

## What Changes

- **User-facing rename only.** Every string, image, and document a user or deployer reads says AHK (short) / Artist House Karaoke (full). Internal identifiers (`@vkara/*` workspace scope, `VKARA_*` env vars, `--vkara-*` CSS vars, Docker image names) are explicitly **unchanged** so upstream fixes stay mergeable.
- **Brand module** at `apps/web/src/lib/brand.ts` as the single source of the product name, tagline, and canonical URL; locale files and metadata read from it.
- **New visual identity** ("neon lounge"): dark-default palette with magenta/cyan accents, matching light theme, AHK monogram SVG, regenerated PWA icons, favicon, OG image. Icon generation renders from SVG instead of cropping upstream PNG sheets.
- **Locales**: English becomes the default locale at `/`; Spanish is added at `/es`; Vietnamese is removed. Locale key parity is enforced by a test.
- **Docs**: README, containers guide, agent docs rewritten for AHK with placeholder domain `https://ahk.example`; upstream screenshots removed until AHK screenshots exist; credits file keeps MIT attribution.
- **Pruning** (Phase 0, same change set, separate PR): remove Samsung Tizen and Android TV shells and their workflows, upstream funding file, upstream Sentry DSNs, Vietnamese docs. The browser `/tv` route stays.

**Non-goals:** renaming package scope or env vars; a venue/commercial mode; removing TikTok (separate change `ahk-prune-tiktok`); native apps of any kind.

## Capabilities

### New Capabilities

- `ahk-brand-identity`: single brand source, neon-lounge theme tokens, SVG-driven icon pipeline, no literal upstream name in user-facing surfaces.
- `ahk-locales`: `en` default + `es`, Vietnamese removed, key parity test.

### Modified Capabilities

- `curated-playlist-catalog`: `UiLocale` becomes `'en' | 'es'` (temporary; the catalog is superseded by `ahk-song-packs`).
- `tv-chrome76-runtime`: theme tokens and glow styles must still pass the downlevel/verify build step.

## Impact

- **Changed:** `apps/web/src/locales/*`, `apps/web/src/middleware.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/lib/seo/*`, `apps/web/src/app/llms.txt/*`, `apps/web/public/*`, `apps/web/brand/*`, `apps/web/scripts/generate-pwa-icons.mjs`, `README.md`, `containers/README.md`, `docs/agents/*`, `.env.example`, `apps/*/.env.example`, `.github/workflows/build-push-docker.yml`.
- **Removed:** `apps/tizen`, `apps/android-tv`, four TV workflows, `.github/FUNDING.yml`, `docs/vi/`, `docs/standalone-tv-deployment.md`, `apps/web/src/locales/vi.ts`, upstream screenshots in `assets/image/`, `public/icons/vkara-icon.svg`, `public/icons/tv-banner-320x180.png`.
- **Unchanged:** room/WebSocket protocol, API routes, package names, env var names, Docker service names, Redis keys.
