# lit-clock — Rebuild & Refactor Spec

> **Purpose of this document.** This is a complete, self-contained build spec for
> rebuilding the existing `LitClock` project into the empty `lit-clock` repo as a
> clean, well-commented refactor. It was written by a stronger model after a full
> review of the original code so that a more cost-effective model can execute the
> build step-by-step without needing to re-derive any decisions.
>
> **Golden rule:** Do **NOT** modify anything in the old `../LitClock` repo. Only
> read from it (to copy data/fonts/assets) and write into `lit-clock`.

---

## 1. What the app is

A static **SvelteKit 2 + Svelte 5 (runes)** "literary clock." Every update interval
it shows a quote from a book that references the current time. The matching time
phrase is bolded. The app is fully client-side, prerendered to static files by
`@sveltejs/adapter-static`, and deployed to GitHub Pages via GitHub Actions.

Quotes are flat JSON files under `static/data/quotes/`, one per minute, named
`HH_MM.json`. Each file is an array of entries with this exact schema (verified
uniform across all 1,433 files / 3,635 entries):

```json
{
  "time": "12:00",
  "quote_first": "Towards ",
  "quote_time_case": "noon",
  "quote_last": " he rose and began to write a letter...",
  "title": "The Tale of Genji",
  "author": "Murasaki Shikibu",
  "sfw": "yes"
}
```

`sfw` is `"yes"` or `"no"` (164 entries are `"no"`). A `test.json` fixture also
exists for test mode.

### Core behaviors (must be preserved exactly)

- **Quote display:** `quote_first` + **bold** `quote_time_case` + `quote_last`,
  rendered with `white-space: pre-line` (newlines from `<br>` are preserved).
- **Adaptive font size:** quote font tier is chosen by total character count
  (`<150` = s, `<300` = m, `<500` = l, else xl). Attribution font scales to match
  the quote's tier.
- **Update interval:** 1 / 5 / 10 / 15 minutes. Interval maps to a tolerance window
  (`1→0, 5→2, 10→5, 15→7`); the loader fetches every minute file in
  `current ± tolerance`, pools them, and picks one at random. Updates align to clean
  interval boundaries via `msUntilNextTick`.
- **Manual overrides:** date and/or time can be set manually. A manual time "ticks
  forward" from the moment it was set (`setAt` timestamp) rather than freezing. When
  both date and time are manual, midnight crossings advance the date.
- **Settings (persisted to `localStorage`):** date mode, time mode, update interval,
  display-exact-time, SFW-only, invert (dark), theme, test mode.
- **Themes:** `paper`, `quiet`, `focus`, `bold`, each with a light + inverted dark
  palette. Driven by `data-theme` / `data-invert` attributes on `<html>` and CSS
  variables. Local fonts via `@font-face`.
- **Hidden gestures:** 4 quick taps on the date header opens Settings; 4 quick taps
  on the Settings heading toggles test mode.
- **SFW filter:** when on, only `sfw === "yes"` entries are eligible.
- **Sanitization:** at load time, decode HTML entities, strip tags (`<br>` → newline),
  convert Unicode mathematical-alphanumeric glyphs (U+1D400–U+1D7FF) to ASCII, and
  normalize whitespace.
- **iOS PWA viewport fix:** `--app-height` CSS var is kept in sync with
  `visualViewport.height` to handle iOS standalone landscape launch quirks.

---

## 2. Decisions locked for this rebuild

| Decision | Choice |
|---|---|
| Refactor scope | **Streamline + light improvements.** Behavior stays identical; remove duplication, add small shared helpers, fix housekeeping. No big structural rewrites. |
| Sanitization | **Keep runtime sanitize** (in the loader). No dataset migration. |
| Dev tooling | **None.** App code only — no Prettier/ESLint/Vitest. |
| This spec | Lives in chat **and** as this `PLAN.md` in the repo. |

