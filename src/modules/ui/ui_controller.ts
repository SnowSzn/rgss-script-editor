import * as vscode from 'vscode';
import { config as configuration } from '../utils/configuration';
import { ConfigStatusBar, StatusBarItems } from './elements/ui_status_bar';
import { ScriptSection, EditorViewProvider } from './elements/ui_view_provider';

/**
 * Extension UI class.
 */
class UI {
  /**
   * Tree view instance for the editor.
   */
  private editorView: vscode.TreeView<ScriptSection> | undefined;
  /**
   * Status bar items controller.
   */
  private statusBar: StatusBarItems;

  /**
   * Constructor.
   */
  constructor() {
    this.statusBar = new StatusBarItems();
    this.editorView = undefined;
  }

  /**
   * Updates the UI current project folder
   */
  updateProjectFolder() {
    let folderName = configuration.getProjectFolderName();
    let scriptsFolder = configuration.getScriptsFolderPath();
    // Checks validness
    if (!folderName || !scriptsFolder) {
      throw new Error(
        `It is impossible to update the UI due to invalid values`
      );
    }
    // Updates status bar items
    this.statusBar.updateProjectFolder(folderName);
    // Re-creates view provider (new folder)
    this.editorView = vscode.window.createTreeView(
      'rgss-script-editor.editorView',
      { treeDataProvider: new EditorViewProvider(scriptsFolder) }
    );
  }

  /**
   * Shows all status bar items
   */
  showAllStatusBars(): void {
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
  hideAllStatusBars(): void {
    this.controlStatusBar();
  }

  /**
   * Controls all status bar items visibility
   * @param options Status bar options
   */
  controlStatusBar(options?: ConfigStatusBar): void {
    this.statusBar.controlStatusBar(options);
  }
}

export let uiController = new UI();
