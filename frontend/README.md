# Life Tracker — Frontend

Track your life, one day at a time. Habits, moods, and milestones in one joyful little place.

Built with [Next.js 16](https://nextjs.org) (App Router), TypeScript, and Tailwind CSS v4.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the root redirects to `/login`.

## Screens

- **`/login`** — split-screen sign-in: brand panel + tagline on one side, login form card on the other. _(auth is stubbed for now; submitting takes you to the dashboard)_
- **`/dashboard`** — the authenticated home, rendered inside the app shell with a full-height sidebar. More sidebar menus are coming.

## Project structure

```
src/
  app/
    layout.tsx        # root layout — fonts (Inter + Fraunces) & metadata
    globals.css       # Tailwind theme + pastel palette
    page.tsx          # redirects to /login
    login/            # split-screen login
    (app)/            # authenticated shell (sidebar + main)
      layout.tsx
      dashboard/
  components/
    Sidebar.tsx       # full-height nav (menus to come)
```

## Design

- **Fonts:** Inter for body, Fraunces (display serif) for highlighted keywords.
- **Palette:** a lively pastel scheme (`cream`, `blush`, `peach`, `butter`, `mint`, `sky`, `lilac`) with `grape`/`coral` accents, defined as Tailwind theme colors in `globals.css`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
