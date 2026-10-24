---
description: Build the frontend and publish it to GitHub Pages, then report the live URL
allowed-tools: Bash(gh auth status:*), Bash(gh repo view:*), Bash(gh api:*), Bash(git remote:*), Bash(git rev-parse:*), Bash(git status:*), Bash(npm run build:*), Bash(touch build/.nojekyll), Bash(npx --yes gh-pages@6:*), Bash(curl -s -o /dev/null:*)
---

Deploy this project's frontend to GitHub Pages and give me the public URL.

Steps:

1. Check that the GitHub CLI is logged in: `gh auth status`.
   If it isn't, stop and tell me to run `! gh auth login` myself (it is interactive), then re-run this command.
2. Find the GitHub repository:
   - `git rev-parse --is-inside-work-tree` must succeed and `git remote get-url origin` must point to GitHub.
   - If this folder isn't a git repo or has no GitHub `origin`, stop and ask me before running `git init` or creating a repo (`gh repo create` publishes code, so it needs my OK, including whether it should be public or private).
   - Get the owner and name with `gh repo view --json owner,name,visibility`.
3. Build with the Pages base path, because the site is served from `https://<owner>.github.io/<repo>/`, not from `/`:
   `npm run build -- --base=/<repo>/`
   - If the repo is named `<owner>.github.io`, use `--base=/` instead.
   - The output directory is `build` (not `dist`). If the build fails, show the error and stop.
   - Then `touch build/.nojekyll` so GitHub serves the files as-is.
4. Publish `build/` to the `gh-pages` branch (this does not touch my working branch or commit anything to it):
   `npx --yes gh-pages@6 -d build -t -m "Deploy to GitHub Pages"`
   - `-t` includes dotfiles, so `.nojekyll` is published.
   - If the push fails with an auth error, run `gh auth setup-git` and retry once.
5. Make sure Pages serves the `gh-pages` branch:
   - `gh api repos/<owner>/<repo>/pages` — if it returns 404, enable it with
     `gh api -X POST repos/<owner>/<repo>/pages -f "source[branch]=gh-pages" -f "source[path]=/"`.
   - If it is enabled with a different source, update it with `gh api -X PUT repos/<owner>/<repo>/pages -f "source[branch]=gh-pages" -f "source[path]=/"`.
   - Pages on a private repo needs a paid GitHub plan; if the API refuses for that reason, tell me and stop.
6. Wait for the Pages build: check `gh api repos/<owner>/<repo>/pages/builds/latest --jq .status` about every 15 seconds until it is `built` (stop after ~3 minutes and report the status). Then confirm the site answers with `curl -s -o /dev/null -w "%{http_code}" https://<owner>.github.io/<repo>/`.
7. Report the URL `https://<owner>.github.io/<repo>/` as a clickable link.

Limitations to mention in the report:
- Only the static frontend is deployed. The Express + SQLite API in `server/` needs a long-running Node process, so on GitHub Pages sign-up / sign-in, saved games and the leaderboard won't work. **Guest mode works.**
- GitHub Pages sites are always public, even when the repository is private.
- The first deploy can take a minute or two to appear, and browsers may cache the old version briefly after later deploys.
