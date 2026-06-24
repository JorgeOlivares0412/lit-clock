# lit-clock

The time, told through literature.

A static web app built with SvelteKit (Svelte 5 runes) and deployed to GitHub Pages. Every update interval it shows a quote from a book that mentions that exact time, with the time phrase bolded.

## Develop

```bash
npm install
npm run dev
```

## Build / preview

```bash
npm run build      # static output in build/
npm run preview    # serves build/ at http://localhost:4173/lit-clock/
```

## Deploy

Push to `main` — the GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages.

> **Note:** The production base path is set to `/lit-clock` in `svelte.config.js`. If you rename the repo, update that `base` value to match.

## Project layout

Quotes are flat JSON in `static/data/quotes/`, one file per minute (`HH_MM.json`), plus a `test.json` fixture for test mode. App logic lives in `src/lib` (`stores/`, `utils/`, `actions/`, `components/`, `themes/`), with the page assembled in `src/routes/+page.svelte`.

See `PLAN.md` for the full architecture and the rationale behind the refactor.
