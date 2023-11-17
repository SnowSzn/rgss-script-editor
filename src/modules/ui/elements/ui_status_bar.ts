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
export class StatusBarItems {
  /**
   * Status bar set project folder item
   */
  private itemSetProjectFolder: vscode.StatusBarItem;
  /**
   * Status bar project folder item
   */
  private itemProjectFolder: vscode.StatusBarItem;
  /**
   * Status bar extract scripts item
   */
  private itemExtractScripts: vscode.StatusBarItem;
  /**
   * Status bar run game item
   */
  private itemRunGame: vscode.StatusBarItem;

  /**
   * Constructor
   */
  constructor() {
    this.itemSetProjectFolder = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.itemProjectFolder = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.itemExtractScripts = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    this.itemRunGame = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    // Initializes UI configuration
    this.initializeConfig();
  }

  /**
   * Updates status bar project folder information
   * @param projectFolder Project folder
   */
  updateProjectFolder(projectFolder: string): void {
    this.itemProjectFolder.text = `$(folder) RGSS Script Editor active project: ${projectFolder}`;
  }

  /**
   * Controls all status bar items visibility.
   *
   * If no options are given, it hides all items.
   * @param options Status bar options
   */
  controlStatusBar(options?: ConfigStatusBar): void {
    // Updates set project folder item visibility
    options?.setProjectFolder
      ? this.itemSetProjectFolder.show()
      : this.itemSetProjectFolder.hide();
    // Updates project folder name item visibility
    options?.currentProjectFolder
      ? this.itemProjectFolder.show()
      : this.itemProjectFolder.hide();
    // Updates extract scripts item visibility
    options?.extractScripts
      ? this.itemExtractScripts.show()
      : this.itemExtractScripts.hide();
    // Updates run game item visibility
    options?.runGame ? this.itemRunGame.show() : this.itemRunGame.hide();
  }

  /**
   * Initializes the UI configuration
   */
  private initializeConfig(): void {
    this.itemSetProjectFolder.text =
      '$(folder-library) Choose RPG Maker project folder';
    this.itemSetProjectFolder.tooltip =
      'Choose a RPG Maker project folder from the current workspace';
    this.itemSetProjectFolder.command = 'rgss-script-editor.setProjectFolder';
    this.itemProjectFolder.text = '$(folder) RPG Maker active project: None';
    this.itemProjectFolder.tooltip =
      'Opens the currently working RPG Maker project folder';
    this.itemProjectFolder.command = 'rgss-script-editor.openProjectFolder';
    this.itemRunGame.text = '$(run) Run Game';
    this.itemRunGame.tooltip = 'Runs the game executable';
    this.itemRunGame.command = 'rgss-script-editor.runGame';
    this.itemExtractScripts.text = '$(arrow-down) Extract Scripts';
    this.itemExtractScripts.tooltip =
      'Extracts all scripts from the bundled RPG Maker scripts file';
    this.itemExtractScripts.command = 'rgss-script-editor.extractScripts';
  }
}
