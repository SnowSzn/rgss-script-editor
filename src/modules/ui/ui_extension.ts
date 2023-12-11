import * as vscode from 'vscode';
import { EditorSection } from '../processes/scripts_controller';
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
 * Extension UI refresh options type.
 */
export type ExtensionUiRefresh<T> = {
  /**
   * Tree item instance to refresh.
   */
  treeItem: T;

  /**
   * Whether the given tree item is the tree root or not.
   *
   * If this is true, the whole tree is refreshed instead of a single tree item.
   */
  isRoot?: boolean;
};

/**
 * Extension UI class.
 */
export class ExtensionUI {
  /**
   * Status bar items controller.
   */
  private _statusBar: StatusBarItems | undefined;

  /**
   * Tree view instance.
   */
  private _editorView: vscode.TreeView<EditorSection> | undefined;

  /**
   * Tree view provider instance.
   */
  private _editorViewProvider: EditorViewProvider;

  /**
   * Constructor.
   */
  constructor() {
    this._editorViewProvider = new EditorViewProvider();
    this._editorView = undefined;
    this._statusBar = undefined;
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
  update(options: ExtensionUiOptions<EditorSection>) {
    // Disposes previous configuration
    this.dispose();

    // Updates status bar items
    this._statusBar = new StatusBarItems(options.statusBarOptions);

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
   * Reveals the appropiate script section in the tree view by the given ``path``.
   * @param path Script section path.
   * @param options Reveal options.
   * @returns The script section revealed.
   */
  revealInTreeView(path: string, options: ExtensionUiReveal) {
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
  refresh(options: ExtensionUiRefresh<EditorSection>) {
    if (options.isRoot) {
      this._editorViewProvider.update(options.treeItem);
      this._editorViewProvider.refresh();
    } else {
      this._editorViewProvider.refresh(options.treeItem);
    }
  }

  /**
   * Shows all status bar items
   */
  showStatusBar(): void {
    this.controlStatusBar({
      setProjectFolder: true,
      currentProjectFolder: true,
      extractScripts: true,
      runGame: true,
    });
  }

  /**
   * Hides all status bar items
   */
  hideStatusBar(): void {
    this.controlStatusBar();
  }

  /**
   * Controls all status bar items visibility
   *
   * If no options are given, it hides all items.
   * @param options Status bar options
   */
  controlStatusBar(options?: StatusBarControl): void {
    this._statusBar?.controlStatusBar(options);
  }

  /**
   * Disposes all extension UI elements.
   */
  dispose() {
    // Disposes all status bar items
    this._statusBar?.dispose();
    this._statusBar = undefined;
    // Disposes the editor view
    this._editorView?.dispose();
    this._editorView = undefined;
  }

  /**
   * Checks if extension UI is disposed.
   * @returns Disposed status.
   */
  isDisposed(): boolean {
    return !this._editorView && !this._statusBar;
  }
}
