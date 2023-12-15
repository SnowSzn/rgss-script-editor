import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Project folder information.
 */
export type FolderInfo = {
  /**
   * Absolute path to the project folder.
   */
  projectFolderPath: vscode.Uri;

  /**
   * RGSS version.
   */
  rgssVersion: string;

  /**
   * Absolute path to the RPG Maker bundle file.
   */
  bundleFilePath: vscode.Uri;

  /**
   * Absolute path to the scripts folder.
   */
  scriptsFolderPath: vscode.Uri;

  /**
   * Absolute path to the back ups folder.
   */
  backUpsFolderPath: vscode.Uri;

  /**
   * Absolute path to the game executable.
   */
  gameExePath: vscode.Uri;

  /**
   * Log file URI path.
   */
  logFilePath: vscode.Uri;

  /**
   * Game output file URI path.
   */
  gameOutputPath: vscode.Uri;
};

/**
 * Return type when changing the current project folder.
 */
export type ConfigChangeFolder = {
  oldProjectFolder?: FolderInfo;
  curProjectFolder: FolderInfo;
};

/**
 * Enum of valid RGSS versions.
 */
const enum RGSSVersion {
  RGSS1 = 'RGSS1',
  RGSS2 = 'RGSS2',
  RGSS3 = 'RGSS3',
}

/**
 * Enum of valid game test arguments based on the RGSS version.
 */
const enum RGSSGameArgsTest {
  RGSS1 = 'debug',
  RGSS2 = 'test',
  RGSS3 = 'test',
}

/**
 * Enum of valid game console arguments based on the RGSS version.
 */
const enum RGSSGameArgsConsole {
  RGSS1 = '',
  RGSS2 = '',
  RGSS3 = 'console',
}

/**
 * Enum of relative paths from the project folder to the bundle scripts file based on the RGSS version.
 */
const enum RGSSBundlePath {
  RGSS1 = 'Data/Scripts.rxdata',
  RGSS2 = 'Data/Scripts.rvdata',
  RGSS3 = 'Data/Scripts.rvdata2',
}

/**
 * Configuration class
 */
export class Configuration {
  /**
   * Log file name.
   *
   * Log file that is created inside the active project folder.
   */
  public static LOG_FILE_NAME = '.rgss-script-editor.log';

  /**
   * Game execution output file name.
   *
   * This file is created by the game when an exception kills the process.
   *
   * The exception's name and the backtrace are written inside of it.
   */
  public static GAME_OUTPUT_FILE = '.rgss-script-editor-game.log';

  /**
   * RGSS Version.
   */
  private _rgssVersion?: string;

  /**
   * Project folder URI path.
   */
  private _projectFolderPath?: vscode.Uri;

  /**
   * RPG Maker bundle file URI path.
   */
  private _bundleFilePath?: vscode.Uri;

  /**
   * External scripts folder URI path.
   */
  private _scriptsFolderPath?: vscode.Uri;

  /**
   * Back ups folder URI path.
   */
  private _backUpsFolderPath?: vscode.Uri;

  /**
   * Game executable URI path.
   */
  private _gameExePath?: vscode.Uri;

  /**
   * Log file URI path.
   */
  private _logFilePath?: vscode.Uri;

  /**
   * Game output file URI path.
   */
  private _gameOutputPath?: vscode.Uri;

  /**
   * Constructor.
   */
  constructor() {
    this._projectFolderPath = undefined;
    this._rgssVersion = undefined;
  }

  /**
   * RGSS Version.
   */
  get rgss() {
    return this._rgssVersion;
  }

  /**
   * Project folder URI path.
   */
  get projectFolderPath() {
    return this._projectFolderPath;
  }

  /**
   * RPG Maker bundle file URI path.
   */
  get bundleFilePath() {
    return this._bundleFilePath;
  }

  /**
   * External scripts folder URI path.
   */
  get scriptsFolderPath() {
    return this._scriptsFolderPath;
  }

  /**
   * Back ups folder URI path.
   */
  get backUpsFolderPath() {
    return this._backUpsFolderPath;
  }

  /**
   * Game executable URI path.
   */
  get gameExePath() {
    return this._gameExePath;
  }

  /**
   * Log file URI path.
   */
  get logFilePath() {
    return this._logFilePath;
  }

  /**
   * Game output file URI path.
   */
  get gameOutputPath() {
    return this._gameOutputPath;
  }

  /**
   * Gets the extension quickstart status flag.
   * @returns Quickstart status flag.
   */
  configQuickstart(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('extension.quickStart');
  }

  /**
   * Gets the extension auto reveal flag.
   * @returns Auto reveal flag.
   */
  configAutoReveal(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('extension.autoReveal');
  }

  /**
   * Gets log to console flag status.
   * @returns Log to console flag.
   */
  configLogConsole(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('debug.logToConsole');
  }

  /**
   * Gets log to file flag status.
   * @returns Log to file flag.
   */
  configLogFile(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('debug.logToFile');
  }

