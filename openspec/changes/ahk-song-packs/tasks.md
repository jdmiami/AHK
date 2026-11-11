## 1. Package and schema (PR 3)

- [ ] 1.1 Scaffold `packages/song-packs` (package.json, tsconfig, vitest project entry in root `vitest.config.mts`, eslint)
- [ ] 1.2 Implement `schema.ts` (zod) and `taxonomy.ts` (GENRES, DECADES, MOODS + label keys)
- [ ] 1.3 Implement `index.ts`: `loadOperatorPacks`, `filterPacks`, `localize`, `pickRandomItems`
- [ ] 1.4 Tests: schema accept/reject, duplicate video ids, featuredRank rules, taxonomy membership, locale fallback, every shipped pack validates

## 2. Seed content and tooling (PR 3)

- [ ] 2.1 Author `scripts/packs/seed.csv` (~15 packs × 25–40 songs): crowd-pleasers, sing-along-anthems, hits-80s, hits-90s, hits-2000s, hits-2010s, reggaeton-party, bachata-nights, salsa-clasica, rock-en-espanol, duets, power-ballads, hip-hop-flow, country-night, late-night-slow-jams
- [ ] 2.2 Implement `scripts/packs/curate.mjs` (search via API youtube module, trusted-channel scoring, embeddability check, JSON + report output)
- [ ] 2.3 Implement `scripts/packs/verify.mjs` (link-rot check) and optional `.github/workflows/packs-verify.yml` (weekly, opens issue)
- [ ] 2.4 Run curation, review reports, commit `packages/song-packs/packs/*.json`; mark `crowd-pleasers` and one per family as `featured`
- [ ] 2.5 Add `packs.*` and `packs.tags.*` locale keys in `en.ts` and `es.ts`

## 3. API (PR 4)

- [ ] 3.1 Add `addVideos` to `wsClientMessageSchema` (validators) and handler in `room-service.ts` (append / shuffle / replace, host-only replace, dedupe, single broadcast)
- [ ] 3.2 Add `apps/api/src/plugins/packs.plugin.ts` with `POST /packs/resolve` (validators body schema, hydrate + playlist expand + embeddable filter, Redis `pack:resolve:*` 7-day cache, per-route rate limit)
- [ ] 3.3 Best-effort cache warm for operator packs on boot (behind `VKARA_PACKS_WARM_ON_BOOT`, default on)
- [ ] 3.4 Tests: `addVideos` modes and guards; `/packs/resolve` with mocked hydrate; rate limit

## 4. Web surfaces (PR 4)

- [ ] 4.1 Add `packs` tab: `youtubeStore`, `MobileBottomNav`, `RemoteTabPanel`, `tab` enum in `packages/validators/src/url-commands.ts`, docs
- [ ] 4.2 Build `components/packs/`: `PackCard`, `PackFilters`, `FeaturedPacksRail`, `PacksTab`, `PackDetailOverlay`, `PackActionBar`, `PackQuickPicks`, `FeaturedPacksCarousel` (TV)
- [ ] 4.3 `services/packs-api.ts` (`resolvePack`), `hooks/use-pack-resolution.ts` (query + cache per pack id), `websocketStore.addVideos`
- [ ] 4.4 Wire browse-idle (`BrowseSuggestionsList`), empty queue (`VideoQueue`), import panel quick picks
- [ ] 4.5 TV lobby carousel with D-pad focus; verify `tv-downlevel` + `tv-verify`
- [ ] 4.6 Toasts: `toast.addVideosAppendHandler`, `toast.addVideosShuffleHandler`, `toast.addVideosReplaceHandler`, `toast.packPartiallyResolved`
- [ ] 4.7 Remove `packages/curated-playlists`, `components/curated-playlists/*`, `curatedStore`, `use-curated-catalogs`, `curated-catalog-label` and tests; update `next.config.ts`, `tsconfig.json`, `package.json`
- [ ] 4.8 Tests: filter logic, random handful picker, tab routing, Playwright smoke (open pack → Add all → queue length)

## 5. User packs on device (PR 5)

- [ ] 5.1 `store/packsStore.ts` with migrating persist storage `ahk:packs:v1`; caps (50 packs, 300 items)
- [ ] 5.2 Entry points: "Save queue as pack", "Save history as pack", multi-select → "Add to pack", per-song "Add to pack…"
- [ ] 5.3 `PackEditorOverlay`: rename, description, tags, reorder (drag or up/down), remove, search-to-add, cover choice
- [ ] 5.4 "My packs" section at top of Packs tab; duplicate an operator pack into My packs
- [ ] 5.5 Tests: store actions, caps, migration from empty

## 6. Sharing (PR 6)

- [ ] 6.1 API: `POST /packs/share`, `GET /packs/share/:code`; Crockford base32 codes `AHK-XXXX`; Redis `pack:share:*` 30-day TTL refreshed on read; 64 KB cap; 10/hour/IP
- [ ] 6.2 Web: share sheet (Web Share API / copy link / QR); `pack=<code>` URL command in `packages/validators/src/url-commands.ts`, `urlCommandStore`, apply order after `tab`; import overlay with "Save to my packs"
- [ ] 6.3 Docs: `docs/agents/url-commands.md`, `llms.txt`
- [ ] 6.4 Tests: code generation/collision retry, TTL refresh, schema rejection, URL command apply

## 7. Verification (every PR)

- [ ] 7.1 `bun run ci` green
- [ ] 7.2 Screenshots: Packs tab, pack detail, TV lobby carousel (dark + light)
