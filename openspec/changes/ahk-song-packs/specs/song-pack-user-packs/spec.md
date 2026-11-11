## ADDED Requirements

### Requirement: Create packs on this device

Users MUST be able to create a pack from the current queue, from history, from multi-selected search results, or from a per-song "Add to pack…" action. User packs MUST validate against the pack schema with `curator.kind = 'user'` and `featured = false`, and MUST persist in browser storage under a versioned key with the app's migrating persist storage.

#### Scenario: Save queue as pack

- **WHEN** the user taps "Save queue as pack" and enters a title
- **THEN** a pack with every queued video (in order) appears under "My packs" and survives a page reload

### Requirement: Edit packs

Users MUST be able to rename, edit description and tags, reorder items, remove items, add items by searching, change the cover, duplicate an operator pack into My packs, and delete a pack.

#### Scenario: Reorder

- **WHEN** the user moves item 5 to position 1
- **THEN** the stored pack reflects the new order and the detail view re-renders in that order

### Requirement: Limits

The device MUST store at most 50 user packs of at most 300 items each; attempts beyond the cap MUST show a toast and not corrupt storage.

#### Scenario: Cap reached

- **WHEN** a 51st pack is created
- **THEN** a toast explains the limit and the 50 existing packs remain intact
