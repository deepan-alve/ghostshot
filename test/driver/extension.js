// Test driver: runs inside a headless GNOME Shell and drives GhostShot like a user would.
// It writes every result to $HOME/result.json, then the runner stops the shell.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const UUID = 'auto-capture@deepan';
const sleep = ms => new Promise(r => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { r(); return GLib.SOURCE_REMOVE; }));
const clipText = () => new Promise(r => St.Clipboard.get_default().get_text(St.ClipboardType.CLIPBOARD, (_c, t) => r(t)));
const clipTypes = () => St.Clipboard.get_default().get_mimetypes(St.ClipboardType.CLIPBOARD);
// Counts screenshot toasts as GNOME adds them, so a short-lived toast still counts.
let toastsAdded = 0;
const watched = new WeakSet();
const watch = src => {
    if (watched.has(src)) return;
    watched.add(src);
    src.connect('notification-added', () => {
        const names = (src.icon ?? src.gicon)?.get_names?.() ?? [];
        if (names.includes('screenshooter-symbolic')) toastsAdded++;
    });
};
const shotCount = () => toastsAdded;
const otherCount = title => Main.messageTray.getSources()
    .flatMap(s => s.notifications).filter(n => n.title === title).length;

export default class Driver extends Extension {
    enable() {
        Main.messageTray.getSources().forEach(watch);
        Main.messageTray.connect('source-added', (_t, src) => watch(src));
        this._id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2500, () => {
            this._run().catch(e => this._write({fatal: `${e}\n${e.stack}`}));
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        if (this._id) GLib.source_remove(this._id);
    }

    _write(obj) {
        const path = GLib.build_filenamev([GLib.get_home_dir(), 'result.json']);
        GLib.file_set_contents(path, JSON.stringify(obj, null, 2));
    }

    async _drag(ui, {key = null, click = false, cast = false} = {}) {
        await ui.open();
        await sleep(400);
        if (cast) ui._castButton.checked = true;
        const sel = ui._areaSelector;
        const openOpacity = sel.opacity;
        const ghost = Main.extensionManager.lookup(UUID)?.stateObj;
        if (key && ghost) ghost._onKey({get_key_symbol: () => key}, true);
        sel._dragButton = 1;
        sel._dragCursor = Clutter.CursorType.CROSSHAIR;
        sel._startX = 100; sel._startY = 100;
        sel._lastX = click ? 100 : 420; sel._lastY = click ? 100 : 320;
        let file = null;
        const id = ui.connect('screenshot-taken', (_u, f) => { file = f; });
        sel.stopDrag();
        for (let i = 0; i < 30 && !file; i++) await sleep(100);
        ui.disconnect(id);
        await sleep(600);
        return {openOpacity, file: file?.get_path() ?? null, visibleAfter: ui.visible};
    }

    async _run() {
        const ui = Main.screenshotUI;
        const r = {};
        r.ghostState = Main.extensionManager.lookup(UUID)?.state;

        St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, 'before');
        const before = shotCount();
        const a = await this._drag(ui);
        r.image = {...a, types: clipTypes(), toasts: shotCount() - before,
            exists: !!a.file && GLib.file_test(a.file, GLib.FileTest.EXISTS)};

        const b = await this._drag(ui);
        r.second = {...b, types: clipTypes()};

        const c = await this._drag(ui, {key: Clutter.KEY_r});
        r.text = {...c, clip: await clipText()};

        const d = await this._drag(ui, {key: Clutter.KEY_F});
        r.path = {...d, clip: await clipText()};

        const e = await this._drag(ui, {click: true});
        r.click = e;
        ui.close(true);
        await sleep(500);

        // Other notifications still show while a capture runs.
        const ghost = Main.extensionManager.lookup(UUID)?.stateObj;
        ghost._capturing = true;
        Main.notify('ghostshot-other', 'must stay');
        ghost._capturing = false;
        r.otherToast = otherCount('ghostshot-other');

        r.castReactive = !!ui._castButton?.reactive;
        if (r.castReactive) {
            const g = await this._drag(ui, {cast: true});
            r.cast = {...g, recording: !!ui._screencastInProgress};
            if (ui._screencastInProgress) await ui.stopScreencast?.();
            if (ui.visible) { ui._castButton.checked = false; ui.close(true); await sleep(400); }
        }

        // With GhostShot off, GNOME behaves as stock again.
        await Main.extensionManager.disableExtension(UUID);
        await sleep(400);
        const before2 = shotCount();
        const f = await this._drag(ui);
        r.off = {...f};
        // Stock GNOME capture shows its toast, which proves the toast count is real.
        r.off.visibleBeforeStock = ui.visible;
        let stockFile = null;
        const sid = ui.connect('screenshot-taken', (_u, file) => { stockFile = file.get_path(); });
        if (ui.visible) { await ui._onCaptureButtonClicked(); await sleep(800); }
        ui.disconnect(sid);
        r.off.stockFile = stockFile;
        r.off.sources = Main.messageTray.getSources().map(s => `${s.title}|${s.iconName}`);
        r.off.stockToasts = shotCount() - before2;
        if (ui.visible) { ui.close(true); await sleep(400); }

        this._write(r);
    }
}
