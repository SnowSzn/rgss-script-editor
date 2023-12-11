import * as fs from 'fs';
import * as vscode from 'vscode';
import * as pathing from './pathing';

/**
 * Project folder information.
 */
export type FolderInfo = {
  /**
   * Absolute path to the project folder.
   */
  projectFolderPath: string;

  /**
   * Project folder name.
   */
  projectFolderName: string;

  /**
   * RGSS version.
   */
  rgssVersion: string;

  /**
   * Absolute path to the RPG Maker bundle file.
   */
  bundleFilePath: string;

  /**
   * Absolute path to the scripts folder.
   */
  scriptsFolderPath: string;

  /**
   * Absolute path to the back ups folder.
   */
  backUpsFolderPath: string;
};

/**
 * Return type when changing the current project folder.
 */
export type ConfigChangeFolder = {
  oldProjectFolder: FolderInfo | undefined;
  curProjectFolder: FolderInfo;
};

/**
 * Enum of valid RGSS versions
 */
export const enum RGSSVersions {
  RGSS1 = 'RGSS1',
  RGSS2 = 'RGSS2',
  RGSS3 = 'RGSS3',
}

/**
 * Enum of valid test arguments based on the RGSS version
 */
export const enum RGSSTestArguments {
  RGSS1 = 'debug',
  RGSS2 = 'test',
  RGSS3 = 'test',
}

/**
 * Enum of valid test arguments based on the RGSS version
 */
export const enum RGSSConsoleArguments {
  RGSS1 = '',
  RGSS2 = '',
  RGSS3 = 'console',
}

/**
 * Enum of relative paths to the bundle scripts file based on the RGSS version
 */
export const enum RGSSBundleScriptsPath {
  RGSS1 = 'Data/Scripts.rxdata',
  RGSS2 = 'Data/Scripts.rvdata',
  RGSS3 = 'Data/Scripts.rvdata2',
}

/**
 * Configuration class
 */
export class Configuration {
  /**
   * Project folder URI path.
   */
  private projectFolder: vscode.Uri | undefined;

  /**
   * RGSS Version.
   */
  private rgssVersion: string | undefined;

