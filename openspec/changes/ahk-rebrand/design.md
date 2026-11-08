## Context

vkara ships a neutral slate shadcn theme, a PNG-sheet-derived icon set, Vietnamese-first copy, and two TV wrapper apps. AHK is a private-community, browser-first fork with an English/Spanish audience and its own look. The owner chose a **user-facing-only** rename to keep upstream merges feasible, and asked Claude to design the identity ("neon lounge": deep black with magenta and cyan glow).

**Stakeholders:** the owner (approves brand), friends/family using phones and a TV browser, Claude as implementer.

## Goals / Non-Goals

**Goals**
- No user-visible "vkara" anywhere: UI, metadata, icons, docs, agent docs, `llms.txt`.
- One place to change the name and tagline.
- Dark-default + light theme that reads well on a TV at 3 m and on a phone at arm's length; passes the Chrome 76 downlevel build.
- `en` default, `es` complete, `vi` gone; a test fails if `es` misses a key.
- Repo contains nothing that deploys to or bills upstream accounts.

**Non-Goals**
- Renaming `@vkara/*`, `VKARA_*`, `--vkara-*`, Docker image/service names.
- Custom fonts beyond what is already loaded (Geist).
- Marketing site or landing page redesign beyond the existing root route.

## Decisions

### D1 — Brand module, not find-and-replace

`apps/web/src/lib/brand.ts` exports `BRAND = { short: 'AHK', full: 'Artist House Karaoke', tagline: {...}, url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://ahk.example' }`. Locale strings that need the name interpolate `{brand}`; metadata and `llms.txt` import it. A Vitest test greps compiled locale objects for `/vkara/i` and fails on any hit.

*Rejected:* global sed. It would rename internal identifiers (violating the "user-facing only" decision) and leave no single source of truth.

### D2 — Palette as HSL tokens in `globals.css`

Keep the shadcn token names (`--background`, `--primary`, …) so every existing component picks up the new look without edits. **Implementation note:** `--secondary` and `--accent` are *surface* tokens in shadcn (secondary buttons, hover backgrounds), so making them cyan would light up every ghost hover. Cyan therefore lives in `--ring` (focus) and the `--neon-cyan` utility (`text-neon-cyan`, gradients); `--secondary`/`--accent` stay dark violet-grey surfaces. Values:

| Token | Dark | Light |
|---|---|---|
| `--background` | `252 30% 4%` (#07060B) | `264 100% 98%` (#FAF7FF) |
| `--card` / `--popover` | `252 27% 8%` (#110F1A) | `0 0% 100%` |
| `--foreground` | `260 100% 97%` (#F5F0FF) | `257 41% 12%` (#17122B) |
| `--muted-foreground` | `252 19% 64%` (#9A93B5) | `252 12% 45%` |
| `--primary` | `324 100% 59%` (#FF2DAA) | `325 100% 42%` (#D6007F) |
| `--primary-foreground` | `252 30% 4%` | `0 0% 100%` |
| `--secondary` | `187 100% 57%` (#22E6FF) | `188 100% 33%` (#0092A8) |
| `--accent` | `252 100% 68%` (#7C5CFF) | `252 70% 55%` |
| `--destructive` | `354 100% 65%` (#FF4D5E) | `354 80% 50%` |
| `--border` / `--input` | `252 24% 16%` (#241F33) | `264 40% 91%` (#E6E0F2) |
| `--ring` | same as `--secondary` | same as `--secondary` |

Add two brand-only vars: `--ahk-glow-primary: 0 0 24px rgba(255,45,170,.45)` and `--ahk-glow-secondary: 0 0 24px rgba(34,230,255,.40)`, used by active tab, now-playing bar, primary buttons on hover/focus. These are new names (not `--vkara-*`) because they are new tokens, not renames.

*TV constraint:* no `backdrop-filter`, `color-mix()`, `oklch()`, `:has()`, or container queries in anything the `/tv` route renders. `bun run build` runs `tv-downlevel` + `tv-verify` and must stay green.

### D3 — Monogram and SVG-driven icon pipeline

- `apps/web/brand/ahk-mark.svg`: 512×512 rounded square (radius 112), fill `#07060B`, "AHK" set in a heavy geometric sans converted to paths, letter fill `linearGradient` magenta→violet→cyan at 135°, `feGaussianBlur` glow behind the letters.
- `apps/web/brand/ahk-mark-flat.svg`: single-color (#FF2DAA on #07060B) for 16/32 px.
- `apps/web/brand/ahk-lockup.svg`: mark + "Artist House Karaoke" wordmark for OG and README.
- `scripts/generate-pwa-icons.mjs` is rewritten to rasterise these SVGs with `sharp` into `icon-32/192/512`, `maskable-icon-512` (safe-zone padding 20%), `apple-touch-icon`, `favicon.ico`, and `og-image.png` (1200×630, lockup centred over a subtle radial glow). Upstream's PNG sheet/lockup sources are deleted.

*Rejected:* hand-exporting PNGs. The repo already has a generator; keeping assets derivable from SVG means the owner can tweak the mark and regenerate.

### D4 — Locale swap

- `middleware.ts`: `DEFAULT_APP_LOCALE = 'en'`, `APP_LOCALES = ['en', 'es']`.
- `locales/client.ts` and `server.ts`: `fallbackLocale: en`; imports `en`, `es`.
- `locales/es.ts` created from `en.ts` with every key translated (Latin-American neutral Spanish, "tú" register). Brand names, "YouTube", "QR" untranslated.
- `locales/vi.ts` deleted. `appearance.languageVietnamese` → `appearance.languageSpanish`.
- `UiLocale` in `packages/curated-playlists` becomes `'en' | 'es'`; `playlists.json` `suggestLocales` updated.
- Test: `apps/web/tests/locales/parity.test.ts` asserts `Object.keys(es)` equals `Object.keys(en)` and that no value in either matches `/vkara/i`.

### D5 — Pruning in its own PR

TV shells, workflows, funding file, Sentry DSNs, and `docs/vi/` are removed in PR 1 before any brand work lands, so the rebrand diff is only brand. The browser `/tv` route and its Chrome 76 downlevel pipeline stay (TVs open the URL in their browser).

### D6 — Docker publish workflow

Matrix image names change from `lehuygiang28/vkara-*` to `${{ vars.DOCKERHUB_OWNER }}/vkara-*` (image *names* keep `vkara-*` per the rename decision; only the owner org changes). The push step is gated on the variable being set so the fork does not fail CI without credentials.

## Risks / Trade-offs

- **Contrast on light theme**: neon accents must be darkened; verified with a WCAG AA check in the PR.
- **Spanish quality**: machine-translated by Claude; owner spot-checks a listed sample of 30 keys (toasts, lobby, settings).
- **Partial upstream merges**: removing `vi`, TV shells, and later TikTok means future upstream merges will conflict in those areas. Accepted; cherry-pick.

## Open Questions

- Final domain for `BRAND.url` (placeholder `https://ahk.example`).
- Ship the light theme or dark-only (default: both, dark default).
- Display font for the wordmark only (decided at SVG review).
