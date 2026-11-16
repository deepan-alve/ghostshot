// GhostShot: drag, release, done. A GNOME Shell extension.
// Copyright (C) 2026 Deepan Alve <https://github.com/deepan-alve>
// SPDX-License-Identifier: GPL-3.0-or-later

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

// GNOME names the source of its own screenshot notification with this icon.
const SCREENSHOT_ICON = 'screenshooter-symbolic';

// A capture that never reports back unlocks after this long.
const CAPTURE_TIMEOUT_MS = 3000;

const isKey = (symbol, lower, upper) => symbol === lower || symbol === upper;

export default class GhostShotExtension extends Extension {
    enable() {
        const ui = Main.screenshotUI;
        if (!ui?._areaSelector) {
            console.warn('GhostShot: the screenshot UI is not available, so GhostShot stays off.');
            return;
        }

        this._ui = ui;
        this._sources = new Set();
        this._capturing = false;
        this._held = {text: false, path: false};

        const AreaSelector = ui._areaSelector.constructor;
        const ScreenshotUI = ui.constructor;
        this._patches = [];
        const patch = (proto, name, make) => {
            const original = proto[name];
            proto[name] = make(original);
            this._patches.push([proto, name, original]);
        };
        const ext = this;

        // Hold R for text, F for the file path. GNOME uses neither key in this UI.
        this._signals = [
            ui.connect('key-press-event', (_actor, event) => this._onKey(event, true)),
            ui.connect('key-release-event', (_actor, event) => this._onKey(event, false)),
        ];

        // Releasing a drag takes the shot.
        patch(AreaSelector.prototype, 'stopDrag', original => function (...args) {
            const wasClick = this._lastX === this._startX && this._lastY === this._startY;
            const wasDragging = this._dragButton > 0;
            original.apply(this, args);
            if (wasDragging && !wasClick)
                ext._capture();
        });

        // The selection box stays hidden until a drag starts.
        patch(AreaSelector.prototype, '_onMotion', original => function (...args) {
            if (this._dragButton > 0)
                this.opacity = 255;
            return original.apply(this, args);
        });

        patch(ScreenshotUI.prototype, '_onAreaButtonClicked', original => function (...args) {
            const result = original.apply(this, args);
            if (this._areaSelector)
                this._areaSelector.opacity = 0;
            return result;
        });

        // Every open starts clean: no old selection, no held keys.
        patch(ScreenshotUI.prototype, 'open', original => function (...args) {
            ext._held = {text: false, path: false};
            const result = original.apply(this, args);
            const selector = this._areaSelector;
            if (selector) {
                selector.opacity = 0;
                selector._startX = -1;
                selector._startY = 0;
                selector._lastX = 0;
                selector._lastY = 0;
                selector._updateSelectionRect?.();
            }
            return result;
        });

        // Drop GNOME's "Screenshot captured" banner, but only for shots GhostShot takes.
        // GNOME 46+ calls addNotification. GNOME 45 calls showNotification.
        for (const name of ['addNotification', 'showNotification']) {
            if (typeof MessageTray.Source.prototype[name] !== 'function')
                continue;
            patch(MessageTray.Source.prototype, name, original => function (notification, ...rest) {
                if (ext._capturing && ext._isScreenshotSource(this)) {
                    notification.destroy?.();
                    return undefined;
                }
                return original.call(this, notification, ...rest);
            });
        }
    }

    disable() {
        for (const id of this._sources ?? [])
            GLib.source_remove(id);
        this._sources?.clear();

        for (const id of this._signals ?? [])
            this._ui?.disconnect(id);
        this._signals = null;

        if (this._takenId) {
            this._ui?.disconnect(this._takenId);
            this._takenId = 0;
        }
        this._timeoutId = 0;

        for (const [proto, name, original] of (this._patches ?? []).reverse())
            proto[name] = original;
        this._patches = null;

        if (this._ui?._areaSelector)
            this._ui._areaSelector.opacity = 255;

        this._ui = null;
        this._capturing = false;
        this._held = null;
    }

    _onKey(event, down) {
        const symbol = event.get_key_symbol();
        if (isKey(symbol, Clutter.KEY_r, Clutter.KEY_R))
            this._held.text = down;
        else if (isKey(symbol, Clutter.KEY_f, Clutter.KEY_F))
            this._held.path = down;
        else
            return Clutter.EVENT_PROPAGATE;
        return Clutter.EVENT_STOP;
    }

    // GNOME 50 stores the source icon in `icon`, but its `iconName` getter reads `gicon`
    // and returns null. Read the icon names directly, so every version from 45 to 50 matches.
    _isScreenshotSource(source) {
        const icon = source.icon ?? source.gicon;
        const names = icon?.get_names?.() ?? [];
        return names.includes(SCREENSHOT_ICON) || source.iconName === SCREENSHOT_ICON;
    }

    _later(ms, fn) {
        const id = ms
            ? GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => this._run(id, fn))
            : GLib.idle_add(GLib.PRIORITY_DEFAULT, () => this._run(id, fn));
        this._sources.add(id);
        return id;
    }

    _cancel(id) {
        if (id && this._sources.delete(id))
            GLib.source_remove(id);
    }

    _stopWaiting() {
        if (this._takenId) {
            this._ui?.disconnect(this._takenId);
            this._takenId = 0;
        }
        this._cancel(this._timeoutId);
        this._timeoutId = 0;
    }

    _run(id, fn) {
        this._sources.delete(id);
        fn();
        return GLib.SOURCE_REMOVE;
    }

    _capture() {
        const ui = this._ui;
        // Screen recording mode keeps GNOME's normal flow. A drag must never start a recording.
        if (this._capturing || !ui || ui._castButton?.checked)
            return;

        const mode = this._held.text ? 'text' : this._held.path ? 'path' : 'image';
        this._held = {text: false, path: false};
        this._capturing = true;

        this._takenId = ui.connect('screenshot-taken', (_ui, file) => {
            this._stopWaiting();
            this._deliver(mode, file);
            this._later(0, () => (this._capturing = false));
        });
        this._timeoutId = this._later(CAPTURE_TIMEOUT_MS, () => {
            this._timeoutId = 0;
            this._stopWaiting();
            this._capturing = false;
        });

        this._later(0, () => {
            if (ui._captureButton?.visible)
                ui._captureButton.emit('clicked', 0);
        });
    }

    // GNOME has already put the image on the clipboard. Text and path modes replace it.
    _deliver(mode, file) {
        const path = file?.get_path();
        if (!path)
            return;
        if (mode === 'path')
            this._copyText(path);
        else if (mode === 'text')
            this._readText(path);
    }

    _copyText(text) {
        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
    }

    _readText(path) {
        let proc;
        try {
            proc = Gio.Subprocess.new(['tesseract', path, 'stdout'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
        } catch {
            Main.notify('GhostShot needs tesseract for text',
                'Install it with: sudo apt install tesseract-ocr. The image is on your clipboard.');
            return;
        }
        proc.communicate_utf8_async(null, null, (p, res) => {
            try {
                const [, out] = p.communicate_utf8_finish(res);
                const text = out?.trim();
                if (text)
                    this._copyText(text);
                else
                    Main.notify('GhostShot found no text', 'The image is still on your clipboard.');
            } catch (e) {
                console.error(`GhostShot: tesseract failed: ${e.message}`);
            }
        });
    }
}