  /**
   * Constructor.
   */
  constructor() {
    this.projectFolder = undefined;
    this.rgssVersion = undefined;
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
  configGameExceptionAutoProcess(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.gameExceptionAutoProcess');
  }

  /**
   * Gets the extension game exception shows in the editor window flag.
   * @returns Show in the editor flag.
   */
  configGameExceptionShowInEditor(): boolean | undefined {
    return this._getVSCodeConfig<boolean>('gameplay.gameExceptionShowInEditor');
  }

  /**
   * Checks if a valid RPG Maker project folder is currently opened or not.
   *
   * Being 'valid' means:
   *  - A valid RPG Maker project folder is opened.
   *  - RGSS Version is detected (valid scripts bundle file).
   * @returns Whether it is valid or not
   */
  isValid(): boolean {
    return !!this.rgssVersion && !!this.projectFolder;
  }

  /**
   * Asynchronously sets the extension working folder to the given one.
   *
   * If the given folder is the same as the currently opened folder the promise is auto. resolved.
   *
   * If the RGSS Version cannot be determined in the new folder the promise is rejected.
   * @param projectFolder Project folder path
   * @returns A promise
   */
  async setProjectFolder(
    projectFolder: vscode.Uri
  ): Promise<ConfigChangeFolder> {
    // Avoids opening the same folder twice if it is valid already
    if (this.isValid() && projectFolder === this.projectFolder) {
      return {
        oldProjectFolder: this.getInfo(),
        curProjectFolder: this.getInfo()!,
      };
    }
    // Tries to open the new folder.
    let oldProjectFolder = this.getInfo();
    // Updates new folder.
    this.projectFolder = projectFolder;
    this.rgssVersion = this._determineRGSSVersion(projectFolder);
    // Checks if RGSS version detection was successful
    if (this.rgssVersion === undefined) {
      // Reject promise if RGSS could not be found
      throw new Error(
        `Cannot determine RGSS version in folder '${this.projectFolder.fsPath}', 
        Scripts bundle file is missing, fix the problem and try opening the folder again`
      );
    }
    return {
      oldProjectFolder: oldProjectFolder,
      curProjectFolder: this.getInfo()!,
    };
  }

  /**
   * Checks if ``folder`` is a valid RPG Maker project folder for this extension.
   * @param folder Folder Uri path
   * @returns Whether it is a valid RPG Maker project folder or not.
   */
  checkFolderValidness(folder: vscode.Uri): boolean {
    let rgss1 = pathing.join(folder, RGSSBundleScriptsPath.RGSS1);
    let rgss2 = pathing.join(folder, RGSSBundleScriptsPath.RGSS2);
    let rgss3 = pathing.join(folder, RGSSBundleScriptsPath.RGSS3);
    for (let data of [rgss1, rgss2, rgss3]) {
      if (fs.existsSync(data)) {
        return true;
      }
    }
    return false;
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
        projectFolderPath: this.getProjectFolderPath()!,
        projectFolderName: this.getProjectFolderName()!,
        rgssVersion: this.getRGSSVersion()!,
        bundleFilePath: this.getBundleScriptsPath()!,
        scriptsFolderPath: this.getScriptsFolderPath()!,
        backUpsFolderPath: this.getBackUpsFolderPath()!,
      };
    }
    return undefined;
  }

  /**
   * Gets the absolute path to the opened project folder.
   *
   * The folder is automatically normalized based on the OS.
   *
   * It returns ``undefined`` if the path cannot be determined.
   * @returns Project folder path
   */
  getProjectFolderPath(): string | undefined {
    return this.projectFolder ? pathing.resolve(this.projectFolder) : undefined;
  }

  /**
   * Gets the project's RGSS version detected.
   * @returns RGSS Version
   */
  getRGSSVersion(): string | undefined {
    return this.rgssVersion;
  }

  /**
   * Gets the opened project folder name.
   *
   * It returns ``undefined`` if the name cannot be determined.
   * @returns Project folder name
   */
  getProjectFolderName(): string | undefined {
    return this.projectFolder
      ? pathing.basename(this.projectFolder)
      : undefined;
  }

  /**
   * Gets the absolute path to the back ups folder.
   *
   * It returns ``undefined`` if the path cannot be determined.
   * @returns Back ups folder path
   */
  getBackUpsFolderPath(): string | undefined {
    let backUpsFolder = this.configBackUpsFolder();
    if (this.isValid() && backUpsFolder) {
      return pathing.join(this.projectFolder!, backUpsFolder);
    }
    return undefined;
  }

  /**
   * Gets the absolute path to the extracted scripts folder.
   *
   * It returns ``undefined`` if the path cannot be determined.
   * @returns Scripts folder path
   */
  getScriptsFolderPath(): string | undefined {
    let scriptsFolder = this.configScriptsFolder();
    if (this.isValid() && scriptsFolder) {
      return pathing.join(this.projectFolder!, scriptsFolder);
    }
    return undefined;
  }

  /**
   * Gets the absolute path to the game executable.
   *
   * It returns ``undefined`` if the path cannot be determined.
   * @returns Game executable path
   */
  getGameExePath(): string | undefined {
    let gameRelativePath = this.configExeGamePath();
    if (this.isValid() && gameRelativePath) {
      return pathing.join(this.projectFolder!, gameRelativePath);
    }
    return undefined;
  }

  /**
   * Gets the absolute path to the RPG Maker bundled scripts file.
   *
   * It returns ``undefined`` if the path cannot be determined.
   * @returns Bundled scripts file path
   */
  getBundleScriptsPath(): string | undefined {
    if (this.isValid()) {
      switch (this.rgssVersion) {
        case RGSSVersions.RGSS1: {
          return pathing.join(this.projectFolder!, RGSSBundleScriptsPath.RGSS1);
        }
        case RGSSVersions.RGSS2: {
          return pathing.join(this.projectFolder!, RGSSBundleScriptsPath.RGSS2);
        }
        case RGSSVersions.RGSS3: {
          return pathing.join(this.projectFolder!, RGSSBundleScriptsPath.RGSS3);
        }
      }
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
  getGameExeArguments(): string[] | undefined {
    let args: string[] = [];
    // Auto. arguments detection enabled
    if (this.configExeArgsDetection()) {
      switch (this.rgssVersion) {
        case RGSSVersions.RGSS1: {
          // Test argument
          if (this.configExeTestMode() && !!RGSSTestArguments.RGSS1) {
            args.push(RGSSTestArguments.RGSS1);
          }
          // Console argument
          if (this.configExeConsole() && !!RGSSConsoleArguments.RGSS1) {
            args.push(RGSSConsoleArguments.RGSS1);
          }
          return args;
        }
        case RGSSVersions.RGSS2: {
          // Test argument
          if (this.configExeTestMode() && !!RGSSTestArguments.RGSS2) {
            args.push(RGSSTestArguments.RGSS2);
          }
          // Console argument
          if (this.configExeConsole() && !!RGSSConsoleArguments.RGSS2) {
            args.push(RGSSConsoleArguments.RGSS2);
          }
          return args;
        }
        case RGSSVersions.RGSS3: {
          // Test argument
          if (this.configExeTestMode() && !!RGSSTestArguments.RGSS3) {
            args.push(RGSSTestArguments.RGSS3);
          }
          // Console argument
          if (this.configExeConsole() && !!RGSSConsoleArguments.RGSS3) {
            args.push(RGSSConsoleArguments.RGSS3);
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
   * Joins all given paths to the current project folder path.
   *
   * If the current project folder is invalid, it returns ``undefined``.
   * @param paths List of paths.
   * @returns Joined path.
   */
  joinProject(...paths: string[]): string | undefined {
    if (this.isValid()) {
      return pathing.join(this.projectFolder!, ...paths);
    }
    return undefined;
  }

  /**
   * Gets the configuration value from the VS Code settings.
   *
   * If the key is not found it returns undefined.
   * @param key Configuration key
   * @returns
   */
  private _getVSCodeConfig<T>(key: string): T | undefined {
    return vscode.workspace.getConfiguration('rgssScriptEditor').get<T>(key);
  }

  /**
   * Determines the appropiate RGSS version of the given folder.
   *
   * If the RGSS version cannot be determined it returns undefined.
   * @param projectFolder Project folder Uri path
   * @returns The RGSS version of the given project folder
   */
  private _determineRGSSVersion(projectFolder: vscode.Uri): string | undefined {
    let rgss1 = pathing.join(projectFolder, RGSSBundleScriptsPath.RGSS1);
    let rgss2 = pathing.join(projectFolder, RGSSBundleScriptsPath.RGSS2);
    let rgss3 = pathing.join(projectFolder, RGSSBundleScriptsPath.RGSS3);
    // Checks for RGSS1
    if (fs.existsSync(rgss1)) {
      return RGSSVersions.RGSS1;
    }
    // Checks for RGSS2
    if (fs.existsSync(rgss2)) {
      return RGSSVersions.RGSS2;
    }
    // Checks for RGSS3
    if (fs.existsSync(rgss3)) {
      return RGSSVersions.RGSS3;
    }
    return undefined;
  }
}
