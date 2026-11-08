## Context

The app has no accounts and no database; live rooms live in Redis and per-device preferences in browser storage (zustand `persist`). Queueing a video over WebSocket requires a complete `YouTubeVideo` (id, title, duration, thumbnails, channel, views) validated by `youtubeVideoSchema`. The API already knows how to hydrate a video id (`modules/url-commands/hydrate-video.ts`), expand a playlist (`fetch-playlist-details-cached.ts`), and filter non-embeddable videos (`resolve-embeddable-queue.ts`). Starter playlists exist as `packages/curated-playlists` with a preview overlay and an import panel.

Owner decisions: mixed packs (videos + playlists), three creation tiers (repo, device, shared code) with no accounts, all four surfaces, four queue actions, karaoke versions only, full metadata set, English + Spanish.

## Goals / Non-Goals

**Goals**
- Packs are data, not code: adding a pack is adding a JSON file that passes `bun run test`.
- Hydration happens server-side once, cached, so a pack of 40 songs queues in one round trip.
- Guests on phones can browse by tag, open a pack, and get songs into the queue in two taps.
- Anyone can build a pack from what the room already played and hand it to a friend with a QR.
- Abuse surface of the share endpoint is bounded by schema, size, rate, and TTL.

**Non-Goals**
- Accounts, sync, public directory, lyrics, auto-DJ, non-karaoke versions, pack monetisation.

## Decisions

### D1 — Schema (zod, `packages/song-packs/src/schema.ts`)

```ts
const localizedText = z.object({ en: z.string().min(1).max(80), es: z.string().max(80).optional() });
const localizedLong  = z.object({ en: z.string().max(280),      es: z.string().max(280).optional() });

const videoItem = z.object({
  kind: z.literal('video'),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  artist: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  karaoke: z.literal(true),              // AHK ships karaoke versions only
  channel: z.string().max(80).optional(), // provenance for re-curation
});
const playlistItem = z.object({
  kind: z.literal('playlist'),
  listId: z.string().min(10).max(64),
  label: localizedText.optional(),
});
export const songPackItemSchema = z.discriminatedUnion('kind', [videoItem, playlistItem]);

export const songPackSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(48),
  schemaVersion: z.literal(1),
  title: localizedText,
  description: localizedLong,
  cover: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('gradient'), from: hex, to: hex }),
    z.object({ kind: z.literal('videoThumb'), videoId }),
    z.object({ kind: z.literal('image'), url: z.string().url().max(300) }),
  ]),
  tags: z.object({
    genres:    z.array(z.enum(GENRES)).max(6),
    decades:   z.array(z.enum(DECADES)).max(6),   // '60s'…'2020s'
    moods:     z.array(z.enum(MOODS)).max(6),
    languages: z.array(z.enum(['en','es','other'])).min(1),
  }),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  energy:     z.union([z.literal(1), z.literal(2), z.literal(3)]),
  explicit:   z.boolean(),
  curator:    z.object({ name: z.string().min(1).max(40), kind: z.enum(['staff','user']) }),
  featured:   z.boolean(),
  featuredRank: z.number().int().min(0).optional(),
  items: z.array(songPackItemSchema).min(1).max(300),
  updatedAt: z.string().datetime(),
}).refine(noDuplicateVideoIds).refine(featuredRankOnlyWhenFeatured);
```

Taxonomy constants (`GENRES`, `DECADES`, `MOODS`) live in `taxonomy.ts` with locale label keys (`packs.tags.genre.pop` …). Operator packs are one file each under `packages/song-packs/packs/<id>.json`; `index.ts` imports them, validates at load, and exports `loadOperatorPacks()`, `filterPacks(packs, { locale, tags, explicit })`, `localize(text, locale)`.

*Rejected:* keeping `catalogs → playlist URLs`. It cannot express song order, metadata, or per-song provenance.

### D2 — Hydration: `POST /packs/resolve`

Body `{ items: SongPackItem[] }` (≤ 300, validated with `songPackItemSchema`). Response `{ videos: YouTubeVideo[]; unresolved: { videoId: string; reason: 'notFound' | 'notEmbeddable' | 'timeout' }[] }`.

- Video items → `hydrateVideoById` (existing) with cache key `pack:resolve:<videoId>` TTL 7 days (longer than the 10-minute `hydrate:` key because pack content is stable); concurrency 6 via existing `map-with-concurrency.ts`.
- Playlist items → `resolvePlaylistDetails` (existing, cached) expanded in place.
- Result passes through `resolveEmbeddableQueue` so non-embeddable videos land in `unresolved` with a reason the UI can show.
- Rate limit: reuse the server-level `rateLimit` plus a per-route cap (30/min/IP).

*Rejected:* a server-side `queuePack { packId }` WS command. User packs and shared packs are not known to the server by id, so the client must send items anyway; one HTTP resolve + one WS batch keeps the WS protocol small.

### D3 — Batch queueing: WS `addVideos`

```ts
withBase({
  type: z.literal('addVideos'),
  videos: z.array(youtubeVideoSchema).min(1).max(300),
  mode: z.enum(['append', 'shuffle', 'replace']),
  source: z.object({ packId: z.string().max(48) }).optional(),
})
```

- `append`: push in order, skipping ids already in `videoQueue` or equal to `playingNow`.
- `shuffle`: Fisher–Yates on the server, then `append` semantics.
- `replace`: host-only (reuse the `notHost` guard used by `clearQueue`); clears queue, sets first video as `playingNow`, queues the rest; emits a distinct toast `toast.addVideosReplaceHandler`.
- "Add a handful": **client-side** picks `min(5, n)` random unqueued items, resolves, sends `append`. No new server mode.
- One broadcast per batch (not per video) to keep TVs smooth.

