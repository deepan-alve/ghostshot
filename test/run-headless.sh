#!/usr/bin/env bash
# Runs GhostShot in a throwaway headless GNOME Shell and prints the driver's results.
# Nothing touches the real session: HOME, D-Bus and the display are all temporary.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

EXT="$T/home/.local/share/gnome-shell/extensions"
mkdir -p "$EXT/auto-capture@deepan" "$EXT/ghostshot-test@local" "$T/bin" "$T/home/Pictures" "$T/run"
cp "$ROOT/extension.js" "$ROOT/metadata.json" "$EXT/auto-capture@deepan/"
cp "$ROOT/test/driver/"* "$EXT/ghostshot-test@local/"
chmod 700 "$T/run"

# A stand-in for tesseract, so the text mode has a known answer.
printf '#!/bin/sh\necho "Hello from GhostShot"\n' > "$T/bin/tesseract"
chmod +x "$T/bin/tesseract"

export HOME="$T/home" XDG_RUNTIME_DIR="$T/run" XDG_CONFIG_HOME="$T/home/.config" \
  XDG_DATA_HOME="$T/home/.local/share" XDG_CACHE_HOME="$T/home/.cache" PATH="$T/bin:$PATH"
unset DISPLAY WAYLAND_DISPLAY DBUS_SESSION_BUS_ADDRESS

dbus-run-session -- bash -c '
  gsettings set org.gnome.shell disable-user-extensions false
  gsettings set org.gnome.shell enabled-extensions "[\"auto-capture@deepan\", \"ghostshot-test@local\"]"
  gsettings set org.gnome.shell welcome-dialog-last-shown-version "999"
  gnome-shell --headless --virtual-monitor 1280x800 --no-x11 > "$HOME/shell.log" 2>&1 &
  pid=$!
  for i in $(seq 1 120); do [ -f "$HOME/result.json" ] && break; sleep 0.5; done
  kill $pid 2>/dev/null; wait $pid 2>/dev/null
' >/dev/null 2>&1 || true

if [ ! -f "$HOME/result.json" ]; then
  echo "No result. Shell log:"
  grep -i -E "ghostshot|auto-capture|JS ERROR" "$HOME/shell.log" | tail -30
  exit 1
fi
node "$ROOT/test/check.mjs" < "$HOME/result.json" || { grep -A12 "\"off\"" "$HOME/result.json"; exit 1; }