  /**
   * Gets the project relative path to the back ups folder.
   * @returns Back ups folder path.
   */
  configBackUpsFolder(): string | undefined {
    return this._getVSCodeConfig<string>('external.backUpsFolder');
  }

  /**
   * Gets the project relative path to the extracted scripts folder.
   * @returns Scripts folder path.
   */
  configScriptsFolder(): string | undefined {
    return this._getVSCodeConfig<string>('external.scriptsFolder');
  }

  /**
   * Gets the game executable relative path.
   * @returns Game executable relative path.
   */
  configExeGamePath(): string | undefined {
    return this._getVSCodeConfig<string>('gameplay.gameExecutablePath');
  }

  /**
   * Gets use Wine flag status to run the executable in Linux.
   * @returns Whether to use Wine or not.
   */
  configUseWine(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.useWine');
  }

  /**
   * Gets the game executable automatic arguments detection mode.
   *
   * When this mode is enabled custom arguments are ignored.
   * @returns Auto. Argument detection
   */
  configExeArgsDetection(): boolean | undefined {
    return this._getVSCodeConfig<boolean>(
      'gameplay.automaticArgumentsDetection'
    );
  }

  /**
   * Gets whether the test mode is enabled or not.
   * @returns Test mode enable status.
   */
  configExeTestMode(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.editorTestMode');
  }

  /**
   * Gets whether the RPG Maker native console is enabled or not
   * @returns Native console enable status
   */
  configExeConsole(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.nativeConsole');
  }

  /**
   * Gets custom arguments to launch the game executable
   *
   * This must be used only when auto. arguments detection mode is turned off
   * @returns Custom arguments string
   */
  configExeCustomArgs(): string | undefined {
    return this._getVSCodeConfig<string>('gameplay.customArguments');
  }

  /**
   * Gets the extension game exception auto process flag.
   * @returns Auto process extension flag.
   */
  configGameErrorAutoProcess(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.gameExceptionAutoProcess');
  }

  /**
   * Gets the extension game exception shows in the editor window flag.
   * @returns Show in the editor flag.
   */
  configGameErrorShowEditor(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.gameExceptionShowInEditor');
  }

  /**
   * Checks if this configuration instance is valid.
   *
   * Being valid means that a folder was opened and the RGSS version was detected.
   *
   * If the RGSS version was detected, the rest of attributes are assumed to be valid.
   * @returns Whether it is valid or not.
   */
  isValid(): boolean {
    return !!this._rgssVersion;
  }

  /**
   * This method checks if the given ``folder`` is a valid RPG Maker project folder.
   *
   * If the folder is valid, it returns information about the folder, otherwise returns ``null``.
   * @param folder Folder Uri path.
   * @returns Folder information.
   */
  checkFolder(folder: vscode.Uri): FolderInfo | null {
    let backups = this.configBackUpsFolder();
    let scripts = this.configScriptsFolder();
    let game = this.configExeGamePath();
    // Checks for VSCode configuration validness
    if (!backups || !scripts || !game) {
      return null;
    }
    // Creates paths
    let backUpsPath = vscode.Uri.joinPath(folder, backups);
    let scriptsPath = vscode.Uri.joinPath(folder, scripts);
    let gameExePath = vscode.Uri.joinPath(folder, game);
    let logFilePath = vscode.Uri.joinPath(folder, Configuration.LOG_FILE_NAME);
    let gameOutPath = vscode.Uri.joinPath(
      folder,
      Configuration.GAME_OUTPUT_FILE
    );
    let rgss1 = vscode.Uri.joinPath(folder, RGSSBundlePath.RGSS1);
    let rgss2 = vscode.Uri.joinPath(folder, RGSSBundlePath.RGSS2);
    let rgss3 = vscode.Uri.joinPath(folder, RGSSBundlePath.RGSS3);
    // Formats the folder information based on the RGSS version
    if (fs.existsSync(rgss1.fsPath)) {
      return {
        projectFolderPath: folder,
        rgssVersion: RGSSVersion.RGSS1,
        backUpsFolderPath: backUpsPath,
        scriptsFolderPath: scriptsPath,
        gameOutputPath: gameOutPath,
        gameExePath: gameExePath,
        logFilePath: logFilePath,
        bundleFilePath: rgss1,
      };
    }
    // Checks for RGSS2
    if (fs.existsSync(rgss2.fsPath)) {
      return {
        projectFolderPath: folder,
        rgssVersion: RGSSVersion.RGSS2,
        backUpsFolderPath: backUpsPath,
        scriptsFolderPath: scriptsPath,
        gameOutputPath: gameOutPath,
        gameExePath: gameExePath,
        logFilePath: logFilePath,
        bundleFilePath: rgss2,
      };
    }
    // Checks for RGSS3
    if (fs.existsSync(rgss3.fsPath)) {
      return {
        projectFolderPath: folder,
        rgssVersion: RGSSVersion.RGSS3,
        backUpsFolderPath: backUpsPath,
        scriptsFolderPath: scriptsPath,
        gameOutputPath: gameOutPath,
        gameExePath: gameExePath,
        logFilePath: logFilePath,
        bundleFilePath: rgss3,
      };
    }
    return null;
  }

