## ADDED Requirements

### Requirement: Share codes without accounts

The API MUST expose `POST /packs/share` accepting a schema-valid pack (≤ 64 KB serialized), forcing `curator.kind = 'user'` and `featured = false`, and returning `{ code, url, expiresAt }` where `code` is `AHK-` followed by 4 Crockford base32 characters. The pack MUST be stored in Redis under `pack:share:<code>` with a 30-day TTL. The route MUST be limited to 10 requests per hour per IP. `GET /packs/share/:code` MUST return `{ pack, expiresAt }` and refresh the TTL to 30 days.

#### Scenario: Share and fetch

- **WHEN** a user shares a pack and a friend opens the returned URL within 30 days
- **THEN** the friend sees the same pack and its expiry is extended

#### Scenario: Oversized pack

- **WHEN** the serialized pack exceeds 64 KB or 300 items
- **THEN** the API responds 413 with a stable error code and stores nothing

### Requirement: Share sheet

The pack detail overlay for a user pack MUST offer Share, producing a link and a QR code (Web Share API when available, else copy link and QR image).

#### Scenario: Share from phone

- **WHEN** the user taps Share on My pack
- **THEN** the share sheet shows the link and QR for `<app url>/?pack=AHK-XXXX`

### Requirement: Import via URL command

The URL command catalog MUST gain `pack=<code>` (applied after `tab`, home only). Applying it MUST fetch the shared pack and open its detail overlay with a "Save to my packs" action. It MUST NOT mutate the queue by itself and the key MUST be stripped after apply like other consumed keys.

#### Scenario: Open shared link

- **WHEN** a visitor opens `/?roomId=4821&pack=AHK-7F3K`
- **THEN** they join the room, the pack overlay opens, and the URL no longer contains `pack`

#### Scenario: Expired code

- **WHEN** the code is unknown or expired
- **THEN** a toast says the shared pack is no longer available and nothing else changes
