#!/usr/bin/env bash
# Packs the extension for extensions.gnome.org into dist/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
gnome-extensions pack --force --out-dir=dist --extra-source=LICENSE --extra-source=NOTICE .
unzip -l dist/auto-capture@deepan.shell-extension.zip
