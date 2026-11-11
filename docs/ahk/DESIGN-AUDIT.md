# AHK design audit (Nov 2026)

Every screen was captured on an iPhone 13 viewport (phone) and at 1920×1080 / 1366×768 (projector
laptop / TV), dark and light, against a local API and room.

## Findings and status

| # | Where | Finding | Status |
|---|-------|---------|--------|
| 1 | Intro, join lobby, TV lobby, TV idle (QR) | Brand lockup said **AHK twice**: the logo already reads "AHK", then the wordmark printed "AHK" again with the full name underneath. | Fixed: logo + "Artist House / Karaoke" (gradient on the last word). Screen readers get one label: "AHK · Artist House Karaoke". |
| 2 | Search and Queue tabs | Starter playlists were the upstream Vietnamese lists (Tự hào Việt Nam, 89x nhạc trẻ, Nhạc trẻ remix…). | Fixed: only "Random sings - Kara list" (English) remains until Song Packs replace starters. |
| 3 | Whole app | No motion at all; screens popped in. Tabs swapped with no feedback. | Fixed: see Motion below. |
| 4 | TV idle / projector | Large empty black field around the QR. | Fixed: slow neon ambient backdrop (pink top-left, cyan bottom-right). |
| 5 | Bottom nav | Active tab only changed text colour. | Fixed: one sliding pill under the active tab + icon pop. |
| 6 | Join lobby | Join button disabled state (dark text on dim magenta) reads as broken until a code is typed. | Open: consider outline style until 4 digits are entered. |
| 7 | Controls tab, nothing playing | Empty state sits at the bottom with a tall empty area above it. | Open: centre vertically or show the room QR there. |
| 8 | Search bar | Placeholder said "Search YouTube videos…" — the product is karaoke. | Fixed: "Search songs or artists…" / "Busca canciones o artistas…". |
| 9 | Phone, `?name=` invite links | Upstream warning: the connection provider sets the display name while rendering (React "Cannot update a component while rendering…"). Dev-only noise, no user impact seen. | Open (upstream). |

## Motion system

One CSS block in `apps/web/src/app/globals.css` (section "AHK motion"). No new libraries, no JS
timers.

- **Only `transform` and `opacity` animate**: they run on the compositor, no layout or paint per
  frame.
- **Run once or tie to scroll**: entrances play once on mount; list rows are driven by scroll
  position, not by timers.
- **Reduced motion**: everything is off under `prefers-reduced-motion: reduce`.
- **Old TV engines** (Chrome < 104, i.e. the Chrome 76-class TV browsers): the always-running
  backdrop and logo glow are skipped via `@supports not (translate: none)`. Entrances still run
  once. `tv-verify` passes (ES2019 JS, clean CSS).

| Class | Used on | Effect |
|-------|---------|--------|
| `ahk-enter` + `--ahk-i` | Intro (logo, title, two cards, house panel, footnote), join card, lockup name | Rise + fade, 70 ms stagger |
| `ahk-mark-draw` | AHK logo (intro, join, TV) | Letters draw in (0.7 s, staggered) |
| `ahk-mark-halo` | Logo | Breathing neon glow (gradient layer, opacity/scale) |
| `ahk-ambient` | Intro, TV idle | Two gradient orbs drifting over 22–26 s |
| `ahk-press` | Intro cards, starter playlist tiles | Lift on hover, settle on press |
| `ahk-tab-enter` | Search / Queue / Controls / History / Settings | 240 ms fade-up on every tab switch |
| `ahk-nav-indicator`, `ahk-nav-pop` | Bottom nav | Spring-sliding pill; icon pop on select |
| `ahk-reveal` | Search results, queue, history rows, starter lists | Rows ease in as they scroll into view (CSS scroll-driven animations; browsers without support show rows as-is) |

Entrances use `animation-fill-mode: backwards` so hover/press transforms still work after the
animation ends. Virtualized rows are positioned with `top` (not `transform`) because scroll-driven
timelines measure layout position.
