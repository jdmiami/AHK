## 0. Fork hygiene and pruning (PR 1)

- [x] 0.1 Delete `apps/tizen`, `apps/android-tv`; remove root scripts `build:tizen*`, `build:android-tv`, `check:android-tv`; drop their Turbo `globalEnv` entries
- [x] 0.2 Delete workflows `tizen-packaging.yml`, `release-tizen.yml`, `android-tv-packaging.yml`, `release-android.yml`
- [x] 0.3 Delete `.github/FUNDING.yml`, `docs/vi/`, `docs/standalone-tv-deployment.md`
- [x] 0.4 Scrub upstream Sentry DSNs/org/project from `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`, `scripts/sentry/*`; leave Sentry optional and unset
- [x] 0.5 Re-point `build-push-docker.yml` to `${{ vars.DOCKERHUB_OWNER }}`; gate push on the variable
- [x] 0.6 Add `docs/ahk/CREDITS.md` (vkara MIT attribution, library thanks); add AHK copyright line to `LICENSE` keeping the original
- [x] 0.7 Archive `openspec/changes/android-tv-shell-sideload` as superseded
- [ ] 0.8 `bun run ci` green; `bun.lock` updated after workspace removal

## 1. Brand module and strings (PR 2)

- [ ] 1.1 Add `apps/web/src/lib/brand.ts` (`short`, `full`, `tagline`, `url`)
- [ ] 1.2 Rewrite `en.ts` copy for AHK (`seo.*`, `youtubePage.selectLayoutMode`, lobby, invite, about); interpolate `{brand}` where the name appears
- [ ] 1.3 Update `layout.tsx` metadata, `lib/seo/*`, `llms.txt` route, PWA manifest (name, short_name, theme_color `#07060B`, background_color)
- [ ] 1.4 Add Vitest guard: no `/vkara/i` in locale values or in `apps/web/src/**` string literals that render to users

## 2. Theme (PR 2)

- [ ] 2.1 Replace `:root` and `.dark` HSL tokens in `globals.css` per design D2; add `--ahk-glow-*`
- [ ] 2.2 Apply glow to active bottom-nav tab, primary button focus/hover, now-playing bar edge, TV lobby room code
- [ ] 2.3 Verify `/tv` route: `bun run build` passes `tv-downlevel` + `tv-verify`; no forbidden CSS features
- [ ] 2.4 Contrast check (AA) for text on `--primary`, `--secondary`, cards, both themes

## 3. Monogram and icons (PR 2)

- [ ] 3.1 Create `apps/web/brand/ahk-mark.svg`, `ahk-mark-flat.svg`, `ahk-lockup.svg`
- [ ] 3.2 Rewrite `scripts/generate-pwa-icons.mjs` to rasterise SVGs; emit icons, maskable, apple-touch, favicon, OG 1200×630
- [ ] 3.3 Delete `brand/sheet-source.png`, `brand/lockup-source.png`, `public/icons/vkara-icon.svg`, `public/icons/tv-banner-320x180.png`, upstream screenshots in `assets/image/`
- [ ] 3.4 Update `components/icons/*` and any inline logo usage (TV lobby, join page, QR logo) to the new mark

## 4. Locales (PR 2)

- [ ] 4.1 Create `locales/es.ts` with every `en.ts` key translated
- [ ] 4.2 Delete `locales/vi.ts`; update `client.ts`, `server.ts`, `middleware.ts` (`en` default, `['en','es']`)
- [ ] 4.3 Rename `appearance.languageVietnamese` → `appearance.languageSpanish`; update language switcher
- [ ] 4.4 Update `UiLocale` and `suggestLocales` in `packages/curated-playlists` to `en`/`es`; fix tests
- [ ] 4.5 Add `tests/locales/parity.test.ts` (key parity + no upstream name)
- [ ] 4.6 Update URL-command and agent docs examples (`/en` → `/`, add `/es`)

## 5. Docs (PR 2)

- [ ] 5.1 Rewrite `README.md` for AHK (hero with lockup, how a night works, hosting on Vercel + VPS, developers, credits link)
- [ ] 5.2 Update `containers/README.md`, `docs/agents/*.md`, `docs/monorepo-architecture.md` wording; placeholder domain `https://ahk.example`
- [ ] 5.3 Update `.env.example` header comments

## 6. Verification (PR 2)

- [ ] 6.1 `bun run ci` green
- [ ] 6.2 Playwright screenshots (phone remote, TV lobby, light + dark) attached to the PR for owner approval of the look
- [ ] 6.3 Owner spot-check list of 30 Spanish strings in the PR description
