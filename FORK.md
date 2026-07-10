# RGSS Script Editor — Fork Notes

This is a personal fork of [`SnowSzn/rgss-script-editor`](https://github.com/SnowSzn/rgss-script-editor),
pinned to upstream **v1.6.1**. It adds two small, additive safety changes so
`load_order.txt` and the scripts folder can be edited by hand (terminal, git,
any text editor) **without the extension silently clobbering those edits**,
while leaving every GUI-driven code path unchanged.

Packaged as a distinct extension id (`SnowSzn.rgss-script-editor-fork`,
displayed as **RGSS Script Editor (Fork)**) so VS Code's update check can't
silently reinstall the Marketplace build over it.

---

## What changed

1. **No-picker reload command** — `rgss-script-editor.reloadFromLoadOrder`
   forces a full reload from disk (re-reads `load_order.txt`, rescans the
   folder, re-saves) without the workspace-folder quick-pick. Reuses the
   existing `setProjectFolder()` pipeline. No keybinding is shipped; bind it in
   your personal `keybindings.json`:

   ```json
   {
     "key": "ctrl+alt+r",
     "command": "rgss-script-editor.reloadFromLoadOrder",
     "when": "rgss-script-editor.openedFolder"
   }
   ```

2. **Watchers resync from disk before persisting** — the external
   file-create/delete watchers (`watcherScriptOnDidCreate` /
   `watcherScriptOnDidDelete` in `manager.ts`) now call
   `ScriptsController.syncFromDisk()` before saving. `syncFromDisk()` rebuilds
   the in-memory tree from what's currently on disk (load order file + folder
   scan) so the subsequent `load_order.txt` save reflects your hand-edits plus
   the new event, instead of overwriting them with a stale in-memory snapshot.

   `syncFromDisk()` was extracted out of `_restart()` so both paths share one
   implementation.

### Note on the watcher implementation vs. the original design doc

The original design doc proposed calling `syncFromDisk()` at the very top of
each watcher and leaving the rest of each handler untouched. That doesn't quite
work: `syncFromDisk()` runs a folder `_scan()`, which **already** adds a
newly-created file to the tree. The handler's existing `sectionFind(uri)` guard
then sees the file is "already there" and returns early — **skipping the
`refresh()` that actually writes `load_order.txt` and updates the sidebar**. The
delete handler short-circuits the same way (the deleted file is already gone
from the resynced tree, so `findChild` finds nothing and never reaches
`refresh()`).

Net effect of the literal design-doc version: hand-edits are preserved, but an
externally created/deleted script isn't written into `load_order.txt` (and so
isn't loaded by the game, and the sidebar looks stale) until the next reload.

This fork restructures the two handlers so the resync happens first and
`refresh()` **always** runs afterward for relevant events. Result: hand-edits
are preserved **and** external create/delete is persisted immediately. Upstream
already saved on every watcher event, so this isn't extra write risk — it just
saves from the correct (resynced) tree. Irrelevant events (non-Ruby files,
`load_order.txt` itself) still early-return with no save, exactly as upstream.

> If you ever want the ultra-conservative behavior instead — where the
> extension never auto-writes `load_order.txt` in response to an external event
> and you always force persistence with the reload hotkey — revert the two
> watcher handlers to a bare `syncFromDisk()` at the top with the original body
> below it. The tradeoff is that new files won't be in `load_order.txt` until
> you reload.

### Known side effect

`syncFromDisk()` clears the cut/copy clipboard (same as a full restart). So if
you cut or copy sections in the tree and an external file create/delete fires
before you paste, the clipboard is emptied. Rare in practice; it's the accepted
tradeoff for always resyncing from disk.

### Deliberately out of scope

No resync hook is added to the GUI section commands
(`sectionCreate` / `sectionDelete` / `sectionRename` / `sectionMove` /
`sectionPaste` / `sectionToggleLoad`) or to `refresh()` generally. Those
commands receive an already-resolved tree-node object from VS Code's UI layer
before the code runs; `syncFromDisk()` would rebuild the tree with new object
instances and orphan that reference (silent no-op, or in rename's case a real
filesystem rename against a detached object that never gets saved back — a
dangling `load_order.txt` entry). This is inherent to click-time argument
resolution.