### What "light improvements" means concretely (the only deltas vs. the original)

1. **Single source of truth for quote sizing.** Extract the `charCount → tier`
   logic into `src/lib/utils/quoteSize.js`. Both `+page.svelte` and
   `QuoteDisplay.svelte` import it instead of each re-computing it.
2. **Centralize the font-size tiers in CSS.** Define the `clamp()` tier values once
   (as CSS custom properties in `themes`) and have both the quote and the
   attribution row consume them, instead of duplicating the `clamp()` literals in
   three places. (See §5 `QuoteDisplay` / `+page` notes for the exact approach.)
3. **`constants.js`** for magic numbers (tolerance map, size thresholds, tap config,
   `localStorage` key).
4. **Real settings type** — add `src/lib/stores/settings.types.d.ts` so the existing
   JSDoc `import('./settings.types').Settings` references resolve.
5. **Shared tap-gesture helper** — `src/lib/actions/tapGesture.js`, used by both
   `DateHeader` and the `SettingsPanel` heading.
6. **Simplify `+page.svelte` reactivity** — replace the manual
   `prevInterval/prevSfw/prevTestMode` tracking with a cleaner runes approach.
7. **Fix the GitHub Pages base path** — `'/LitClock'` → `'/lit-clock'`.
8. **Housekeeping** — add `.DS_Store` to `.gitignore`; do not copy any `.DS_Store`
   files into the new repo.

Everything not listed above should be ported **as-is** (just re-read for clarity and
add explanatory comments for a human reviewer).

---

## 3. Target file tree

```
lit-clock/
├── .github/
│   └── workflows/
│       └── deploy.yml              # ported as-is (workflow already generic)
├── .gitignore                      # ported + add .DS_Store
├── .npmrc                          # ported as-is (engine-strict=true)
├── PLAN.md                         # this file
├── README.md                       # updated (name, base-path note)
├── jsconfig.json                   # ported as-is
├── package.json                    # name → "lit-clock"
├── svelte.config.js                # base path → '/lit-clock'
├── vite.config.js                  # ported as-is
├── src/
│   ├── app.html                    # ported (update description/name text)
│   ├── app.css                     # ported as-is
│   ├── lib/
│   │   ├── index.js                # ported as-is (placeholder)
│   │   ├── constants.js            # NEW
│   │   ├── stores/
│   │   │   ├── settings.js         # ported (import constants for storage key)
│   │   │   └── settings.types.d.ts # NEW
│   │   ├── utils/
│   │   │   ├── timeUtils.js        # ported, re-commented
│   │   │   ├── quoteSize.js        # NEW (single source of truth for tiers)
│   │   │   └── quoteLoader.js      # ported (import constants; keep sanitize)
│   │   ├── actions/
│   │   │   └── tapGesture.js       # NEW (shared 4-tap helper)
│   │   ├── components/
│   │   │   ├── DateHeader.svelte   # ported, use tapGesture + quoteSize where relevant
│   │   │   ├── QuoteDisplay.svelte # ported, use quoteSize + shared CSS tiers
│   │   │   ├── Attribution.svelte  # ported as-is
│   │   │   └── SettingsPanel.svelte# ported, use tapGesture for heading
│   │   ├── themes/
│   │   │   ├── paper.css           # ported (optionally add shared tier vars)
│   │   │   └── fonts.css           # ported as-is
│   │   └── assets/
│   │       ├── favicon.svg         # copied
│   │       └── fonts/              # copied (all .otf/.ttf/.ttc) — see §6
│   └── routes/
│       ├── +layout.js              # ported as-is (prerender = true)
│       ├── +layout.svelte          # ported, re-commented
│       └── +page.svelte            # ported, simplified reactivity
└── static/
    ├── apple-touch-icon.png        # copied
    ├── favicon.png                 # copied
    ├── robots.txt                  # copied
    └── data/
        └── quotes/                 # copied — all 1,433 JSON files + test.json
```

