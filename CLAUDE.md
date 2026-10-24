# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies (node_modules is not committed)
npm run dev       # Vite (http://localhost:3000) + API server (:3001) via concurrently
npm run server    # API server only (node server/index.js)
npm run build     # production build to ./build (not ./dist)
```

There is no test runner, linter, or `tsconfig.json` configured. TypeScript is transpiled by `@vitejs/plugin-react-swc` without type-checking, so type errors will not fail the build.

## Architecture

A single-page React 18 + Vite treasure-hunt game, exported from Figma Make.

- **Game state and rules live in `src/App.tsx`.** Three chests are created on mount; one randomly holds treasure. Opening a chest gives +100 (treasure) or −50 (skeleton). The game ends when the treasure is found or every chest is open, and "Play Again" calls `initializeGame()`. State is plain `useState` (`boxes`, `score`, `gameEnded`, `round`, `sheetOpen`, `user`), with no router or store. `round` is bumped each new game and is part of the chest keys, so tiles remount and reset their local animation state. `App` shows `src/components/AuthScreen.tsx` until the player signs in or picks guest mode. When a signed-in player's game ends, the score is POSTed once and `src/components/HistoryPanel.tsx` (stats, recent games, top-10 leaderboard behind a segmented control) refreshes. Guests' games are not saved.
- **UI is styled like an Apple app.** `ChestTile.tsx` renders one chest (hover lift, wiggle, then pop-open with glow, shine and particles; unopened chests reveal dimmed at game end). `ResultSheet.tsx` is the iOS-style result sheet shown `RESULT_SHEET_DELAY_MS` after the game ends. `ProfileAvatar.tsx` is the nav-bar avatar with the account menu (photo, sign out) and also exports `Avatar`. `SegmentedControl.tsx` is shared by the auth screen and history panel. `src/format.ts` formats money (true minus sign, `−$50`) and dates. Animations use `motion/react` (springs, `AnimatePresence`, `layoutId`), wrapped in `<MotionConfig reducedMotion="user">`.
- **Assets** are imported as ES modules: images from `src/assets/` (closed, opened, and opened-with-skeleton chests, plus `key.png`, used as the cursor over closed chests in `ChestTile`), and sound effects from `src/audios/`. `openBox` in `App.tsx` plays `chest_open.mp3` (treasure) or `chest_open_with_evil_laugh.mp3` (skeleton).
- **Backend (`server/`)**: Express on port 3001 (CommonJS). `db.js` opens `server/data.db` with Node's built-in `node:sqlite` (`DatabaseSync`, prints an ExperimentalWarning) and creates the `users`, `sessions` and `games` tables. `index.js` handles auth (scrypt password hashes, an httpOnly `sid` session cookie) and `/api/signup`, `/signin`, `/signout`, `/me`, `/games` (GET/POST), `/leaderboard` (rows include each player's `avatarUrl`), and the profile image routes (`PUT`/`DELETE /api/me/avatar`, `GET /api/users/:username/avatar`). The client POSTs only `score` and `foundTreasure`; the server derives `result` (`win` if score > 0, `loss` if < 0, else `tie`), so change win/tie/loss rules in `server/index.js`. Profile images are stored as BLOBs in `users.avatar`. `src/components/ProfileAvatar.tsx` center-crops each upload to a 256px JPEG in the browser before sending it. New `users` columns are added by a `PRAGMA table_info` check in `db.js`. Vite proxies `/api` to it. The frontend calls go through `src/api.ts`. `data.db` is gitignored. Because the backend needs a long-running Node process, it can't be deployed to GitHub Pages or Vercel static hosting as-is.
- **Styling for the app lives in `src/apple.css`** (imported after `index.css` in `main.tsx`): design tokens as CSS variables on `:root` with a `prefers-color-scheme: dark` override, plus plain class names (`.tile`, `.btn-primary`, `.sheet`, `.list`/`.row`, `.field` ...). Add new styles there rather than relying on Tailwind classes. `src/components/ui/` is an unused shadcn/ui set left over from the Figma export.

### Gotchas

- **Tailwind is precompiled, not built.** `src/index.css` is a static Tailwind v4 output, and there is no Tailwind/PostCSS plugin in the Vite config. Only utility classes already present in `index.css` work. A new class (e.g. `bg-blue-500`, which isn't there) silently has no effect. Before using a class, `grep` for it in `src/index.css`; otherwise use inline `style` or add the CSS rule yourself. `src/styles/globals.css` holds the theme tokens but is not imported anywhere.
- **Version-pinned import specifiers.** shadcn files import packages as `"@radix-ui/react-slot@1.1.2"`, `"class-variance-authority@0.7.1"`, etc. These resolve only because `vite.config.ts` aliases each `pkg@version` to `pkg`. If you add a dependency imported this way, add a matching alias; in new code, prefer plain package names.
- `@` is aliased to `src/`.
- **Two Node versions.** `package.json` lists the `node` npm package as a dependency, so `npm run …` scripts run `node_modules/.bin/node` (v26), not the system Node. Running `node server/index.js` directly uses whatever Node is on your PATH, and that one must be ≥ 22.13 for `node:sqlite` to load without a flag.

## Project context

`README.md` is a step-by-step Claude Code tutorial, not product documentation. It walks through: adding chest-open sound effects, showing a win/tie/loss result based on the final score, using `src/assets/key.png` as the hover cursor over closed chests (`src/results/key_hover.png` is a reference screenshot of the expected result), adding SQLite-based sign-up/sign-in with per-user scores plus a guest mode, and custom `.claude/commands` for Vercel and GitHub Pages deployment. Asset credits are tracked in `Attributions.md`; add a credit there for any new third-party asset.

`src/guidelines/Guidelines.md` is an empty Figma Make template with no active rules.
