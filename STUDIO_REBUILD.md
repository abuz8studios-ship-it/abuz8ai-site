# Website rebuild — honest plan (2026-08-21)

## Done
- `crew.html` + `amanecer.html` + `/crew` `/amanecer` redirects
- Homepage nav **Crew** link
- Crew restyled on **abuz8-theme.css** (lapis / muted gold / green) — same as rest of site

## Live truth
- Pushed to `abuz8studios-ship-it/abuz8ai-site` `main`
- `https://abuz8ai.com/crew` still served homepage when checked (Pages lag **or** this project not the live hook)
- `wrangler` **not logged in** on this machine — I cannot publish from here until you run `wrangler login`

## React + Three.js $100k rebuild
Do **not** flip `pages_build_output_dir` to a Vite app tonight — that 404s 1,400 existing URLs (tools, blog, rescue).

**Right sequence:**
1. You: Cloudflare login / confirm Pages project = this repo
2. Ship static crew + CTAs (this commit)
3. New Vite+R3F app in `studio/` that **builds into** `/studio/` only
4. When studio equals homepage quality, swap `index.html` — keep old routes

Palette lock (sensitive eyes): `--lapis #0a1628` `--gold #c9a84c` `--green-bright #2fbf8f` — no neon, no new hex.

## Permission needed
```
cd C:\Users\wirec\codingProjects\abuz8ai-site
npx wrangler login
```
Then tell me **deploy**. I will `wrangler pages deploy . --project-name=abuz8ai`
