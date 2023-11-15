import * as fs from 'fs';
import * as vscode from 'vscode';
import * as pathResolve from './path_resolve';

/**
 * Return type when changing project folder
 */
export type ConfigChangeFolder = {
  oldProjectFolder?: vscode.Uri | undefined;
  oldProjectFolderName?: string | undefined;
  oldRgssVersion?: string | undefined;
  curProjectFolder: vscode.Uri;
  curProjectFolderName: string;
  curRgssVersion: string;
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
class Configuration {
  /**
   * Project folder path
   */
  private projectFolder: vscode.Uri | undefined;
  /**
   * RGSS Version
   */
  private rgssVersion: string | undefined;

  /**
   * Constructor
   */
  constructor() {
    this.projectFolder = undefined;
    this.rgssVersion = undefined;
  }

  /**
   * Gets the extension quickstart status flag
   * @returns Quickstart status flag
   */
  getConfigQuickstart(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('extension.quickStart');
  }

  /**
   * Gets log to console flag status
   * @returns Log to console flag
   */
  getConfigLogConsole(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('debug.logToConsole');
  }

  /**
   * Gets log to file flag status
   * @returns Log to file flag
   */
  getConfigLogFile(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('debug.logToFile');
  }

  /**
   * Gets the project relative path to the back ups folder
   * @returns Back ups folder path
   */
  getConfigBackUpsFolderRelativePath(): string | undefined {
    return this.getVSCodeConfig<string>('external.backUpsFolder');
  }

  /**
   * Gets the project relative path to the extracted scripts folder
   * @returns Scripts folder path
   */
  getConfigScriptsFolderRelativePath(): string | undefined {
    return this.getVSCodeConfig<string>('external.scriptsFolder');
  }

  /**
   * Gets the game executable relative path
   * @returns Game executable relative path
   */
  getConfigGameExeRelativePath(): string | undefined {
    return this.getVSCodeConfig<string>('gameplay.gameExecutablePath');
  }

  /**
   * Gets use Wine flag status to run the executable in Linux.
   * @returns Whether to use Wine or not
   */
  getConfigUseWine(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('gameplay.useWine');
  }

  /**
   * Gets the game executable automatic arguments detection mode.
   *
   * When this mode is enabled custom arguments are ignored.
   * @returns Auto. Argument detection
   */
  getConfigArgumentDetection(): boolean | undefined {
    return this.getVSCodeConfig<boolean>(
      'gameplay.automaticArgumentsDetection'
    );
  }

  /**
   * Gets whether the test mode is enabled or not
   * @returns Test mode enable status
   */
  getConfigEditorTestMode(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('gameplay.editorTestMode');
  }

  /**
   * Gets whether the RPG Maker native console is enabled or not
   * @returns Native console enable status
   */
  getConfigNativeConsole(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('gameplay.nativeConsole');
  }

  /**
   * Gets custom arguments to launch the game executable
   *
   * This must be used only when auto. arguments detection mode is turned off
   * @returns Custom arguments string
   */
  getConfigCustomArguments(): string | undefined {
    return this.getVSCodeConfig<string>('gameplay.customArguments');
  }

  /**
   * Asynchronously sets the extension working folder to the given one.
   *
   * If the given folder is the same as the currently opened folder the promise is auto. resolved.
   *
   * If the RGSS Version cannot be determined in the new folder the promise is rejected.
   * @param folder Project folder path
   */
  async setProjectFolder(
    projectFolder: vscode.Uri
  ): Promise<ConfigChangeFolder> {
    // Avoids opening the same folder twice if it is valid already
    if (this.valid() && projectFolder === this.projectFolder) {
      // If config is valid, there is no way attributes are undefined
      return {
        oldProjectFolder: this.projectFolder,
        oldProjectFolderName: pathResolve.basename(this.projectFolder),
        oldRgssVersion: this.rgssVersion,
        curProjectFolder: this.projectFolder,
        curProjectFolderName: pathResolve.basename(this.projectFolder),
        curRgssVersion: this.rgssVersion!,
      };
    } else {
      let oldProjectFolder = this.projectFolder;
      let oldRgssVersion = this.rgssVersion;
      this.projectFolder = projectFolder;
      this.rgssVersion = this.findRGSSVersion(projectFolder);
      if (this.rgssVersion === undefined) {
        // Reject promise if RGSS could not be found
        throw new Error(
          `Cannot determine RGSS version in folder '${this.projectFolder.fsPath}', 
            Scripts bundle file is missing, fix the problem and try opening the folder again`
        );
      } else {
        return {
          oldProjectFolder: oldProjectFolder,
          oldProjectFolderName: oldProjectFolder
            ? pathResolve.basename(oldProjectFolder)
            : oldProjectFolder,
          oldRgssVersion: oldRgssVersion,
          curProjectFolder: this.projectFolder,
          curProjectFolderName: pathResolve.basename(this.projectFolder),
          curRgssVersion: this.rgssVersion,
        };
      }
    }
  }

  /**
   * Checks if a valid RPG Maker project folder is currently opened or not.
   *
   * Being 'valid' means:
   *  - A valid RPG Maker project folder is opened.
   *  - RGSS Version is valid and detected.
   *  - Scripts bundle path is valid.
   * @returns Whether it is valid or not
   */
  valid(): boolean {
    return !!this.rgssVersion && !!this.projectFolder;
  }

  /**
   * Checks if the given folder is a valid RPG Maker project folder for this extension
   * @param folder Folder Uri path
   * @returns Whether it is a valid RPG Maker project folder or not
   */
  checkFolderValidness(folder: vscode.Uri): boolean {
    let rgss1 = pathResolve.join(folder, RGSSBundleScriptsPath.RGSS1);
    let rgss2 = pathResolve.join(folder, RGSSBundleScriptsPath.RGSS2);
    let rgss3 = pathResolve.join(folder, RGSSBundleScriptsPath.RGSS3);
    for (let data of [rgss1, rgss2, rgss3]) {
      if (fs.existsSync(data)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the project folder full path based on the system platform (OS).
   *
   * It returns undefined if the path cannot be resolved.
   * @returns Resolved project folder
   */
  getProjectFolderPath(): string | undefined {
    if (this.valid()) {
      return pathResolve.resolve(this.projectFolder!);
    }
    return undefined;
  }

  /**
   * Gets the back ups folder full path based on the system platform (OS).
   *
   * It returns undefined if it is impossible to get the path.
   * @returns Back ups folder path
   */
  getBackUpsFolderPath(): string | undefined {
    let backUpsFolder = this.getConfigBackUpsFolderRelativePath();
    if (this.valid() && backUpsFolder) {
      return pathResolve.join(this.projectFolder!, backUpsFolder);
    }
    return undefined;
  }

  /**
   * Gets the extracted scripts folder full path based on the system platform (OS).
   *
   * It returns undefined if it is impossible to get the path.
   * @returns Scripts folder path
   */
  getScriptsFolderPath(): string | undefined {
    let scriptsFolder = this.getConfigScriptsFolderRelativePath();
    if (this.valid() && scriptsFolder) {
      return pathResolve.join(this.projectFolder!, scriptsFolder);
    }
    return undefined;
  }

  /**
   * Gets the game executable full path for the active project folder based on the system platform (OS).
   *
   * It returns undefined if it is impossible to get the path.
   * @returns Game executable path
   */
  getGameExePath(): string | undefined {
    let gameRelativePath = this.getConfigGameExeRelativePath();
    if (this.valid() && gameRelativePath) {
      return pathResolve.join(this.projectFolder!, gameRelativePath);
    }
    return undefined;
  }

  /**
   * Gets the full path to the bundled scripts file.
   *
   * It returns undefined if it is impossible to get the path.
   * @returns Bundled scripts file path
   */
  getBundleScriptsPath(): string | undefined {
    if (this.valid()) {
      switch (this.rgssVersion) {
        case RGSSVersions.RGSS1: {
          return pathResolve.join(
            this.projectFolder!,
            RGSSBundleScriptsPath.RGSS1
          );
        }
        case RGSSVersions.RGSS2: {
          return pathResolve.join(
            this.projectFolder!,
            RGSSBundleScriptsPath.RGSS2
          );
        }
        case RGSSVersions.RGSS3: {
          return pathResolve.join(
            this.projectFolder!,
            RGSSBundleScriptsPath.RGSS3
          );
        }
      }
    }
    return undefined;
  }

  /**
   * Determines the appropiate game executable arguments.
   *
   * If automatic argument detection is enabled it will ignore custom arguments.
   *
   * If the arguments cannot be determined it returns undefined.
   * @returns list of game arguments
   */
  determineGameExeArguments(): string[] | undefined {
    let args: string[] = [];
    // Auto. arguments detection enabled
    if (this.getConfigArgumentDetection()) {
      switch (this.rgssVersion) {
        case RGSSVersions.RGSS1: {
          // Test argument
          if (this.getConfigEditorTestMode() && !!RGSSTestArguments.RGSS1) {
            args.push(RGSSTestArguments.RGSS1);
          }
          // Console argument
          if (this.getConfigNativeConsole() && !!RGSSConsoleArguments.RGSS1) {
            args.push(RGSSConsoleArguments.RGSS1);
          }
          return args;
        }
        case RGSSVersions.RGSS2: {
          // Test argument
          if (this.getConfigEditorTestMode() && !!RGSSTestArguments.RGSS2) {
            args.push(RGSSTestArguments.RGSS2);
          }
          // Console argument
          if (this.getConfigNativeConsole() && !!RGSSConsoleArguments.RGSS2) {
            args.push(RGSSConsoleArguments.RGSS2);
          }
          return args;
        }
        case RGSSVersions.RGSS3: {
          // Test argument
          if (this.getConfigEditorTestMode() && !!RGSSTestArguments.RGSS3) {
            args.push(RGSSTestArguments.RGSS3);
          }
          // Console argument
          if (this.getConfigNativeConsole() && !!RGSSConsoleArguments.RGSS3) {
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
      this.getConfigCustomArguments()
        ?.split(' ')
        .forEach((arg) => {
          args.push(arg);
        });
      return args;
    }
  }

  /**
   * Gets the configuration value from the VS Code settings.
   *
   * If the key is not found it returns undefined.
   * @param key Configuration key
   * @returns
   */
  private getVSCodeConfig<T>(key: string): T | undefined {
    return vscode.workspace.getConfiguration('rgssScriptEditor').get<T>(key);
  }

  /**
   * Finds the appropiate RGSS version of the given folder.
   *
   * If the RGSS version cannot be determined it returns undefined.
   * @param projectFolder Project folder Uri path
   * @returns The RGSS version of the given project folder
   */
  private findRGSSVersion(projectFolder: vscode.Uri): string | undefined {
    let rgss1 = pathResolve.join(projectFolder, RGSSBundleScriptsPath.RGSS1);
    let rgss2 = pathResolve.join(projectFolder, RGSSBundleScriptsPath.RGSS2);
    let rgss3 = pathResolve.join(projectFolder, RGSSBundleScriptsPath.RGSS3);
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

/**
 * Extension configuration instance
 */
export let config = new Configuration();
