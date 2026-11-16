# STATE

Updated 2026-11-16.

## Goal
GhostShot v2 on extensions.gnome.org, and a product site at ghostshot.deepanalve.dev.

## Facts
- extensions.gnome.org lists GhostShot as extension 9786 with ID `auto-capture@deepan`. It shows version 1, which has auto-capture and the hidden selection only. It had 149 downloads on 2026-11-16.
- GitHub repo is `deepan-alve/ghostshot`, renamed from `screenshot-pro` on 2026-11-16. Its old code set `_isCapturing` and never reset it, so it captured once per session.
- Deepan's installed copy (`~/.local/share/gnome-shell/extensions/auto-capture@deepan`) has `DEBUG = true` and writes `~/.cache/auto-capture-debug.log` (2.8 MB on 2026-11-16).
- v2 merges both copies: one name, no file logging, no wl-copy or bash, tracked GLib sources, and patches that are undone on disable.
- GNOME already puts the image on the clipboard. v2 replaces it with text (R) or the path (F).
- GNOME 50 bug: `MessageList.Source.iconName` reads `gicon`, but the constructor sets `icon`. v2 reads `icon.get_names()`.
- `test/run-headless.sh` passes 15 of 15 checks on GNOME Shell 50.1.
- `*.deepanalve.dev` already points at biriyani through Cloudflare. A site needs only a Dokploy compose with Traefik labels, like postsound-site.

- Site: Deepan rejected directions A (Darkroom) and B (Contact sheet) as boring to look at. He picked C (instant camera) over D (flatbed scanner) on 2026-11-16. All four stay in `site/concepts/` and are left out of the Docker image.
- The site passes drag, R, F and keyboard checks at 320, 375, 414, 768, 1024 and 1440 px, with no console errors, under the real nginx CSP in a local Docker run.
- Dokploy reads the repo through its GitHub app.

## Uncertain
- v2 is not loaded in Deepan's own session. Wayland needs a log out to load new extension code.
- v2 is not tested on GNOME 45 to 49. The code avoids APIs that changed, but no shell of those versions ran it.

## Next
1. With Deepan's OK: push, create the Dokploy compose `ghostshot-site` from `deploy/docker-compose.yml`, deploy, and check it live.
2. Upload v2 to extensions.gnome.org with a screenshot and the new description.
3. Ask Deepan before removing `screenshot-pro.zip`.
