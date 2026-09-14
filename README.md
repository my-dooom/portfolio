# Portfolio

Static portfolio site for [my-dooom](https://github.com/my-dooom)'s open source projects. Plain HTML/CSS/JS, no build step, deployed to GitHub Pages via Actions.

Project cards merge two sources:

- `data/projects.json` — curated: profile text, featured projects with hand-written blurbs/tags, and a `hidden` list of repos to omit (forks, templates, scratch repos).
- GitHub API at page load — stars, language, last push, follower count. Every public repo not featured or hidden lands in the "Everything else" grid automatically.

## Run locally

```sh
python -m http.server 8000
# open http://localhost:8000
```

(A server is needed because `app.js` fetches `data/projects.json`; `file://` blocks that.)

## Deploy

1. Create a repo on GitHub (e.g. `my-dooom/portfolio`) and push this folder to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` runs on every push to `main` and publishes to `https://my-dooom.github.io/portfolio/`.

To serve at `https://my-dooom.github.io/` instead, name the repo `my-dooom.github.io`. For a custom domain, add a `CNAME` file containing the domain and configure DNS per GitHub's docs.

## Customise

- Edit `data/projects.json` to change bio, featured order, blurbs, tags, or hide repos.
- Colours and fonts live in the `:root` block at the top of `styles.css`.
- Unauthenticated GitHub API calls are limited to 60/hour per IP; if exceeded, the page falls back to curated data only.
