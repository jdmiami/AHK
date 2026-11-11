## ADDED Requirements

### Requirement: Packs tab

The phone remote MUST include a `packs` tab in the bottom navigation between Search and Queue, reachable via the `tab=packs` URL command. It MUST show filter chips (genre, decade, mood, language, energy, difficulty, hide explicit), a featured rail, and a grid of pack cards showing cover, localized title, item count, and badges for explicit and featured.

#### Scenario: Filter by decade

- **WHEN** the user selects the `90s` chip
- **THEN** only packs tagged `90s` remain and the chip shows as active

### Requirement: Pack detail overlay

Tapping a pack card MUST open a detail overlay with cover, title, description, tags, curator, the four pack actions, and the resolved song list using the same list component and per-song actions as search. While resolving, a skeleton MUST show; if some items are unresolved, a count with reason MUST be shown.

#### Scenario: Partially resolvable pack

- **WHEN** 2 of 30 items are not embeddable
- **THEN** 28 songs are listed, and a notice reads that 2 could not be loaded

### Requirement: Packs replace starter playlists

Browse-idle, empty-queue, and import quick-pick surfaces MUST show featured packs in place of the former curated playlist panel, and the curated playlist package and components MUST be removed in the same change.

#### Scenario: Empty queue

- **WHEN** the queue has zero items
- **THEN** a featured packs rail is visible with the existing empty-state guidance

### Requirement: TV idle featured carousel

When nothing is playing and the queue is empty, the TV screen MUST show up to 6 featured operator packs rotating every 8 seconds beside the room QR. Packs MUST be focusable with the D-pad; selecting one MUST append the first 10 resolved items to the queue. The TV MUST never perform `replace`. The carousel MUST pass the Chrome 76 downlevel build.

#### Scenario: Select on TV

- **WHEN** the host presses OK on a focused pack card on the TV
- **THEN** up to 10 songs are appended and playback starts if the room was idle