> Do **not** copy any `.DS_Store` files. Do not copy `node_modules`, `build`, or
> `.svelte-kit`.

---

## 4. Build order

Do it in this order so the project is runnable as early as possible:

1. **Config & scaffolding:** `.gitignore`, `.npmrc`, `package.json`,
   `svelte.config.js`, `vite.config.js`, `jsconfig.json`, `.github/workflows/deploy.yml`,
   `src/app.html`, `src/app.css`.
2. **Static assets:** copy `static/` (data + icons) and `src/lib/assets/` (fonts +
   favicon) from `../LitClock`. (Bulk copy commands in §6.)
3. **Foundations:** `src/lib/constants.js`, `src/lib/stores/settings.types.d.ts`,
   `src/lib/stores/settings.js`.
4. **Utils:** `src/lib/utils/timeUtils.js`, `src/lib/utils/quoteSize.js`,
   `src/lib/utils/quoteLoader.js`, `src/lib/actions/tapGesture.js`.
5. **Themes:** `src/lib/themes/fonts.css`, `src/lib/themes/paper.css`.
6. **Components:** `Attribution.svelte`, `QuoteDisplay.svelte`, `DateHeader.svelte`,
   `SettingsPanel.svelte`.
7. **Routes:** `+layout.js`, `+layout.svelte`, `+page.svelte`.
8. **Verify:** §7 checklist.

---

## 5. File-by-file instructions

For every file: add a short top-of-file comment block explaining the file's role,
and inline comments on any non-obvious logic (overrides, gestures, sizing, the iOS
viewport fix, sanitization). Comments are for a human dev who will extend this later.

### 5.1 `package.json`
Port from original; change `"name"` to `"lit-clock"`. Keep scripts and the exact
dependency versions from the original (do not bump):
```json
{
  "name": "lit-clock",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.10",
    "@sveltejs/kit": "^2.57.0",
    "@sveltejs/vite-plugin-svelte": "^7.0.0",
    "svelte": "^5.55.2",
    "vite": "^8.0.7"
  }
}
```

### 5.2 `svelte.config.js`
Port as-is **except** the base path. Set:
```js
base: process.env.NODE_ENV === 'production' ? '/lit-clock' : ''
```
Keep `adapter-static` with `fallback: '404.html'`, `strict: true`, and the
`runes` compilerOption.

### 5.3 `vite.config.js`, `jsconfig.json`, `.npmrc`, `+layout.js`, `src/lib/index.js`
Port verbatim. `+layout.js` is just `export const prerender = true;`.

### 5.4 `.gitignore`
Port and add `.DS_Store`:
```
node_modules/
.svelte-kit/
build/
.env
.env.*
!.env.example
.DS_Store
```

### 5.5 `.github/workflows/deploy.yml`
Port verbatim — it's already repo-name-agnostic (checkout → setup-node 20 → `npm ci`
→ `npm run build` with `NODE_ENV=production` → upload-pages-artifact `build` →
deploy-pages). No changes needed.

### 5.6 `src/app.html`
Port as-is. Optionally update the `<meta name="description">` text to reference
"lit-clock" if desired, but it's cosmetic. Keep `data-theme="paper"`, the viewport
meta, apple-touch-icon, and `favicon.svg` link.

### 5.7 `src/app.css`
Port verbatim. It imports `./lib/themes/fonts.css` and `./lib/themes/paper.css`,
does the box-sizing reset, and the iOS `-webkit-fill-available` height handling.

