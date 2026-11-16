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

- ghostshot.deepanalve.dev is live on 2026-11-16. Dokploy project `ghostshot`, compose `ghostshot-site` (id `bqI9k91NT4ZFRYFP0iTR8`), branch `master`. Redeploy with `POST /api/compose.deploy {"composeId": ...}`. Evidence: / returns 200, /concepts returns 404, the origin has a Let's Encrypt cert, and Playwright found no console errors at 1440 and 390 px.
- Cloudflare injects its Web Analytics beacon into every deepanalve.dev page for browsers. The site sends `Cache-Control: no-transform` on HTML, which stops it. Postsound and the guestbook still get the beacon.
- v2 is installed in Deepan's session from `dist/`. The v1 copy is backed up in `~/.local/share/gnome-shell/extension-backups/auto-capture@deepan-v1-2026-11-16`.

## Uncertain
- v2 is installed but loads only after Deepan logs out and back in. Nobody has checked it in his real session yet.
- v2 is not tested on GNOME 45 to 49. The code avoids APIs that changed, but no shell of those versions ran it.

## Next
1. Wait for the review of version 2.0 (uploaded 2026-11-16, review page /review/78518). Version 1 stays active until then.
2. Optional: add `site/img/og.png` as the listing screenshot on extensions.gnome.org.
3. Deepan mentioned earlier reviewer notes on 2026-11-16, then said to leave them. Nothing was found on the review pages.
4. Ask Deepan before removing `screenshot-pro.zip`.
