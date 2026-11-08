## ADDED Requirements

### Requirement: Resolve endpoint

The API MUST expose `POST /packs/resolve` accepting `{ items: SongPackItem[] }` (1–300 items) and returning `{ videos: YouTubeVideo[], unresolved: { videoId, reason }[] }`. Video items MUST be hydrated with the existing video hydration helper and cached in Redis under `pack:resolve:<videoId>` for 7 days. Playlist items MUST be expanded with the existing cached playlist details resolver. Non-embeddable videos MUST be reported in `unresolved` with reason `notEmbeddable`, not returned in `videos`. The route MUST be rate limited per IP.

#### Scenario: Mixed pack resolves

- **WHEN** a client posts 30 video items and 1 playlist item
- **THEN** the response contains hydrated videos in pack order followed by the playlist's videos, and any failures appear in `unresolved`

#### Scenario: Cache hit

- **WHEN** the same video id is requested within 7 days
- **THEN** no YouTube request is made for it

### Requirement: Batch queue command

The WebSocket protocol MUST accept `addVideos { videos: YouTubeVideo[] (1–300), mode: 'append' | 'shuffle' | 'replace', source?: { packId } }`. `append` MUST preserve order and skip ids already queued or playing. `shuffle` MUST randomise server-side then append. `replace` MUST be host-only, clear the queue, start the first video, and queue the rest. The server MUST emit one room broadcast per batch.

#### Scenario: Guest tries replace

- **WHEN** a non-host sends `addVideos` with mode `replace`
- **THEN** the server responds with the existing not-host error and the queue is unchanged

#### Scenario: Append dedupes

- **WHEN** 10 videos are appended and 3 are already in the queue
- **THEN** 7 are added and the toast reports 7

### Requirement: Four pack actions

The pack detail UI MUST offer Add all (append), Shuffle in (shuffle), Play now (replace; visible only to the host; requires confirmation), and Add a handful (client selects up to 5 random unqueued items then appends). Per-song Add / Play next / Play now MUST remain available on each resolved item.

#### Scenario: Add a handful on a small pack

- **WHEN** the pack has 3 unqueued items
- **THEN** all 3 are appended and no error is shown
