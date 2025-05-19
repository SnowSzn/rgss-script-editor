import * as vscode from 'vscode';
import * as strings from '../../utils/strings';

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
    this._initialize();
  }

  /**
   * Updates status bar instance with the given options.
   * @param options Status bar options.
   */
  update(options: StatusBarOptions): void {
    this.itemProjectFolder.text = `$(folder) ${vscode.l10n.t(
      strings.UI_PROJECT_FOLDER_TEXT,
      options.projectFolder
    )}`;
  }

  /**
   * Shows all items on the status bar.
   */
  show() {
    this.control({
      changeProjectFolder: true,
      currentProjectFolder: true,
      extractScripts: true,
      runGame: true,
    });
  }

  /**
   * Hides all items on the status bar.
   */
  hide() {
    this.control();
  }

  /**
   * Controls all status bar items visibility.
   *
   * If no options are given, it hides all items.
   * @param options Status bar options
   */
  control(options?: StatusBarControl): void {
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
   * Initializes the status bar items.
   */
  private _initialize() {
    // Set Project Folder item
    this.itemSetProjectFolder.name = strings.UI_SET_PROJECT_NAME;
    this.itemSetProjectFolder.text = `$(folder-library) ${strings.UI_SET_PROJECT_TEXT}`;
    this.itemSetProjectFolder.tooltip = strings.UI_SET_PROJECT_TOOLTIP;
    this.itemSetProjectFolder.command = 'rgss-script-editor.setProjectFolder';

    // Opened Project Folder item
    this.itemProjectFolder.name = strings.UI_PROJECT_FOLDER_NAME;
    this.itemProjectFolder.text = `$(folder) ${vscode.l10n.t(
      strings.UI_PROJECT_FOLDER_TEXT,
      '-'
    )}`;
    this.itemProjectFolder.tooltip = strings.UI_PROJECT_FOLDER_TOOLTIP;
    this.itemProjectFolder.command = 'rgss-script-editor.openProjectFolder';

    // Run Game item
    this.itemRunGame.name = strings.UI_RUN_GAME_NAME;
    this.itemRunGame.text = `$(run) ${strings.UI_RUN_GAME_TEXT}`;
    this.itemRunGame.tooltip = strings.UI_RUN_GAME_TOOLTIP;
    this.itemRunGame.command = 'rgss-script-editor.runGame';

    // Extract Scripts item
    this.itemExtractScripts.name = strings.UI_EXTRACT_NAME;
    this.itemExtractScripts.text = `$(arrow-down) ${strings.UI_EXTRACT_TEXT}`;
    this.itemExtractScripts.tooltip = strings.UI_EXTRACT_TOOLTIP;
    this.itemExtractScripts.command = 'rgss-script-editor.extractScripts';
  }
}
