import * as vscode from 'vscode';

/**
 * Class that creates all UI elements for VSCode
 */
class ExtensionUI {
  /**
   * Status bar project folder item
   */
  private statusBarProjectFolder: vscode.StatusBarItem;
  /**
   * Status bar extract scripts item
   */
  private statusBarExtractScripts: vscode.StatusBarItem;

  /**
   * Constructor
   */
  constructor() {
    this.statusBarProjectFolder = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.statusBarExtractScripts = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    // Initializes UI configuration
    this.initializeUIConfig();
  }

  /**
   * Updates status bar project folder information
   * @param projectFolder Project folder Uri path
   */
  updateProjectFolderStatusBar(projectFolder: vscode.Uri): void {
    this.statusBarProjectFolder.text = `$(folder) RPG Maker active project: ${projectFolder.fsPath}`;
    this.statusBarProjectFolder.tooltip = `Opens the working RPG Maker project folder`;
  }

  /**
   * Shows the status bar
   */
  showStatusBar(): void {
    this.statusBarProjectFolder.show();
    this.statusBarExtractScripts.show();
  }

  /**
   * Hides the status bar
   */
  hideStatusBar(): void {
    this.statusBarProjectFolder.hide();
    this.statusBarExtractScripts.hide();
  }

  /**
   * Initializes the UI configuration
   */
  private initializeUIConfig(): void {
    this.statusBarProjectFolder.command =
      'rgss-script-editor.openProjectFolder';
    this.statusBarExtractScripts.text = '$(arrow-down) Extract Scripts';
    this.statusBarExtractScripts.tooltip =
      'Extracts all scripts from the bundled RPG Maker scripts file';
    this.statusBarExtractScripts.command = 'rgss-script-editor.extractScripts';
  }
}

/**
 * Extension UI instance
 */
export const controller = new ExtensionUI();
