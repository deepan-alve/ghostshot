# GhostShot

![GNOME 45 to 50](https://img.shields.io/badge/GNOME-45%20to%2050-4A86CF?logo=gnome&logoColor=white)
![License GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue)

Drag, release, done. GhostShot is a GNOME Shell extension. It takes the screenshot when you let go of the mouse.

Install it from [extensions.gnome.org](https://extensions.gnome.org/extension/9786/instant-area-screenshot/).

## What it does

- Takes the shot when you release the drag. You do not press the capture button.
- Puts the image on your clipboard, and saves it in `~/Pictures/Screenshots` as GNOME does.
- Hides the old selection box when the screenshot tool opens, so each shot starts clean.
- Drops GNOME's "Screenshot captured" toast for shots that GhostShot takes. Other notifications still show.
- Copies the text in the area when you hold `R` while you release. This needs `tesseract-ocr`.
- Copies the saved file's path when you hold `F` while you release.
- Leaves screen recording alone. A drag in recording mode never starts a recording.

## Use

1. Press `Print Screen` to open the screenshot tool.
2. Drag over an area.
3. Release the mouse. The image is on your clipboard.

| Hold while you release | Clipboard gets |
|---|---|
| Nothing | The image |
| `R` | The text in the area |
| `F` | The path of the saved file |

For text capture, install tesseract:

```bash
sudo apt install tesseract-ocr
```

## Build

```bash
scripts/build.sh
```

The script writes `dist/auto-capture@deepan.shell-extension.zip`. Install it with:

```bash
gnome-extensions install --force dist/auto-capture@deepan.shell-extension.zip
```

On Wayland, log out and back in to load a new version.

## Test

```bash
test/run-headless.sh
```

The test starts a headless GNOME Shell with its own home folder and D-Bus. A driver extension drags, holds keys and reads the clipboard. Your own session does not change.

## Names

The extension ID is `auto-capture@deepan`. extensions.gnome.org cannot change an ID, so the ID keeps the first name.

## License

[GPL-3.0-or-later](LICENSE). See [NOTICE](NOTICE) for attribution. Copyright (C) 2026 Deepan Alve.
