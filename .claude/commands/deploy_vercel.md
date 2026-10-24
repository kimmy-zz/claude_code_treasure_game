---
description: Build the frontend and deploy it to Vercel production, then report the live URL
allowed-tools: Bash(npm run build:*), Bash(npx vercel:*), Bash(npx --yes vercel@latest:*)
---

Deploy this project to Vercel and give me the public URL.

Steps:

1. Check that the Vercel CLI is logged in: `npx --yes vercel@latest whoami`.
   If it says "Logged out", stop and tell me to run `! npx vercel login` myself (it is interactive), then re-run this command.
2. Build locally to catch errors early: `npm run build`. If it fails, show the error and stop.
3. Deploy to production from the project root:
   `npx --yes vercel@latest deploy --prod --yes`
   - The first run links the project (it creates `.vercel/`, which is gitignored).
   - Vercel builds with `npm run build`; the output directory is `build` (not `dist`), so make sure `vercel.json` sets `"outputDirectory": "build"`.
4. Report the production URL (the `Aliased:` / `Production:` line, usually `https://<project>.vercel.app`) as a clickable link.

Limitations to mention in the report:
- Only the static frontend is deployed. The Express + SQLite API in `server/` needs a long-running Node process, so on Vercel sign-up / sign-in, saved games and the leaderboard won't work. **Guest mode works.**
- Deployments are public by default unless Vercel Deployment Protection is enabled for the project.