---

## Manual regression checklist

Run this in the **Extension Development Host** (press **F5** in this repo, then
open a real RPG Maker project in the new window) before trusting a new build.
The "code-traced" notes below record what was verified statically against the
source; the interactive run is still the real confirmation.

### Safety — the whole point of the fork

- [ ] **Hand-edit + external create.** In a terminal, reorder two lines in
      `load_order.txt`, save. Then `touch` a new `.rb` file in the scripts
      folder from outside VS Code. → `load_order.txt` keeps your reordering and
      appends **only** the new file; the new script appears in the sidebar.
      _(Code-traced: create handler resyncs from the reordered file, scan picks
      up the new `.rb`, `refresh()` persists reorder + append.)_

- [ ] **Hand-edit + external delete.** Reorder two lines in `load_order.txt`,
      save. Then delete a tracked `.rb` file from a terminal. → `load_order.txt`
      keeps your reordering and drops **only** the deleted file's line; the
      section disappears from the sidebar. _(Code-traced: delete handler
      confirms the file was tracked, resyncs (missing file dropped),
      `refresh()` persists.)_

- [ ] **Reload hotkey with only a manual edit pending.** Reorder lines in
      `load_order.txt` with **no** file add/delete, save, then fire
      `ctrl+alt+r` (or run "RGSS Script Editor: Reload From Load Order File"
      from the command palette). → The sidebar reflects the new order.

- [ ] **Deleting `load_order.txt` itself does not auto-recreate it** from a
      watcher event (it's only recreated on a full reload). _(Code-traced:
      delete handler ignores untracked paths.)_

- [ ] **Creating a non-Ruby file** (e.g. `notes.txt`) in the scripts folder
      does not rewrite `load_order.txt`. _(Code-traced: unsupported type
      early-returns.)_

### GUI section commands — must be byte-for-byte identical to upstream

These paths were **not** touched; any difference from the stock extension means
something regressed. Run each once in the dev host:

- [ ] Create a script / folder / separator from the tree view.
- [ ] Delete a section from the tree view.
- [ ] Rename a section.
- [ ] Move a section via drag-and-drop.
- [ ] Cut / copy and paste a section.
- [ ] Toggle a section's load status (checkbox).
- [ ] Toggle-collapse a folder.

### Extension identity

- [ ] Extensions list shows **RGSS Script Editor (Fork)** `1.7.0` with id
      `SnowSzn.rgss-script-editor-fork`, distinct from the Marketplace build.
- [ ] Only one build watches the scripts folder at a time — disable/uninstall
      the Marketplace `SnowSzn.rgss-script-editor` for this workspace. (Two
      watchers on the same `**` glob both mutating `load_order.txt` is not a
      supported configuration.)

---

## Keeping it rebasable against upstream

The changes are small, additive, and isolated to `manager.ts` and
`scripts_controller.ts` plus two registration blocks (`extension.ts`,
`package.json`), so pulling a newer upstream release is straightforward. You
likely won't need this often, but when you do:

```sh
# One-time: add the upstream remote (read-only; we never push to it).
git remote add upstream https://github.com/SnowSzn/rgss-script-editor.git

# When you want a newer upstream version:
git fetch upstream --tags

# Inspect available tags and pick the one you want (e.g. v1.7.0).
git tag -l | sort -V | tail

# Rebase this fork's commits onto the new upstream tag.
git rebase <new-tag>        # e.g. git rebase v1.7.0
```

Because neither change touches the GUI section-command bodies, the UI layer, or
the config/gameplay controllers, conflicts should be limited to line-number
drift inside `_restart()` and the two watcher functions — not logic collisions.
Resolve, re-run `yarn run compile`, then walk the regression checklist above.

After rebasing, **re-apply the packaging identity** if upstream's `package.json`
overwrote it: `name` → `rgss-script-editor-fork`, `displayName` →
`RGSS Script Editor (Fork)`, and bump `version` above the upstream base. Then
repackage:

```sh
mkdir -p dist
npx @vscode/vsce package --out ./dist/rgss-script-editor-fork-<version>.vsix
```

Install via **Extensions: Install from VSIX…** and disable the Marketplace
original for the workspace.
