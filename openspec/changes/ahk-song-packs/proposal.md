## Why

vkara's "starter playlists" are links to whole YouTube playlists with no control over individual songs, two hardcoded categories, and no way for a guest to make their own. AHK wants **Song Packs**: curated, song-level collections with real metadata (genre, decade, mood, language, difficulty, energy, explicit, curator, featured) that can be browsed, filtered, queued in one tap, built by anyone on their phone, and shared with friends by a short code or QR, all **without accounts or a database**.

## What Changes

- New workspace package `packages/song-packs` with a zod schema, loader, tag taxonomy, locale helpers, and tests. A pack's items are **hand-picked YouTube videos** (karaoke versions) and/or **whole YouTube playlists** as sections.
- ~15 **seed packs** shipped as JSON (crowd pleasers, decades 80s–2010s, Latin, moods), produced by a semi-automated curation pipeline under `scripts/packs/` that searches YouTube through the API's existing module, prefers trusted karaoke channels, and checks embeddability. Link-rot verification runs on demand or weekly, never in PR CI.
- **API**: `POST /packs/resolve` hydrates pack items into full `YouTubeVideo` objects (Redis-cached, embeddability-filtered); WS `addVideos` appends, shuffles in, or replaces the queue with a batch (replace is host-only).
- **Web surfaces**: a **Packs tab** in the phone remote with filters; pack detail with Add all / Shuffle in / Play now / Add a handful plus per-song actions; packs replace starter playlists on browse-idle, empty queue, and import quick picks; the **TV idle screen** shows featured packs with the room QR.
- **User packs on device**: create from queue, history, or search; edit, reorder, delete; persisted in browser storage.
- **Sharing**: publish a pack to Redis under a code like `AHK-7F3K` with a 30-day TTL; share by link or QR; `?pack=CODE` opens it for import. Strict size and rate limits.
- `packages/curated-playlists` and `components/curated-playlists/*` are removed once the Packs UI replaces them.

**Non-goals:** accounts, databases, cross-device sync, a public pack directory, original (non-karaoke) versions, paid content, lyrics rendering outside the YouTube video, auto-DJ (future: "Add a handful" is the seed for it).

## Capabilities

### New Capabilities

- `song-pack-catalog`: schema, loader, taxonomy, seed data, curation/verification scripts.
- `song-pack-queue-actions`: `/packs/resolve` hydration and `addVideos` WS batch command with modes.
- `song-pack-surfaces`: Packs tab, pack detail, browse/queue/import integration, TV idle featured carousel.
- `song-pack-user-packs`: on-device creation and editing.
- `song-pack-sharing`: share codes, link/QR, import via URL command.

### Modified Capabilities

- `url-command-surface`: `tab` gains `packs`; new `pack` key (share code) in the catalog and apply order.
- `curated-playlist-catalog`, `curated-playlist-suggestions`: **superseded** and removed.
- `http-room-control`: not changed, but `addVideos` reuses its host-only guard pattern.

## Impact

- **New:** `packages/song-packs/`, `scripts/packs/`, `apps/api/src/modules/packs/*`, `apps/api/src/plugins/packs.plugin.ts`, `apps/web/src/components/packs/*`, `apps/web/src/store/packsStore.ts`, `apps/web/src/hooks/use-packs*.ts`, locale keys `packs.*`.
- **Changed:** `packages/validators/src/ws/client-message.ts` (`addVideos`), `packages/validators/src/url-commands.ts` (`tab`, `pack`), `apps/api/src/modules/room/room-service.ts`, `MobileBottomNav.tsx`, `RemoteTabPanel.tsx`, `BrowseSuggestionsList.tsx`, `VideoQueue.tsx`, `import-playlist-panel` (replaced), `TvRoomLobby.tsx` / `TvIdleLayoutSwitch.tsx`, `docs/agents/url-commands.md`, `llms.txt`.
- **Removed:** `packages/curated-playlists/`, `apps/web/src/components/curated-playlists/`, `curatedStore.ts`, `use-curated-catalogs.ts`, `curated-catalog-label.ts` and tests.
- **Ops:** new Redis key prefixes `pack:resolve:<videoId>`, `pack:share:<code>`; optional weekly GitHub Action `packs-verify.yml` that opens an issue listing dead videos.
