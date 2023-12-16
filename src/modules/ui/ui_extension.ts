import * as vscode from 'vscode';
import { EditorSectionBase } from '../processes/scripts_controller';
import {
  StatusBarControl,
  StatusBarOptions,
  StatusBarItems,
} from './elements/ui_status_bar';
import { EditorViewProvider } from './elements/ui_tree_view_provider';

/**
 * Extension UI tree view reveal options type.
 */
export type ExtensionUiReveal = {
  /**
   * Whether to force the tree view to appear or not.
   */
  force?: boolean;

  /**
   * Selects the item in the tree view.
   */
  select?: boolean;

  /**
   * Expands the parent items in the tree view.
   */
  expand?: boolean;

  /**
   * Focuses the item in the tree view.
   */
  focus?: boolean;
};

/**
 * Extension UI options type.
 */
export type ExtensionUiOptions<T> = {
  /**
   * Root of the tree view provider.
   *
   * This will be used by the view provider to provide data to the tree view.
   */
  treeRoot: T;

  /**
   * Drag and drop controller for the tree view.
   *
   * This class instance is used by the tree view to handle drag and drop operations.
   */
  dragAndDropController: vscode.TreeDragAndDropController<T>;

  /**
   * Status bar options.
   */
  statusBarOptions: StatusBarOptions;
};

/**
 * Extension UI class.
 */
export class ExtensionUI {
  /**
   * Tree view instance.
   */
  private _editorView?: vscode.TreeView<EditorSectionBase>;

  /**
   * Tree view provider instance.
   */
  private _editorViewProvider: EditorViewProvider;

  /**
   * Status bar items controller.
   */
  private _statusBar: StatusBarItems;

  /**
   * Constructor.
   */
  constructor() {
    this._editorViewProvider = new EditorViewProvider();
    this._statusBar = new StatusBarItems();
    this._editorView = undefined;
  }

  /**
   * Gets all current items selected on the tree view.
   *
   * If there are not items selected it returns ``undefined``.
   * @returns Tree view selection.
   */
  getTreeSelection() {
    return this._editorView?.selection;
  }

  /**
   * Updates the extension UI with the given options.
   * @param options Extension UI options.
   */
  update(options: ExtensionUiOptions<EditorSectionBase>) {
    // Updates status bar items
    this._statusBar.update(options.statusBarOptions);

    // Updates view provider
    this._editorViewProvider.update(options.treeRoot);

    // Re-creates tree view
    this._editorView = vscode.window.createTreeView(
      'rgss-script-editor.editorView',
      {
        treeDataProvider: this._editorViewProvider,
        dragAndDropController: options.dragAndDropController,
        canSelectMany: true,
        manageCheckboxStateManually: false,
        showCollapseAll: true,
      }
    );

    // Checkbox click callback.
    this._editorView.onDidChangeCheckboxState((e) => {
      vscode.commands.executeCommand(
        'rgss-script-editor.alternateLoadScriptSection',
        e.items
      );
    });
  }

  /**
   * Resets the extension UI to the default values.
   *
   * It resets the current tree view provider and hides the status bar.
   */
  reset() {
    this._editorViewProvider.reset();
    this._statusBar.hide();
  }

  /**
   * Reveals the appropiate script section in the tree view by the given ``path``.
   * @param path Script section path.
   * @param options Reveal options.
   * @returns The script section revealed.
   */
  revealInTreeView(path: vscode.Uri, options: ExtensionUiReveal) {
    if (this._editorView?.visible || options.force) {
      // Avoids conflicts with other container auto reveals
      let section = this._editorViewProvider?.findTreeItem(path);
      if (section) {
        this._editorView?.reveal(section, {
          select: options.select,
          expand: options.expand,
          focus: options.focus,
        });
      }
      return section;
    }
  }

  /**
   * Refreshes the UI contents.
   */
  refresh(treeItem: EditorSectionBase, isRoot?: boolean) {
    if (isRoot) {
      this._editorViewProvider.update(treeItem);
    } else {
      this._editorViewProvider.refresh(treeItem);
    }
  }

  /**
   * Shows all extension UI elements.
   */
  show() {
    // Shows status bar items.
    this._statusBar.show();
  }

  /**
   * Hides all extension UI elements.
   */
  hide() {
    // Hides status bar items.
    this._statusBar.hide();
  }

  /**
   * Controls the extension UI elements.
   * @param options Extension UI options.
   */
  control(options?: StatusBarControl): void {
    this._statusBar.control(options);
  }

  /**
   * Disposes all extension UI elements.
   */
  dispose() {
    // Disposes all status bar items
    this._statusBar.dispose();
    // Disposes the editor view
    this._editorView?.dispose();
  }
}