### 5.8 `src/lib/constants.js` (NEW)
Centralize magic numbers. Suggested contents:
```js
// Central place for tunable constants used across the app.

// localStorage key for persisted settings.
export const STORAGE_KEY = 'litclock_settings';

// Update interval (minutes) → +/- tolerance window (minutes) of quote files
// to pool together. 1m = exact match only.
export const TOLERANCE_BY_INTERVAL = { 1: 0, 5: 2, 10: 5, 15: 7 };

// Available update intervals shown in Settings.
export const UPDATE_INTERVALS = [1, 5, 10, 15];

// Quote length (total chars) → size tier. Used to scale quote + attribution font.
// Tiers: 'q-s' | 'q-m' | 'q-l' | 'q-xl'
export const SIZE_THRESHOLDS = { s: 150, m: 300, l: 500 };

// Hidden multi-tap gesture: N taps within WINDOW ms triggers the action.
export const TAP_COUNT = 4;
export const TAP_WINDOW_MS = 700;

// Available themes.
export const THEMES = ['paper', 'quiet', 'focus', 'bold'];
```

### 5.9 `src/lib/stores/settings.types.d.ts` (NEW)
Provide the type the JSDoc already references:
```ts
export interface TimeOverride { hour: number; minute: number; setAt?: number; }
export interface DateOverride { day: number; month: number; year: number; setAt?: number; }

export interface Settings {
  dateMode: 'auto' | 'manual';
  dateOverride: DateOverride | null;
  timeMode: 'auto' | 'manual';
  timeOverride: TimeOverride | null;
  updateInterval: 1 | 5 | 10 | 15;
  displayExactTime: boolean;
  sfwOnly: boolean;
  invert: boolean;
  testMode: boolean;
  theme: 'paper' | 'quiet' | 'focus' | 'bold';
}
```

### 5.10 `src/lib/stores/settings.js`
Port as-is, but import `STORAGE_KEY` from `constants.js` instead of the inline
string. Keep `defaults`, `loadSettings()` (with the `localStorage` guards +
try/catch), and the `createSettings()` factory exposing `subscribe`, `update`,
`reset`. Keep the `@type {import('./settings.types').Settings}` JSDoc.

### 5.11 `src/lib/utils/timeUtils.js`
Port all functions verbatim (logic is correct and subtle — do not "simplify" the
override math): `getCurrentTime`, `getCurrentDate`, `formatDate`, `formatTime`,
`toFileKey`, `msUntilNextTick`. Add/keep clear comments explaining the `setAt`
tick-forward behavior and the date/time coupling at midnight. Keep JSDoc.

### 5.12 `src/lib/utils/quoteSize.js` (NEW)
Single source of truth for the size tier (removes duplication between `+page` and
`QuoteDisplay`):
```js
import { SIZE_THRESHOLDS } from '../constants.js';

/** Total visible character count of a quote. */
export function quoteCharCount(quote) {
  if (!quote) return 0;
  return (quote.quote_first ?? '').length
       + (quote.quote_time_case ?? '').length
       + (quote.quote_last ?? '').length;
}

/** Map a quote to its size-tier class: 'q-s' | 'q-m' | 'q-l' | 'q-xl'. */
export function quoteSizeClass(quote) {
  const n = quoteCharCount(quote);
  if (n < SIZE_THRESHOLDS.s) return 'q-s';
  if (n < SIZE_THRESHOLDS.m) return 'q-m';
  if (n < SIZE_THRESHOLDS.l) return 'q-l';
  return 'q-xl';
}
```

### 5.13 `src/lib/utils/quoteLoader.js`
Port as-is, with two tweaks:
- Import `TOLERANCE_BY_INTERVAL` from `constants.js` and use it inside
  `buildTimeWindow` instead of the inline `toleranceMap`.
- Keep `sanitizeText`, `sanitizeQuote`, `fetchQuoteFile`, and `loadQuote` logic
  intact (runtime sanitize stays). Keep the `test.json` fixture branch and the SFW
  filter. Keep the `import { base } from '$app/paths'` for correct GitHub Pages URLs.
- Heavily comment `sanitizeText` (entity decode via `<textarea>`, tag strip,
  math-alphanumeric → ASCII, whitespace rules) since it's the least obvious code.

