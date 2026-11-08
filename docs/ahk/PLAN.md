# AHK · Artist House Karaoke — Master Plan

> Fork of [vkara](https://github.com/lehuygiang28/vkara) (MIT) being rebranded to **AHK**
> and extended with **Song Packs**. This document is the roadmap and the decision record.
> Detailed specs live in `openspec/changes/ahk-rebrand/` and `openspec/changes/ahk-song-packs/`.

## 1. Decision record (2026-11-08)

Answers collected from the owner. These are settled unless revisited here.

| Topic | Decision |
|---|---|
| Rename depth | **User-facing only.** UI strings, icons, OG image, README/docs, SEO, PWA name. Internal `@vkara/*` package scope, `VKARA_*` env vars, `--vkara-*` CSS vars, Docker image names stay so upstream fixes can still be merged. |
| Display name | **"AHK"** as the short brand everywhere space is tight (nav, TV lobby, icon label). **"Artist House Karaoke"** as subtitle/tagline in page titles, about text, OG image. |
| Visual identity | **Neon lounge**: deep black, magenta + cyan glow. Claude designs palette, AHK monogram, dark + light themes, regenerates icons/OG/banners. Owner approves before merge. |
| Context | **Private house / community** (friends, family, artist collective). Non-commercial notice stays. No venue/business mode. |
| Pack contents | **Mixed**: a pack holds hand-picked YouTube videos *and/or* whole YouTube playlists as sections. |
| Who creates packs | Three tiers, phased: (1) operator packs in repo JSON, (2) anyone on their own device, (3) anyone, shareable by code/link/QR **without accounts**. No sign-in, no database. |
| Where packs show | Dedicated **Packs tab**, browse-idle + empty-queue (replacing "starter playlists"), **TV idle screen** featured packs, import-panel quick picks. |
| Queue actions | Add all · Shuffle in · Play pack now (replace queue, host-only + confirm) · Add a random handful. Per-song actions stay. |
| Seed packs | Crowd pleasers & sing-alongs · Decades (80s/90s/2000s/2010s) · Latin (reggaeton, bachata, salsa, rock en español) · Moods (duets, ballads, hip-hop, country, late-night). |
| Song version | **Karaoke versions only** (lyrics on screen, no lead vocal). Trusted channels: Sing King, KaraFun, Stingray Karaoke, Karaoke Version, Zoom Karaoke. |
| Pack metadata | Tags (genre, decade, mood, language) · difficulty + energy (1–3) · curator name + featured flag · explicit flag. |
| Languages | **English (default at `/`) + Spanish (`/es`). Vietnamese removed.** |
| Extras | Keep **Whisper voice search**. Remove Samsung Tizen shell, Android TV shell, TikTok provider. Browser-first product. |
| Build order | **Rebrand first, then packs.** One draft PR per phase. |
| Hosting | **Vercel** for web, **VPS or Fly.io** for API + Redis. Keep AIO Docker image building as a fallback. |

### Still open (non-blocking, defaults in parentheses)

- Public domain name for AHK (docs use `https://ahk.example` placeholder until set).
- Light theme: ship it or dark-only? (Default: ship both; dark is default.)
- Explicit packs: hidden by default behind a room "family night" toggle, or shown with a badge? (Default: shown with badge; toggle hides.)
- Spanish translation review by a native speaker before launch. (Default: Claude translates, owner spot-checks.)
- Should a GitHub Release / Docker Hub org be set up for the API image? (Default: workflow re-pointed to owner's Docker Hub, publish disabled until credentials exist.)

## 2. Phases and PRs

Every PR is opened as a draft on the `claude/*` branch, must pass `bun run ci`
(test → typecheck → lint → build), and follows `.github/pull_request_template.md`.

**Status (2026-11-08):** plan + Phase 0 landed together in [PR #1](https://github.com/jdmiami/AHK/pull/1).

### Hosting (set up 2026-11-08)

- **Web:** Vercel project `ahk` in team `jdmiamis-projects`, linked to `jdmiami/AHK`, root directory `apps/web`,
  framework Next.js, build via `apps/web/vercel.json` (`bun install` at repo root, `bun run build:web`).
  Production branch `main`; every push to a PR branch builds a preview. Deployment protection is off so phones
  can open the `vercel.app` URL without a Vercel login.
- **Short domains:** `artisthousekaraoke.vercel.app` and `ahkaraoke-app.vercel.app` are attached to the project
  (`ahkaraoke.vercel.app` is owned by another Vercel account).
- **Host switch:** the phone lobby shows a "The house is off / on" panel (`apps/web/src/components/host/host-power-panel.tsx`)
  backed by `apps/web/src/app/api/host/route.ts`, which starts/stops a RunPod pod through RunPod REST v2. Server env:
  `RUNPOD_API_KEY`, `RUNPOD_POD_ID`, `AHK_HOST_PIN`; public flag `NEXT_PUBLIC_HOST_SWITCH=1`. Status is public; actions need
  the PIN (constant-time compare, wrong-PIN delay). "On" means the API `/health` answers, not just that the pod is RUNNING.
- **API + Redis (RunPod plan):** pod `ahk-api`, `cpu3c` 2 vCPU / 4 GB, image `lehuygiang28/vkara-api-redis:sha-b2494a1`
  (the fork's base commit), port 8000 over the RunPod HTTPS proxy. $0.06/h while on; stopped between nights. Not yet created. The web app needs `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` pointing at a
  running Bun API before rooms work. Planned: Fly.io app from `containers/api-redis/Dockerfile` (API + Redis in one
  container) or a VPS with `docker compose --profile api`. Set those two env vars on the Vercel project afterwards.
- **Docker images:** publish workflow is opt-in via the `DOCKERHUB_OWNER` repo variable plus
  `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets.

### PR 1 — Fork hygiene and pruning (Phase 0)

Goal: a clean fork with nothing pointing at upstream infrastructure, and the parts we are not keeping removed.

- Remove `apps/tizen`, `apps/android-tv`, their workflows (`tizen-packaging.yml`, `release-tizen.yml`, `android-tv-packaging.yml`, `release-android.yml`), root scripts `build:tizen*`, `build:android-tv`, `check:android-tv`, Turbo env entries (`VKARA_TV_URL`, `VKARA_ALLOW_CLEARTEXT`, `EXPO_TOKEN`, `EAS_PROJECT_ID`, `EXPO_TV`), and `docs/standalone-tv-deployment.md`. Keep the web `/tv` route: it is the browser TV screen.
- Remove `.github/FUNDING.yml` (upstream's donation links).
- Scrub upstream Sentry DSNs, org, and project names from `.env.example`, `apps/*/.env.example`, `scripts/sentry/`. Sentry stays optional and unset.
- Re-point `build-push-docker.yml` image names from `lehuygiang28/vkara-*` to a placeholder owner org; disable publish until secrets exist.
- Remove `docs/vi/` (Vietnamese README and disclaimer).
- Add `docs/ahk/CREDITS.md`: MIT attribution to lehuygiang28 and the libraries in the upstream Thanks table. Keep `LICENSE` with the original copyright line and add an AHK line.
- Archive the in-flight `openspec/changes/android-tv-shell-sideload` change as superseded.

### PR 2 — Rebrand to AHK (Phase 1) → `openspec/changes/ahk-rebrand`

- **Brand module** `apps/web/src/lib/brand.ts`: `BRAND = { short: 'AHK', full: 'Artist House Karaoke', tagline, url }`. Every user-visible string that names the product reads from it or from locale files; no literal "vkara" in `apps/web/src`.
- **Theme**: new HSL tokens in `globals.css` for dark (default) and light. Neon lounge palette (see §3). Accent glow utilities kept TV-safe (Chrome 76 downlevel script must still pass `tv-verify`).
- **Monogram + icons**: new `apps/web/brand/ahk-mark.svg` and `ahk-lockup.svg`; regenerate `public/icons/*`, `favicon.ico`, `og-image.png` via a rewritten `scripts/generate-pwa-icons.mjs` that renders from SVG instead of cropping upstream's PNG sheet. Delete `vkara-icon.svg`, `tv-banner-320x180.png`, `assets/image/*` upstream screenshots (replace with AHK screenshots later).
- **Locales**: `en.ts` rewritten for AHK copy; new `es.ts` (full translation, ~440 keys); `vi.ts` deleted; `client.ts`/`server.ts`/`middleware.ts` default `en`, locales `['en','es']`; `UiLocale` type in curated-playlists (and later song-packs) becomes `'en' | 'es'`; `appearance.language*` options updated.
- **SEO/metadata**: `seo.*` strings, `llms.txt` route copy, structured data site name, `manifest` name/short_name/theme_color.
- **Docs**: README rewritten for AHK (what it is, how to host a night, self-host, developers), `containers/README.md` wording, `docs/agents/*` example URLs → `https://ahk.example`.
- **Tests**: brand snapshot test asserting no `vkara` in user-facing locale values; locale shape test (`es` has every `en` key).

### PR 3 — Song Packs: package, schema, seed content, tooling (Phase 2a) → `openspec/changes/ahk-song-packs`

- New workspace package `packages/song-packs` (zod schema, loader, locale filtering, tag taxonomy, tests). Supersedes `packages/curated-playlists` (deleted in PR 4 once the UI has moved).
- `packages/song-packs/packs/*.json`: one file per pack, ~15 seed packs.
- Curation pipeline `scripts/packs/`: `seed.csv` (pack, artist, title) → `curate.mjs` searches "artist title karaoke" through the API's YouTube module, prefers trusted channels, checks embeddability, writes pack JSON and a review report → `verify.mjs` (link-rot check, run manually or on a weekly schedule, never in PR CI).
- CI test validates schema and uniqueness offline only.

### PR 4 — Song Packs: surfaces and queue actions (Phase 2b)

- API: `POST /packs/resolve` (hydrate video ids + expand playlists → `YouTubeVideo[]`, Redis cached, embeddability filtered) and WS `addVideos { videos, mode: 'append' | 'shuffle' | 'replace' }` (replace is host-only).
- Web: Packs tab (bottom nav, `RemoteTabPanel`, `tab=packs` URL command), pack grid with tag chips and filters, pack detail with the four actions + per-song actions, browse-idle/empty-queue/import-panel integration, TV idle screen featured carousel with QR.
- Remove `packages/curated-playlists` and `components/curated-playlists/*`.

### PR 5 — User packs on this device (Phase 3a)

- `packsStore` (zustand persist, migrating storage) for user-created packs.
- Create from queue / history / selected search results; "Add to pack" in the per-song action menu; pack editor (rename, reorder, remove, search-to-add); auto cover from first video.

### PR 6 — Share packs by code, link, QR (Phase 3b)

- API: `POST /packs/share` → `{ code, url, expiresAt }`, `GET /packs/share/:code`. Codes `AHK-XXXX` (Crockford base32), Redis TTL 30 days refreshed on import, size + rate limits.
- Web: share sheet with link + QR; `?pack=CODE` URL command opens pack preview with "Save to my packs" and queue actions.

### PR 7 — Prune TikTok experiments (cleanup)

- Remove `packages/tiktok`, `apps/api/src/tiktok.ts`, TikTok components/stores, `provider` URL command value, `VKARA_EXPERIMENTS` flag and the Experiments settings section. Touches ~90 files; isolated on purpose so the diff is reviewable.

## 3. Brand proposal (for owner approval in PR 2)

**Palette — dark (default)**

| Token | Value | Use |
|---|---|---|
| background | `#07060B` | page |
| card / popover | `#110F1A` | surfaces |
| foreground | `#F5F0FF` | text |
| muted-foreground | `#9A93B5` | secondary text |
| primary (magenta) | `#FF2DAA` | CTAs, active tab, now-playing |
| secondary (cyan) | `#22E6FF` | links, focus ring, progress |
| accent (violet) | `#7C5CFF` | gradient stop between magenta and cyan |
| destructive | `#FF4D5E` | |
| border | `#241F33` | |

**Palette — light**: background `#FAF7FF`, foreground `#17122B`, primary `#D6007F`, secondary `#0092A8`, card `#FFFFFF`, border `#E6E0F2`. Accents are darkened so contrast stays AA on white.

**Monogram**: rounded-square tile, near-black fill, "AHK" in a heavy geometric sans, letters filled with a magenta→violet→cyan diagonal gradient, soft outer glow. A 1-color fallback for favicon 16/32. Lockup: monogram + "Artist House Karaoke" in `Geist` (already loaded) for OG image and README header.

**Type**: keep Geist Sans/Mono (already in layout). Optional display face for the wordmark only, decided when the SVG is reviewed.

**TV constraint**: no `backdrop-filter`, no `color-mix()`, no `oklch()` — the `/tv` route must survive the Chrome 76 downlevel step. Glows are plain `box-shadow` with rgba.

## 4. Song Pack schema (summary; full spec in `openspec/changes/ahk-song-packs/design.md`)

```ts
type SongPack = {
  id: string;                 // slug, stable, e.g. "crowd-pleasers"
  schemaVersion: 1;
  title: LocalizedText;       // { en: string; es?: string }
  description: LocalizedText;
  cover: { kind: 'gradient'; from: string; to: string }
       | { kind: 'videoThumb'; videoId: string }
       | { kind: 'image'; url: string };
  tags: { genres: string[]; decades: string[]; moods: string[]; languages: ('en'|'es'|'other')[] };
  difficulty: 1 | 2 | 3;
  energy: 1 | 2 | 3;
  explicit: boolean;
  curator: { name: string; kind: 'staff' | 'user' };
  featured: boolean;
  featuredRank?: number;
  items: SongPackItem[];
  updatedAt: string;          // ISO date
};

type SongPackItem =
  | { kind: 'video'; videoId: string; artist: string; title: string; karaoke: true; channel?: string }
  | { kind: 'playlist'; listId: string; label?: LocalizedText };
```

Videos queue through the existing `addVideo` contract, which needs a full `YouTubeVideo`
(thumbnails, duration, channel, views). Packs store only ids and display names; the API
hydrates them on demand with the existing `hydrate-video` helper and Redis cache.

## 5. How to make mods to this app (owner primer)

The things you'll touch most, and where they live:

| Want to… | Go to |
|---|---|
| Change any UI text | `apps/web/src/locales/en.ts` and `es.ts` (keys are `section.name`) |
| Change colors / theme | `apps/web/src/app/globals.css` (`:root` and `.dark` HSL tokens) |
| Add a tab to the phone remote | `MobileBottomNav.tsx`, `RemoteTabPanel.tsx`, `youtubeStore.currentTab`, and the `tab` enum in `packages/validators/src/url-commands.ts` |
| Add a new action everyone in the room sees | 1) zod schema in `packages/validators/src/ws/client-message.ts` → 2) handler in `apps/api/src/modules/room/room-service.ts` → 3) client sender in `apps/web/src/store/websocketStore.ts` → 4) toast string in locales |
| Add a new HTTP endpoint | `apps/api/src/server.ts` or a plugin in `apps/api/src/plugins/`; request body schema in `packages/validators` |
| Change the TV screen | `apps/web/src/components/pages/tv/*` and `TvRoomLobby.tsx` (must pass `bun run build` which runs `tv-downlevel` + `tv-verify`) |
| Change what shows when the queue is empty | `VideoQueue.tsx` and `BrowseSuggestionsList.tsx` |
| Persist something on the phone | a zustand store with `persist` + `createMigratingPersistStorage` (see `personalizationStore.ts`) |
| Persist something server-side | Redis via `apps/api/src/redis.ts`; helpers in `packages/cache-redis` |

Local loop: `bun install` → start Redis (`docker run -p 6379:6379 redis:7-alpine`) → `bun run dev`
(web :3000, API :8000) → `bun run test` / `bun run typecheck` / `bun run lint` before pushing.
Spec-driven changes live in `openspec/changes/<name>/` with `proposal.md`, `design.md`, `tasks.md`, `specs/`.

## 6. Risks

- **YouTube link rot.** Karaoke videos get removed or blocked for embedding. Mitigation: `verify.mjs` weekly report, per-pack `channel` recorded so a replacement is easy to find, playlist sections as a self-healing fallback.
- **Curation volume.** ~15 packs × 30 songs ≈ 450 verified videos. Mitigation: semi-automated `curate.mjs` from a CSV, human review of the report, ship packs incrementally (crowd pleasers + one decade first).
- **Spanish quality.** 440 strings machine-translated. Mitigation: owner spot-check list in PR 2 description; translation table kept in one file.
- **Share-code abuse.** Public endpoint storing user content. Mitigation: strict zod schema, 64 KB cap, 300 items cap, IP rate limit via existing `elysia-rate-limit`, TTL, no free-text beyond titles (80 chars).
- **Upstream drift.** Keeping `@vkara/*` names helps, but removing TV shells, `vi`, and TikTok makes future merges partial. Accepted; cherry-pick bug fixes rather than merge.