### D4 — Surfaces

- **Packs tab**: new tab id `packs` in `youtubeStore.currentTab`, `MobileBottomNav` (icon `LibraryBig`), `RemoteTabPanel`, and the `tab` enum in `packages/validators/src/url-commands.ts`. Layout: sticky filter chips (genre, decade, mood, language, energy, difficulty, "hide explicit"), featured rail, then a grid of `PackCard` (cover, title, count, badges). Tab order: Search · Packs · Queue · History · Controls (Settings stays in the header).
- **Pack detail** (`PackDetailOverlay`, reuses `RemotePanelOverlayShell`): header with cover/title/description/tags; action bar with the four actions; resolved song list using `VideoList` so per-song Add / Play next / Play now behave exactly like search. Shows `unresolved` count with a reason.
- **Browse idle + empty queue**: `BrowseSuggestionsList` and `VideoQueue` render `FeaturedPacksRail` (featured first, then by `updatedAt`) in place of `CuratedPlaylistsPanel`. The curated-starters visibility hook logic is kept under a new name.
- **Import panel**: `ImportPlaylistPanel` keeps the paste-a-URL section; quick picks become `PackQuickPicks`.
- **TV idle**: `TvRoomLobby` gains a `FeaturedPacksCarousel` (max 6, rotates every 8 s, D-pad focusable via existing spatial navigation) beside the room QR; selecting a pack on the TV sends `addVideos append` of the first 10 resolved items (TV never does `replace`). Must survive `tv-downlevel`.

### D5 — User packs on device (`packsStore`)

`zustand` + `persist` via `createMigratingPersistStorage` key `ahk:packs:v1`. State: `userPacks: SongPack[]` (curator.kind `user`, `featured: false`). Actions: `createFromVideos(videos, { title })`, `addVideoToPack(packId, video)`, `removeItem`, `reorder`, `rename`, `setTags`, `delete`, `duplicateOperatorPack(id)`. Entry points: "Save queue as pack" (queue toolbar), "Save history as pack", multi-select in search results → "Add to pack", per-song menu → "Add to pack…". Cover defaults to `videoThumb` of the first item. Cap 50 user packs × 300 items.

### D6 — Sharing without accounts

- `POST /packs/share` body `{ pack: SongPack }` (schema-validated, `curator.kind` forced to `user`, `featured` forced false, ≤ 64 KB serialized). Response `{ code, url, expiresAt }`. Code: `AHK-` + 4 chars Crockford base32 from `crypto.getRandomValues` (≈ 1 M codes), retry on collision; Redis key `pack:share:<code>` TTL 30 days. Rate limit 10/hour/IP.
- `GET /packs/share/:code` → `{ pack, expiresAt }`; each successful read refreshes TTL to 30 days (popular packs live on).
- Web: share sheet (Web Share API when available, else copy link + QR via existing `react-qrcode-logo`). URL command `pack=<code>` (added to the catalog and apply order after `tab`): opens `PackDetailOverlay` for the fetched pack with a "Save to my packs" button; never mutates the queue by itself.
- Content safety: no free text beyond titles/descriptions/artist names with length caps; rendered as text only.

### D7 — Curation pipeline (`scripts/packs/`)

- `seed.csv`: `pack_id,artist,title` rows authored by hand (Claude drafts, owner edits).
- `curate.mjs`: for each row, query `"<artist> <title> karaoke"` through the API's `search-first-page-items` module with the karaoke filter; score candidates by trusted channel list (`Sing King`, `KaraFun Karaoke`, `Stingray Karaoke`, `Karaoke Version`, `Zoom Karaoke Official`) → title similarity → duration sanity (2–8 min) → embeddable; write `packs/<id>.json` and `report/<id>.md` (chosen video, runner-ups, confidence). Needs network and a running API or direct module import; runs locally, not in CI.
- `verify.mjs`: for each shipped video id, check `oEmbed` status and the embed-playability resolver; print dead ids. Optional workflow `packs-verify.yml` weekly, opens/updates one issue.
- PR CI: `packages/song-packs/tests` validate schema, unique ids, taxonomy membership, `featuredRank` uniqueness, offline only.

## Risks / Trade-offs

- **Hydration cost on first open**: 40 videos × YouTube lookups. Mitigated by the 7-day cache and warming the cache for operator packs on API boot (background, best-effort).
- **Non-embeddable churn**: shows up as `unresolved`; weekly verify + `channel` provenance make swaps quick.
- **Share endpoint abuse**: bounded by schema, 64 KB, 300 items, 10/hour/IP, TTL; no media is stored.
- **Tab crowding on small phones**: five tabs is the practical limit; Settings already lives in the header.

## Migration Plan

1. PR 3 lands `packages/song-packs` + seeds + scripts with no UI change.
2. PR 4 adds API + surfaces, then deletes `packages/curated-playlists` and its components in the same PR so there is never two starter systems.
3. PR 5 user packs; PR 6 sharing. Each is independently revertible.

## Open Questions

- Default for "hide explicit": off with a badge (default) vs on until the host toggles.
- Should the TV idle carousel also show *user* packs from the host's phone? (Default: operator featured only in v1.)
- Pack cover art for Latin and decade packs: gradients (zero licensing risk) vs first-video thumbnails. (Default: gradients for operator packs.)