### 5.14 `src/lib/actions/tapGesture.js` (NEW)
Shared N-tap gesture so `DateHeader` and `SettingsPanel` don't duplicate it.
Implement as a small Svelte action that fires a callback after `TAP_COUNT` taps
within `TAP_WINDOW_MS`. Two viable shapes — pick whichever integrates cleaner:

```js
import { TAP_COUNT, TAP_WINDOW_MS } from '../constants.js';

// Svelte action: use:tapGesture={onActivate}
// Counts taps/clicks; calls onActivate() once TAP_COUNT happen within TAP_WINDOW_MS.
export function tapGesture(node, onActivate) {
  let count = 0;
  let timer = null;

  function handle() {
    count++;
    clearTimeout(timer);
    if (count >= TAP_COUNT) { count = 0; onActivate?.(); return; }
    timer = setTimeout(() => { count = 0; }, TAP_WINDOW_MS);
  }
  function onKey(e) { if (e.key === 'Enter') handle(); }

  node.addEventListener('click', handle);
  node.addEventListener('keydown', onKey);

  return {
    update(next) { onActivate = next; },
    destroy() { clearTimeout(timer); node.removeEventListener('click', handle); node.removeEventListener('keydown', onKey); }
  };
}
```
Then in markup: `<header use:tapGesture={() => onSettingsOpen()} ...>`. Keep the
existing `role="button"` / `tabindex="0"` / `aria-label` attributes for a11y.

> If wiring the action into the existing element proves awkward (e.g. the heading is
> a `<p>`), it's acceptable to keep a tiny inline counter — but prefer the action to
> remove duplication.

### 5.15 `src/lib/themes/fonts.css`
Port verbatim (the `@font-face` set: SF Pro Text 500/700/800, Charter 400/700,
Georgia 400/700, Avenir Next 400/700, all `font-style: normal`). Requires the font
files in `src/lib/assets/fonts/` (§6).

### 5.16 `src/lib/themes/paper.css`
Port verbatim — the 4 themes + inverted variants and their CSS variables
(`--bg`, `--text-primary`, `--text-muted`, `--border`, fonts, weights, `--qd-s/m/l`,
`--quote-leading`, `--attr-size`, `--date-size`).

**Optional (recommended) de-duplication of font tiers:** the `clamp()` tier
expressions are currently duplicated in `QuoteDisplay.svelte` and the
`.attribution-row` block of `+page.svelte` (and again in each landscape media
query). To make them a single source of truth, define them once as CSS variables
(e.g. `--fs-q-s`, `--fs-q-m`, `--fs-q-l`, `--fs-q-xl`, plus landscape overrides via a
media query on `:root`/`[data-theme]`) and reference those vars in both
`QuoteDisplay` and the attribution row. If this gets fiddly, it is acceptable to
keep the literals duplicated but add a comment in each location pointing to the
other so they stay in sync. **Do not change the actual clamp values** — the current
responsive sizing is carefully tuned.

### 5.17 `src/lib/components/Attribution.svelte`
Port verbatim. Props `{ title, author }`, `font-size: inherit` (so it picks up the
tier set on the parent `.attribution-row`), right-aligned, responsive padding +
landscape compression.

