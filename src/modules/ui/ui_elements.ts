import * as vscode from 'vscode';

/**
 * Type to show/hide status bars
 */
export type ConfigStatusBar = {
  setProjectFolder?: boolean;
  currentProjectFolder?: boolean;
  extractScripts?: boolean;
  runGame?: boolean;
};

/**
 * Class that creates all UI elements for VSCode
 */
class ExtensionUIElements {
  /**
   * Status bar set project folder item
   */
  private statusBarSetProject: vscode.StatusBarItem;
  /**
   * Status bar project folder item
   */
  private statusBarProjectFolder: vscode.StatusBarItem;
  /**
   * Status bar extract scripts item
   */
  private statusBarExtractScripts: vscode.StatusBarItem;
  /**
   * Status bar run game item
   */
  private statusBarRunGame: vscode.StatusBarItem;

  /**
   * Constructor
   */
  constructor() {
    this.statusBarSetProject = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.statusBarProjectFolder = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.statusBarExtractScripts = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.statusBarRunGame = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    // Initializes UI configuration
    this.initializeUIConfig();
  }

  /**
   * Updates status bar project folder information
   * @param projectFolder Project folder
   */
  updateProjectName(projectFolder: string): void {
    this.statusBarProjectFolder.text = `$(folder) RGSS Script Editor active project: ${projectFolder}`;
  }

  /**
   * Shows all status bar items
   */
  showAllStatusBars(): void {
    this.statusBarSetProject.show();
    this.statusBarProjectFolder.show();
    this.statusBarExtractScripts.show();
    this.statusBarRunGame.show();
  }

  /**
   * Hides all status bar items
   */
  hideAllStatusBars(): void {
    this.statusBarSetProject.hide();
    this.statusBarProjectFolder.hide();
    this.statusBarExtractScripts.hide();
    this.statusBarRunGame.hide();
  }

  /**
   * Controls all status bar items visibility
   * @param options Status bar options
   */
  controlStatusBar(options: ConfigStatusBar): void {
    // Process options
    if (options.setProjectFolder) {
      this.statusBarSetProject.show();
    } else {
      this.statusBarSetProject.hide();
    }
    if (options.currentProjectFolder) {
      this.statusBarProjectFolder.show();
    } else {
      this.statusBarProjectFolder.hide();
    }
    if (options.extractScripts) {
      this.statusBarExtractScripts.show();
    } else {
      this.statusBarExtractScripts.hide();
    }
    if (options.runGame) {
      this.statusBarRunGame.show();
    } else {
      this.statusBarRunGame.hide();
    }
  }

  /**
   * Initializes the UI configuration
   */
  private initializeUIConfig(): void {
    this.statusBarSetProject.text =
      '$(folder-library) Choose RPG Maker project folder';
    this.statusBarSetProject.tooltip =
      'Choose a RPG Maker project folder from the current workspace';
    this.statusBarSetProject.command = 'rgss-script-editor.setProjectFolder';
    this.statusBarProjectFolder.text =
      '$(folder) RPG Maker active project: None';
    this.statusBarProjectFolder.tooltip =
      'Opens the currently working RPG Maker project folder';
    this.statusBarProjectFolder.command =
      'rgss-script-editor.openProjectFolder';
    this.statusBarRunGame.text = '$(run) Run Game';
    this.statusBarRunGame.tooltip = 'Runs the game executable';
    this.statusBarRunGame.command = 'rgss-script-editor.runGame';
    this.statusBarExtractScripts.text = '$(arrow-down) Extract Scripts';
    this.statusBarExtractScripts.tooltip =
      'Extracts all scripts from the bundled RPG Maker scripts file';
    this.statusBarExtractScripts.command = 'rgss-script-editor.extractScripts';
  }
}

/**
 * UI elements instance
 */
export const controller = new ExtensionUIElements();