  /**
   * Asynchronously updates the configuration with the given project folder.
   *
   * If the instance is updated successfully it returns information about the folder change.
   *
   * If it fails to update the folder it rejects the promise with an error.
   * @param folder Project Folder.
   * @throws An error when the given folder is invalid.
   * @returns A promise.
   */
  async update(folder: vscode.Uri): Promise<ConfigChangeFolder> {
    let info = this.checkFolder(folder);
    if (info) {
      // RGSS version found, valid RPG Maker project folder.
      let oldProjectFolder = this.getInfo();
      this._rgssVersion = info.rgssVersion;
      this._projectFolderPath = info.projectFolderPath;
      this._backUpsFolderPath = info.backUpsFolderPath;
      this._scriptsFolderPath = info.scriptsFolderPath;
      this._bundleFilePath = info.bundleFilePath;
      this._gameExePath = info.gameExePath;
      this._gameOutputPath = info.gameOutputPath;
      this._logFilePath = info.logFilePath;
      return { oldProjectFolder: oldProjectFolder, curProjectFolder: info };
    } else {
      // RGSS version was not found, probably an invalid folder.
      this._rgssVersion = undefined;
      this._bundleFilePath = undefined;
      this._scriptsFolderPath = undefined;
      this._backUpsFolderPath = undefined;
      this._gameExePath = undefined;
      throw new Error(
        `Cannot update to folder: ${folder.fsPath}. A valid RGSS version was not detected!`
      );
    }
  }

  /**
   * Gets information about the current opened project folder.
   *
   * If the current opened folder is not valid it returns ``undefined``.
   * @returns Folder information
   */
  getInfo(): FolderInfo | undefined {
    if (this.isValid()) {
      return {
        rgssVersion: this._rgssVersion!,
        projectFolderPath: this._projectFolderPath!,
        bundleFilePath: this._bundleFilePath!,
        scriptsFolderPath: this._scriptsFolderPath!,
        backUpsFolderPath: this._backUpsFolderPath!,
        gameExePath: this._gameExePath!,
        gameOutputPath: this._gameOutputPath!,
        logFilePath: this._logFilePath!,
      };
    }
    return undefined;
  }

  /**
   * Gets the appropiate game executable arguments.
   *
   * If automatic argument detection is enabled it will ignore custom arguments.
   *
   * If the arguments cannot be determined it returns ``undefined``.
   * @returns List of game arguments.
   */
  determineGameArgs(): string[] | undefined {
    let args: string[] = [];
    // Auto. arguments detection enabled
    if (this.configExeArgsDetection()) {
      switch (this._rgssVersion) {
        case RGSSVersion.RGSS1: {
          // Test argument
          if (this.configExeTestMode() && !!RGSSGameArgsTest.RGSS1) {
            args.push(RGSSGameArgsTest.RGSS1);
          }
          // Console argument
          if (this.configExeConsole() && !!RGSSGameArgsConsole.RGSS1) {
            args.push(RGSSGameArgsConsole.RGSS1);
          }
          return args;
        }
        case RGSSVersion.RGSS2: {
          // Test argument
          if (this.configExeTestMode() && !!RGSSGameArgsTest.RGSS2) {
            args.push(RGSSGameArgsTest.RGSS2);
          }
          // Console argument
          if (this.configExeConsole() && !!RGSSGameArgsConsole.RGSS2) {
            args.push(RGSSGameArgsConsole.RGSS2);
          }
          return args;
        }
        case RGSSVersion.RGSS3: {
          // Test argument
          if (this.configExeTestMode() && !!RGSSGameArgsTest.RGSS3) {
            args.push(RGSSGameArgsTest.RGSS3);
          }
          // Console argument
          if (this.configExeConsole() && !!RGSSGameArgsConsole.RGSS3) {
            args.push(RGSSGameArgsConsole.RGSS3);
          }
          return args;
        }
        default: {
          return undefined;
        }
      }
    } else {
      // Custom arguments
      this.configExeCustomArgs()
        ?.split(' ')
        .forEach((arg) => {
          args.push(arg);
        });
      return args;
    }
  }

  /**
   * Joins all given path segments to the current project folder path.
   *
   * If the current project folder is invalid, it returns ``undefined``.
   * @param segments List of segments.
   * @returns Joined path.
   */
  joinProject(...segments: string[]): vscode.Uri | undefined {
    if (this.isValid()) {
      return vscode.Uri.joinPath(this._projectFolderPath!, ...segments);
    }
    return undefined;
  }

  /**
   * Gets the configuration value from the VS Code settings.
   *
   * If the key is not found it returns ``undefined``.
   * @param key Configuration key
   * @returns
   */
  private _getVSCodeConfig<T>(key: string): T | undefined {
    return vscode.workspace.getConfiguration('rgssScriptEditor').get<T>(key);
  }
}