### 5.18 `src/lib/components/QuoteDisplay.svelte`
Port the markup and styles. Replace the inline `charCount`/`sizeClass` derivation
with the shared util:
```js
import { quoteSizeClass } from '$lib/utils/quoteSize.js';
let sizeClass = $derived(quoteSizeClass(quote));
```
Keep `white-space: pre-line`, the bold `quote_time_case`, and all the `clamp()`
font tiers + media queries (or the shared CSS vars if you did §5.16's optional step).

### 5.19 `src/lib/components/DateHeader.svelte`
Port markup/styles. Replace the inline 4-tap counter with `use:tapGesture` from
`$lib/actions/tapGesture.js` calling `onSettingsOpen`. Keep props
`{ formattedDate, formattedTime, displayExactTime, onSettingsOpen }`, the
`role="button"`, `aria-label`, and the landscape padding rule.

### 5.20 `src/lib/components/SettingsPanel.svelte`
Port the full panel (this is the biggest component — port carefully and keep all
behavior). Use the shared `tapGesture` action on the heading to toggle test mode.
Use `UPDATE_INTERVALS` and `THEMES` from `constants.js` for the `{#each}` lists.
Preserve everything else exactly:
- `seedDate()`/`seedTime()` seeding from overrides.
- `setDateMode`/`setTimeMode`, `onDateField`/`onTimeField` (with the min/max clamps:
  day 1–31, month 1–12, year 2000–2100, hour 0–23, minute 0–59), `padTwo`.
- `activateDateManual`/`activateTimeManual` on focus/click.
- The test-mode "Test" time row, and writing `setAt: Date.now()` whenever a manual
  override is set.
- All styles (overlay, rows, options, field-group active/inactive opacity, number
  inputs styled as text, the small-screen `@media (max-width: 380px)` block).

### 5.21 `src/routes/+layout.svelte`
Port verbatim, re-commented. Keep:
- `app.css` import and the `settings` store import.
- The `onMount` iOS viewport-height fix (`updateAppHeight`, the `setTimeout` retries
  at 100/500ms, `visualViewport`/`resize`/`orientationchange` listeners, cleanup).
- The two `$effect`s syncing `data-theme` and `data-invert` on `<html>`.

### 5.22 `src/routes/+page.svelte`
Port the orchestration, with the **reactivity simplification** as the one notable
change. Keep:
- State: `quote`, `displayTime`, `displayDate`, `settingsOpen`.
- `refreshQuote()`, `scheduleNextQuote()` (using `msUntilNextTick`), `startClockTick()`
  (1s interval updating display time/date).
- `onMount` (refresh + schedule + clock tick) and `onDestroy` (clear timers).
- The render: `DateHeader`, then `QuoteDisplay` + attribution row (with the tier
  class) when a quote exists, else the em-dash empty state. `SettingsPanel` when open.
- All `.page` / `.attribution-row` / `.empty-state` styles + media queries.

**Simplification:** replace the manual `prevInterval/prevSfw/prevTestMode` tracking
plus the separate display-sync effect with cleaner runes. Use the shared
`quoteSizeClass(quote)` for the attribution row tier (remove the duplicated
`quoteCharCount`/`quoteSizeClass` derivations). Recommended shape:

```js
import { quoteSizeClass } from '$lib/utils/quoteSize.js';

let quote = $state(null);
let displayTime = $state(getCurrentTime($settings));
let displayDate = $state(getCurrentDate($settings));
let settingsOpen = $state(false);
let sizeClass = $derived(quoteSizeClass(quote));

// Re-fetch + reschedule when the inputs that change the quote pool change.
// Reading these three inside the effect registers them as dependencies, so we
// no longer need manual prev-value bookkeeping.
$effect(() => {
  // touch dependencies
  $settings.updateInterval; $settings.sfwOnly; $settings.testMode;
  refreshQuote();
  scheduleNextQuote();
});

// Keep the on-screen clock/date in sync with manual-override changes immediately.
$effect(() => {
  displayTime = getCurrentTime($settings);
  displayDate = getCurrentDate($settings);
});
```

> Behavioral note to preserve: the first effect must still call `refreshQuote()` +
> `scheduleNextQuote()` on the relevant settings changes. Confirm via the §7
> checklist that changing interval/SFW/test mode immediately swaps the quote, exactly
> like the original. If the dependency-touch pattern triggers an unwanted extra fetch
> on mount, guard with an `onMount`-set flag — but keep it simpler than the original
> three-variable tracking.

### 5.23 `README.md`
Rewrite lightly for the new name. Keep it short: what it is, `npm install` /
`npm run dev`, deploy via push to `main`, and the note to keep `base` in
`svelte.config.js` matching the repo name (`/lit-clock`).

---

## 6. Bulk copy commands (data, icons, fonts)

Run these to bring over the large binary/data assets unchanged (paths are the
Linux workspace mounts; adjust if running elsewhere). These exclude `.DS_Store`.

```bash
SRC=/sessions/gifted-exciting-edison/mnt/GitHub/LitClock
DST=/sessions/gifted-exciting-edison/mnt/GitHub/lit-clock

# Static data (quotes) + icons + robots
mkdir -p "$DST/static/data/quotes"
rsync -a --exclude='.DS_Store' "$SRC/static/data/quotes/" "$DST/static/data/quotes/"
cp "$SRC/static/apple-touch-icon.png" "$SRC/static/favicon.png" "$SRC/static/robots.txt" "$DST/static/"

# Fonts + favicon
mkdir -p "$DST/src/lib/assets/fonts"
rsync -a --exclude='.DS_Store' "$SRC/src/lib/assets/fonts/" "$DST/src/lib/assets/fonts/"
cp "$SRC/src/lib/assets/favicon.svg" "$DST/src/lib/assets/"

# Sanity check
echo "quote files: $(ls "$DST/static/data/quotes" | wc -l)   (expect 1434 incl. test.json)"
echo "font files:  $(ls "$DST/src/lib/assets/fonts" | wc -l)"
```

---

## 7. Verification checklist (do this before declaring done)

Functional parity is the goal — the rebuilt app should behave identically.

1. **Install & build:** `npm install` then `npm run build` completes with no errors.
   Then `npm run dev` and load the page.
2. **First paint:** within a second a real quote appears (not just the em-dash),
   with the time phrase bold.
3. **Quote sizing:** long quotes render smaller than short ones; attribution font
   matches the quote tier.
4. **Update cadence:** at 1m interval the quote changes on the minute boundary.
   Switching to 5/10/15m immediately fetches a new quote (tolerance window widens).
5. **Manual time:** set a manual time in Settings; the displayed time ticks forward
   and quotes match the overridden time. Manual date behaves likewise; crossing
   midnight with manual time advances the date.
6. **SFW filter:** toggling SFW-only changes the eligible pool (no `sfw:"no"` quotes
   when on).
7. **Themes & invert:** all four themes and the invert toggle change `data-theme`/
   `data-invert` and restyle correctly.
8. **Gestures:** 4 taps on the date header opens Settings; 4 taps on the Settings
   heading toggles Test Mode (heading text changes, time row shows "Test", quotes
   come from `test.json`).
9. **Persistence:** change settings, reload — they persist (localStorage).
10. **Sanitization:** confirm no raw `<br>`/HTML tags or weird math-glyph letters
    appear in any quote (spot-check a few).
11. **Responsive:** check portrait phone, landscape phone (short viewport), and
    desktop (max-width constraint) layouts.
12. **No leftovers:** no `.DS_Store` committed; `base` path is `/lit-clock`;
    `settings.types` JSDoc references resolve (no editor type errors).

---

## 8. Quick reference — what changed vs. the original

- `constants.js`, `quoteSize.js`, `actions/tapGesture.js`, `settings.types.d.ts` are **new**.
- `+page.svelte` reactivity simplified; size logic moved to `quoteSize.js`.
- `QuoteDisplay.svelte` / `DateHeader.svelte` / `SettingsPanel.svelte` consume the
  shared helpers instead of inline copies.
- `quoteLoader.js` / `settings.js` import constants instead of inline literals.
- `svelte.config.js` base path `/LitClock` → `/lit-clock`; `package.json` name updated.
- `.gitignore` adds `.DS_Store`; no `.DS_Store` files copied.
- Everything else is a faithful port with added human-facing comments.
```
