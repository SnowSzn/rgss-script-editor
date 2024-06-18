import * as path from 'path';
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
   * Project folder name.
   */
  projectFolderName: string;

  /**
   * RGSS version.
   */
  rgssVersion: string;
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
 * Enum of file's end of line types
 */
const enum FilesEOL {
  AUTO = 'auto',
  CRLF = '\r\n',
  LF = '\n',
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
   * File name of the back up file that the user creates from the extracted scripts.
   *
   * The name should avoid extensions since it will get automatically determined
   * based on the RGSS version on runtime.
   */
  public static EXTRACTED_SCRIPTS_BACK_UP_FILE_NAME =
    'Manual Backup of Extracted Scripts';

  /**
   * RGSS Version.
   */
  private _rgssVersion?: string;

  /**
   * Project folder URI path.
   */
  private _projectFolderPath?: vscode.Uri;

  /**
   * Project folder name
   */
  private _projectFolderName?: string;

  /**
   * Constructor.
   */
  constructor() {
    this._rgssVersion = undefined;
    this._projectFolderPath = undefined;
    this._projectFolderName = undefined;
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
   * Project folder name
   */
  get projectFolderName() {
    return this._projectFolderName;
  }

  /**
   * Gets the extension quickstart status flag.
   * @returns Quickstart status flag.
   */
  configQuickstart(): boolean {
    return this._getVSCodeConfig<boolean>('extension.quickStart')!;
  }

  /**
   * Gets the extension auto reveal flag.
   * @returns Auto reveal flag.
   */
  configAutoReveal(): boolean {
    return this._getVSCodeConfig<boolean>('extension.autoReveal')!;
  }

  /**
   * Gets the extension file EOL type.
   * @returns File EOL sequence.
   */
  configFileEOL(): string {
    return this._getVSCodeConfig<string>('extension.filesEndOfLine')!;
  }

  /**
   * Gets log to console flag status.
   * @returns Log to console flag.
   */
  configLogConsole(): boolean {
    return this._getVSCodeConfig<boolean>('debug.logToConsole')!;
  }

  /**
   * Gets log to file flag status.
   * @returns Log to file flag.
   */
  configLogFile(): boolean {
    return this._getVSCodeConfig<boolean>('debug.logToFile')!;
  }

  /**
   * Gets the project relative path to the back ups folder.
   * @returns Back ups folder path.
   */
  configBackUpsFolder(): string {
    return this._getVSCodeConfig<string>('external.backUpsFolder')!;
  }

  /**
   * Gets the project relative path to the extracted scripts folder.
   * @returns Scripts folder path.
   */
  configScriptsFolder(): string {
    return this._getVSCodeConfig<string>('external.scriptsFolder')!;
  }

  /**
   * Gets the game executable relative path.
   * @returns Game executable relative path.
   */
  configExeGamePath(): string {
    return this._getVSCodeConfig<string>('gameplay.gameExecutablePath')!;
  }

  /**
   * Gets the Wine command to run the executable in Linux.
   * @returns Wine command.
   */
  configUseWine(): string {
    return this._getVSCodeConfig<string>('gameplay.useWine')!;
  }

  /**
   * Gets the game executable automatic arguments detection mode.
   *
   * When this mode is enabled custom arguments are ignored.
   * @returns Auto. Argument detection
   */
  configExeArgsDetection(): boolean {
    return this._getVSCodeConfig<boolean>(
      'gameplay.automaticArgumentsDetection'
    )!;
  }

  /**
   * Gets whether the test mode is enabled or not.
   * @returns Test mode enable status.
   */
  configExeTestMode(): boolean {
    return this._getVSCodeConfig<boolean>('gameplay.editorTestMode')!;
  }

  /**
   * Gets whether the RPG Maker native console is enabled or not
   * @returns Native console enable status
   */
  configExeConsole(): boolean {
    return this._getVSCodeConfig<boolean>('gameplay.nativeConsole')!;
  }

  /**
   * Gets custom arguments to launch the game executable
   *
   * This must be used only when auto. arguments detection mode is turned off
   * @returns Custom arguments string
   */
  configExeCustomArgs(): string {
    return this._getVSCodeConfig<string>('gameplay.customArguments')!;
  }

  /**
   * Gets the extension game exception auto process flag.
   * @returns Auto process extension flag.
   */
  configGameErrorAutoProcess(): boolean {
    return this._getVSCodeConfig<boolean>('gameplay.gameExceptionAutoProcess')!;
  }

  /**
   * Gets the extension game exception shows in the editor window flag.
   * @returns Show in the editor flag.
   */
  configGameErrorShowEditor(): boolean {
    return this._getVSCodeConfig<boolean>(
      'gameplay.gameExceptionShowInEditor'
    )!;
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
        projectFolderName: this._projectFolderName!,
      };
    }
    return undefined;
  }

  /**
   * This method checks if the given ``folder`` is a valid RPG Maker project folder.
   *
   * If the folder is valid, it returns information about the folder, otherwise returns ``null``.
   * @param folder Folder Uri path.
   * @returns Folder information.
   */
  checkFolder(folder: vscode.Uri): FolderInfo | null {
    let projectName = path.basename(folder.fsPath);
    let rgss1 = vscode.Uri.joinPath(folder, RGSSBundlePath.RGSS1);
    let rgss2 = vscode.Uri.joinPath(folder, RGSSBundlePath.RGSS2);
    let rgss3 = vscode.Uri.joinPath(folder, RGSSBundlePath.RGSS3);
    // Formats the folder information based on the RGSS version
    if (fs.existsSync(rgss1.fsPath)) {
      return {
        projectFolderPath: folder,
        rgssVersion: RGSSVersion.RGSS1,
        projectFolderName: projectName,
      };
    }
    // Checks for RGSS2
    if (fs.existsSync(rgss2.fsPath)) {
      return {
        projectFolderPath: folder,
        rgssVersion: RGSSVersion.RGSS2,
        projectFolderName: projectName,
      };
    }
    // Checks for RGSS3
    if (fs.existsSync(rgss3.fsPath)) {
      return {
        projectFolderPath: folder,
        rgssVersion: RGSSVersion.RGSS3,
        projectFolderName: projectName,
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
      this._projectFolderName = info.projectFolderName;
      return { oldProjectFolder: oldProjectFolder, curProjectFolder: info };
    } else {
      // RGSS version was not found, probably an invalid folder.
      this._rgssVersion = undefined;
      this._projectFolderPath = undefined;
      this._projectFolderName = undefined;
      throw new Error(
        `Cannot update to folder: ${folder.fsPath}. A valid RGSS version was not detected!`
      );
    }
  }

  /**
   * Determines the path to the log file.
   *
   * The path is based on the current active folder.
   *
   * If the folder is not valid, it returns ``undefined``
   * @returns Log file uri path
   */
  determineLogFilePath() {
    return this.joinProject(Configuration.LOG_FILE_NAME);
  }

  /**
   * Determines the path to the game's output file.
   *
   * This file is used by the extension to process possible game exceptions.
   *
   * The path is based on the current active folder.
   *
   * If the folder is not valid, it returns ``undefined``
   * @returns Game output file uri path
   */
  determineGameOutputPath() {
    return this.joinProject(Configuration.GAME_OUTPUT_FILE);
  }

  /**
   * Determines the path to the game scripts bundle file.
   *
   * The path is based on the current active folder and RGSS version.
   *
   * If the folder is not valid, it returns ``undefined``
   * @returns Bundle file uri path
   */
  determineBundleFilePath() {
    // Determines appropiate bundle based on the RGSS version
    let bundle = undefined;
    switch (this._rgssVersion) {
      case RGSSVersion.RGSS1:
        bundle = RGSSBundlePath.RGSS1;
        break;
      case RGSSVersion.RGSS2:
        bundle = RGSSBundlePath.RGSS2;
        break;
      case RGSSVersion.RGSS3:
        bundle = RGSSBundlePath.RGSS3;
        break;
      default:
        bundle = undefined;
        break;
    }
    // Join path with the appropiate bundle file
    return bundle ? this.joinProject(bundle) : undefined;
  }

  /**
   * Determines the path to the scripts folder from the current project's folder.
   * @returns Scripts folder uri path
   */
  determineScriptsPath() {
    return this.joinProject(this.configScriptsFolder());
  }

  /**
   * Determines the path to the backups folder.
   *
   * The path is based on the current active folder.
   *
   * If the folder is not valid, it returns ``undefined``
   * @returns Backups folder uri path
   */
  determineBackupsPath() {
    return this.joinProject(this.configBackUpsFolder());
  }

  /**
   * Determines the path to the game executable.
   *
   * The path is based on the current active folder.
   *
   * If the folder is not valid, it returns ``undefined``
   * @returns Game executable uri path
   */
  determineGamePath() {
    return this.joinProject(this.configExeGamePath());
  }

  /**
   * Determines the appropiate game executable arguments.
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
   * Determines the file EOL that the extension should use
   * @returns File EOL
   */
  determineFileEOL(): string {
    let eol = this.configFileEOL();

    // Checks if user is forcing a specific EOL
    if (eol !== FilesEOL.AUTO) {
      return eol;
    }

    // Determine the EOL based on the current platform
    switch (process.platform) {
      case 'win32':
        return FilesEOL.CRLF;
      case 'linux':
      case 'darwin':
        return FilesEOL.LF;
      default:
        return FilesEOL.LF;
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
   * Processes the given uri path to append the proper extension based on the RGSS version detected.
   *
   * This method won't remove the extension if the uri path has one already.
   * @param filepath File path
   * @returns Processed file uri
   */
  processExtension(filepath: vscode.Uri | string) {
    // Determine the proper extension based on the RGSS version detected
    let extension = '';
    switch (this.rgss) {
      case RGSSVersion.RGSS1: {
        extension = '.rxdata';
        break;
      }
      case RGSSVersion.RGSS2: {
        extension = '.rvdata';
        break;
      }
      case RGSSVersion.RGSS3: {
        extension = '.rvdata2';
        break;
      }
    }
    // Determines Uri based on the given argument type
    const uri =
      filepath instanceof vscode.Uri ? filepath : vscode.Uri.file(filepath);
    // Checks if proper extension is present already
    if (uri.fsPath.toLowerCase().endsWith(extension)) {
      return uri;
    }
    // Concatenates the proper extension
    const dirname = path.dirname(uri.fsPath);
    const basename = path.basename(uri.fsPath).concat(extension);
    return vscode.Uri.file(path.join(dirname, basename));
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
