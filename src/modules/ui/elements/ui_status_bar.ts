import * as vscode from 'vscode';

/**
 * Status bar control options type.
 */
export type StatusBarControl = {
  /**
   * Open project folder status bar item visibility status.
   */
  changeProjectFolder?: boolean;

  /**
   * Current project folder status bar item visibility status.
   */
  currentProjectFolder?: boolean;

  /**
   * Extract scripts bar item visibility status.
   */
  extractScripts?: boolean;

  /**
   * Run game executable status bar item visibility status.
   */
  runGame?: boolean;
};

/**
 * Status bar options type.
 */
export type StatusBarOptions = {
  /**
   * Project folder shown in the status bar.
   */
  projectFolder: string;
};

/**
 * Status bar UI items class.
 */
export class StatusBarItems {
  /**
   * Status bar set project folder item.
   */
  private itemSetProjectFolder: vscode.StatusBarItem;
  /**
   * Status bar project folder item.
   */
  private itemProjectFolder: vscode.StatusBarItem;
  /**
   * Status bar extract scripts item.
   */
  private itemExtractScripts: vscode.StatusBarItem;
  /**
   * Status bar run game item.
   */
  private itemRunGame: vscode.StatusBarItem;

  /**
   * Constructor.
   */
  constructor(options?: StatusBarOptions) {
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
    this.initializeItems();
    if (options) {
      this.update(options);
    }
  }

  /**
   * Updates status bar instance with the given options.
   * @param options Status bar options.
   */
  update(options: StatusBarOptions): void {
    this.itemProjectFolder.text = `$(folder) RPG Maker Active Project: ${options.projectFolder}`;
  }

  /**
   * Controls all status bar items visibility.
   *
   * If no options are given, it hides all items.
   * @param options Status bar options
   */
  controlStatusBar(options?: StatusBarControl): void {
    // Updates set project folder item visibility
    options?.changeProjectFolder
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
   * Disposes all items from the status bar.
   */
  dispose() {
    this.itemSetProjectFolder.dispose();
    this.itemProjectFolder.dispose();
    this.itemExtractScripts.dispose();
    this.itemRunGame.dispose();
  }

  /**
   * Initializes the status bar configuration.
   */
  private initializeItems(): void {
    // Set Project Folder item
    this.itemSetProjectFolder.name = 'RGSS Script Editor: Set Project Folder';
    this.itemSetProjectFolder.text =
      '$(folder-library) Choose RPG Maker Project Folder';
    this.itemSetProjectFolder.tooltip =
      'Choose a RPG Maker project folder from the current workspace to activate it';
    this.itemSetProjectFolder.command = 'rgss-script-editor.setProjectFolder';
    // Opened Project Folder item
    this.itemProjectFolder.name = 'RGSS Script Editor: Active Project Folder';
    this.itemProjectFolder.text = '$(folder) RPG Maker Active Project: None';
    this.itemProjectFolder.tooltip =
      'Opens the current active RPG Maker project folder';
    this.itemProjectFolder.command = 'rgss-script-editor.openProjectFolder';
    // Run Game item
    this.itemRunGame.name = 'RGSS Script Editor: Run Game';
    this.itemRunGame.text = '$(run) Run Game';
    this.itemRunGame.tooltip = 'Runs the game executable';
    this.itemRunGame.command = 'rgss-script-editor.runGame';
    // Extract Scripts item
    this.itemExtractScripts.name = 'RGSS Script Editor: Extract Scripts';
    this.itemExtractScripts.text = '$(arrow-down) Extract Scripts';
    this.itemExtractScripts.tooltip =
      'Extracts all scripts from the bundled RPG Maker scripts file';
    this.itemExtractScripts.command = 'rgss-script-editor.extractScripts';
  }
}
