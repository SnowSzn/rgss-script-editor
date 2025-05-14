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
 * Enum of types of run game behaviors
 */
export const enum RunGameBehavior {
  NOTHING = 'nothing',
  KILL_AND_RUN = 'kill and run',
  ALLOW_MULTIPLE = 'allow multiple',
}

/**
 * Enum of script name validation types
 */
export const enum NameValidation {
  AUTO = 'auto',
  ALWAYS = 'always',
  NEVER = 'never',
}

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
 * Determine path options
 */
type DeterminePathOptions = {
  /**
   * Whether to remove the file segment from the path or not
   */
  removeFilePart?: boolean;
};

/**
 * Determine extension options
 */
type DetermineExtensionOptions = {
  /**
   * Whether to remove the extension dot or not
   */
  removeDot?: boolean;
};

/**
 * Configuration class
 */
export class Configuration {
  /**
   * Log file name.
   *
   * Log file that is created inside the active project folder.
   */
  public static LOG_FILE_NAME = 'extension.log';

  /**
   * Game execution output file name.
   *
   * This file is created by the game when an exception kills the process.
   *
   * The exception's name and the backtrace are written inside of it.
   */
  public static GAME_OUTPUT_FILE = 'game.log';

  /**
   * File name of the backup file that the user creates from the extracted scripts.
   *
   * The name should not have extensions since it will get automatically determined
   * based on the RGSS version on runtime.
   */
  public static EXTRACTED_SCRIPTS_BACKUP_FILE_NAME =
    'Manual Backup of Extracted Scripts';

  /**
   * File name for the compiled scripts bundle file
   *
   * The name should not have extensions since it will get automatically determined
   * based on the RGSS version on runtime.
   */
  public static COMPILE_SCRIPTS_FILE_NAME = 'Scripts';

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
   * Gets the extension insert encoding magic comment flag.
   * @returns Insert encoding comment flag.
   */
  configInsertEncodingComment(): boolean {
    return this._getVSCodeConfig<boolean>('extension.insertEncodingComment')!;
  }

  /**
   * Gets the extension re-create script loader flag.
   * @returns Re-create script loader flag.
   */
  configRecreateScriptLoader(): boolean {
    return this._getVSCodeConfig<boolean>('extension.recreateScriptLoader')!;
  }

  /**
   * Gets the import operation overwrite flag.
   * @returns Import overwrite flag.
   */
  configImportOverwrite(): boolean {
    return this._getVSCodeConfig<boolean>('extension.importScriptsOverwrite')!;
  }

  /**
   * Gets the script name validation mode.
   * @returns Script name validation mode.
   */
  configScriptNameValidation(): string {
    return this._getVSCodeConfig<string>('extension.scriptNameValidation')!;
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
   * Gets the project relative path to the extension log file folder.
   * @returns Log file folder.
   */
  configLogFileFolder(): string {
    return this._getVSCodeConfig<string>('external.extensionLogFileFolder')!;
  }

  /**
   * Gets the project relative path to the game log file folder.
   * @returns Log file folder.
   */
  configGameLogFileFolder(): string {
    return this._getVSCodeConfig<string>('external.gameLogFileFolder')!;
  }

  /**
   * Gets the project relative path to the compiled scripts folder.
   * @returns Scripts compiled folder path.
   */
  configScriptsCompileFolder(): string {
    return this._getVSCodeConfig<string>('external.scriptsCompileFolder')!;
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
   * Gets the run game behavior
   * @returns Run game behavior
   */
  configRunGameBehavior(): string {
    return this._getVSCodeConfig<string>('gameplay.runGameBehavior')!;
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
   * Determines the path to the scripts folder from the current project's folder.
   * @returns Scripts folder uri path
   */
  determineScriptsPath() {
    return this.joinProject(this.configScriptsFolder());
  }

  /**
   * Determines the path to the log file.
   *
   * The path is based on the current active folder.
   *
   * If the folder is not valid, it returns ``undefined``
   *
   * @param options Options
   * @returns Log file uri path
   */
  determineLogFilePath(options?: DeterminePathOptions) {
    if (options?.removeFilePart) {
      return this.joinProject(this.configLogFileFolder());
    } else {
      return this.joinProject(
        this.configLogFileFolder(),
        Configuration.LOG_FILE_NAME
      );
    }
  }

  /**
   * Determines the path to the game's output file.
   *
   * This file is used by the extension to process possible game exceptions.
   *
   * The path is based on the current active folder.
   *
   * If the folder is not valid, it returns ``undefined``
   *
   * @param options Options
   * @returns Game output file uri path
   */
  determineGameLogPath(options?: DeterminePathOptions) {
    if (options?.removeFilePart) {
      return this.joinProject(this.configGameLogFileFolder());
    } else {
      return this.joinProject(
        this.configGameLogFileFolder(),
        Configuration.GAME_OUTPUT_FILE
      );
    }
  }

  /**
   * Determines the path to the scripts compile folder from the current project's folder.
   *
   * The file extension is determined based on the RPG Maker version detected.
   *
   * @param options Options
   * @returns Scripts compile folder uri path
   */
  determineScriptsCompilePath(options?: DeterminePathOptions) {
    if (options?.removeFilePart) {
      return this.joinProject(this.configScriptsCompileFolder());
    } else {
      let uri = this.joinProject(
        this.configScriptsCompileFolder(),
        Configuration.COMPILE_SCRIPTS_FILE_NAME
      );

      // Adds the appropiate extension
      if (uri) {
        uri = this.processExtension(uri);
      }
      return uri;
    }
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

    // Checks if user is forcing a specific EOL (only valid EOLs)
    if (eol === FilesEOL.CRLF || eol === FilesEOL.LF) {
      return eol;
    }

    // Determine the EOL based on the current platform (auto)
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
   * Determines if the extension should validate script names or not
   * @returns Script name validation
   */
  determineNameValidation(): boolean {
    let mode = this.configScriptNameValidation();

    // Checks depending of the mode
    switch (mode) {
      case NameValidation.ALWAYS:
        return true;
      case NameValidation.NEVER:
        return false;
      case NameValidation.AUTO:
        if (this._rgssVersion === RGSSVersion.RGSS3) {
          return false;
        } else {
          return true;
        }

      default:
        return true;
    }
  }

  /**
   * Determines the game behavior
   * @returns Game behavior
   */
  determineGameBehavior(): string {
    let gameBehavior = this.configRunGameBehavior();

    // Checks behavior validness and returns the appropiate value
    switch (gameBehavior) {
      case RunGameBehavior.NOTHING:
      case RunGameBehavior.KILL_AND_RUN:
      case RunGameBehavior.ALLOW_MULTIPLE:
        return gameBehavior;
      default:
        return RunGameBehavior.NOTHING;
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
   * Gets the relative path from the project's folder to the given uri
   * @param uri Target Uri path
   * @returns Relative path to ``uri``
   */
  fromProject(uri?: vscode.Uri): string | undefined {
    if (this.isValid() && uri) {
      return path.relative(this._projectFolderPath!.fsPath, uri.fsPath);
    }
    return undefined;
  }

  /**
   * Determines the appropiate bundle file extension based on the RGSS version detected.
   * @returns Bundle file extension
   */
  determineExtension(options?: DetermineExtensionOptions): string {
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

    // Whether to remove the dot or not
    if (options?.removeDot) {
      extension = extension.substring(1);
    }

    return extension;
  }

  /**
   * Processes the given uri path to append the proper extension.
   *
   * This method won't remove the extension if the uri path has one already.
   * @param filepath File path
   * @returns Processed file uri
   */
  processExtension(filepath: vscode.Uri | string) {
    // Determine the proper extension based on the RGSS version detected
    let extension = this.determineExtension();
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
   * Creates a backup uri path with the given filename.
   *
   * If the backup path cannot be determined, it returns ``undefined``.
   * @param fileName File name
   * @returns The formatted backup uri path
   */
  processBackupFilePath(fileName: string) {
    const backupsFolder = this.determineBackupsPath();

    // Checks backup folder validness
    if (!backupsFolder) {
      return undefined;
    }

    return vscode.Uri.joinPath(
      backupsFolder,
      `${fileName} - ${this._currentDate()}.bak`
    );
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

  /**
   * Formats the current date and returns it as a string.
   * @returns Formatted date.
   */
  private _currentDate(): string {
    let date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    const hour = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}.${month}.${day} - ${hour}.${minutes}.${seconds}`;
  }
}
