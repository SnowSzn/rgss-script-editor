import { exec } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as pathResolve from './PathResolve';

/**
 * Return type when changing project folder
 */
export type ConfigChangeFolder = {
  oldProjectFolder?: vscode.Uri | undefined;
  oldRgssVersion?: string | undefined;
  curProjectFolder: vscode.Uri;
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
export const enum RGSSDefaultTestArguments {
  RGSS1 = 'debug',
  RGSS2 = 'test',
  RGSS3 = 'test',
}

/**
 * Enum of valid test arguments based on the RGSS version
 */
export const enum RGSSDefaultConsoleArguments {
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
   * Gets the project folder Uri path
   * @returns Project folder Uri path
   */
  getProjectFolder(): vscode.Uri | undefined {
    return this.projectFolder;
  }

  /**
   * Gets the RGSS version
   * @returns RGSS version
   */
  getRGSSVersion(): string | undefined {
    return this.rgssVersion;
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
    return new Promise<ConfigChangeFolder>((resolve, reject) => {
      // Avoids opening the same folder twice if it is valid already
      if (this.valid() && projectFolder === this.projectFolder) {
        // If config is valid, there is no way attributes are undefined
        resolve({
          oldProjectFolder: this.projectFolder!,
          oldRgssVersion: this.rgssVersion!,
          curProjectFolder: this.projectFolder!,
          curRgssVersion: this.rgssVersion!,
        });
      } else {
        // Updates current project folder
        let oldProjectFolder = this.projectFolder;
        let oldRgssVersion = this.rgssVersion;
        this.projectFolder = projectFolder;
        // Updates configuration for the new project folder
        this.rgssVersion = this.determineRGSSVersion(projectFolder);
        if (this.rgssVersion === undefined) {
          // Reject promise if RGSS could not be found
          reject(
            `Cannot determine RGSS version in folder '${this.projectFolder.fsPath}', 
            Scripts bundle file is missing, fix the problem and try opening the folder again`
          );
        } else {
          resolve({
            oldProjectFolder: oldProjectFolder,
            oldRgssVersion: oldRgssVersion,
            curProjectFolder: this.projectFolder,
            curRgssVersion: this.rgssVersion,
          });
        }
      }
    });
  }

  /**
   * Asynchronously opens the RPG Maker project's folder.
   *
   * If the platform is unsupported or the project folder is invalid it will reject the promise
   * @returns A promise
   */
  async openProjectFolder(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.valid() && this.projectFolder) {
        // Command changes by platform
        let folderArgument = pathResolve.resolveUri(this.projectFolder);
        switch (process.platform) {
          case 'win32': {
            exec(`explorer ${folderArgument}`);
            resolve(true);
          }
          case 'linux': {
            exec(`xdg-open ${folderArgument}`);
            resolve(true);
          }
          case 'darwin': {
            exec(`open ${folderArgument}`);
            resolve(true);
          }
          default: {
            reject(`Unsupported platflorm`);
          }
        }
      } else {
        reject(`Invalid project folder!`);
      }
    });
  }

  /**
   * Checks if a valid RPG Maker project folder is currently opened or not
   * @returns Whether it is valid or not
   */
  valid(): boolean {
    return this.rgssVersion !== undefined && this.projectFolder !== undefined;
  }

  /**
   * Determines the project folder path based on the system platform
   * @returns Resolved project folder
   */
  determineProjectFolder(): string | undefined {
    if (this.valid() && this.projectFolder) {
      return pathResolve.resolveUri(this.projectFolder);
    }
    return undefined;
  }

  /**
   * Determines the back ups folder full path
   *
   * It returns undefined if it is impossible to determine the path
   * @returns Back ups folder path
   */
  determineBackUpsFolderPath(): string | undefined {
    let backUpsFolder = this.getConfigBackUpsFolderRelativePath();
    if (this.valid() && backUpsFolder) {
      return pathResolve.joinUri(this.projectFolder!, backUpsFolder);
    }
    return undefined;
  }

  /**
   * Determines the extracted scripts folder full path
   *
   * It returns undefined if it is impossible to determine the path
   * @returns Scripts folder path
   */
  determineScriptsFolderPath(): string | undefined {
    let scriptsFolder = this.getConfigScriptsFolderRelativePath();
    if (this.valid() && scriptsFolder) {
      return pathResolve.joinUri(this.projectFolder!, scriptsFolder);
    }
    return undefined;
  }

  /**
   * Determines the game executable path for the active project folder
   *
   * If the path to the executable does not exists it returns undefined
   * @returns Game executable path
   */
  determineGameExePath(): string | undefined {
    let gameRelativePath = this.getConfigGameExeRelativePath();
    if (this.valid() && gameRelativePath) {
      return pathResolve.joinUri(this.projectFolder!, gameRelativePath);
    }
    return undefined;
  }

  /**
   * Determines the game executable arguments.
   *
   * If automatic argument detection is enabled it will ignore custom arguments.
   *
   * If the current project folder is not valid it returns an empty array
   * @returns Game executable arguments
   */
  determineGameExeArguments(): string[] {
    let gameArgs: string[] = [];
    if (!this.valid()) {
      return gameArgs;
    }
    // Valid project folder
    if (this.getConfigArgumentDetection()) {
      switch (this.rgssVersion) {
        case RGSSVersions.RGSS1: {
          // Adds console arguments
          if (this.getConfigNativeConsole()) {
            if (RGSSDefaultConsoleArguments.RGSS1.length > 0) {
              gameArgs.push(RGSSDefaultConsoleArguments.RGSS1);
            }
          }
          // Adds test arguments
          if (this.getConfigEditorTestMode()) {
            if (RGSSDefaultTestArguments.RGSS1.length > 0) {
              gameArgs.push(RGSSDefaultTestArguments.RGSS1);
            }
          }
          break;
        }
        case RGSSVersions.RGSS2: {
          // Adds console arguments
          if (this.getConfigNativeConsole()) {
            if (RGSSDefaultConsoleArguments.RGSS2.length > 0) {
              gameArgs.push(RGSSDefaultConsoleArguments.RGSS2);
            }
          }
          // Adds test arguments
          if (this.getConfigEditorTestMode()) {
            if (RGSSDefaultTestArguments.RGSS2.length > 0) {
              gameArgs.push(RGSSDefaultTestArguments.RGSS2);
            }
          }
          break;
        }
        case RGSSVersions.RGSS3: {
          // Adds console arguments
          if (this.getConfigNativeConsole()) {
            if (RGSSDefaultConsoleArguments.RGSS3.length > 0) {
              gameArgs.push(RGSSDefaultConsoleArguments.RGSS3);
            }
          }
          // Adds test arguments
          if (this.getConfigEditorTestMode()) {
            if (RGSSDefaultTestArguments.RGSS3.length > 0) {
              gameArgs.push(RGSSDefaultTestArguments.RGSS3);
            }
          }
          break;
        }
      }
    } else {
      let customArgs = this.getConfigCustomArguments();
      if (customArgs) {
        customArgs.split(' ').forEach((value) => {
          gameArgs!.push(value);
        });
      }
    }
    return gameArgs;
  }

  /**
   * Determines the absolute path to the bundled scripts
   *
   * If the path does not exists it returns undefined
   * @returns The absolute path to the bundled scripts file
   */
  determineBundleScriptsPath(): string | undefined {
    if (this.valid()) {
      switch (this.rgssVersion) {
        case RGSSVersions.RGSS1: {
          return pathResolve.joinUri(
            this.projectFolder!,
            RGSSBundleScriptsPath.RGSS1
          );
        }
        case RGSSVersions.RGSS2: {
          return pathResolve.joinUri(
            this.projectFolder!,
            RGSSBundleScriptsPath.RGSS2
          );
        }
        case RGSSVersions.RGSS3: {
          return pathResolve.joinUri(
            this.projectFolder!,
            RGSSBundleScriptsPath.RGSS3
          );
        }
      }
    }
    return undefined;
  }

  /**
   * Gets the configuration value from the VS Code settings
   *
   * If the key is not found it returns undefined
   * @param key Configuration key
   * @returns
   */
  private getVSCodeConfig<T>(key: string): T | undefined {
    return vscode.workspace.getConfiguration('rgssScriptEditor').get<T>(key);
  }

  /**
   * Determines the RGSS version of the given folder.
   *
   * If the RGSS version cannot be determined it returns undefined
   * @param projectFolder Project folder Uri path
   * @returns The RGSS version of the given project folder
   */
  private determineRGSSVersion(projectFolder: vscode.Uri): string | undefined {
    let rgss1 = pathResolve.joinUri(projectFolder, RGSSBundleScriptsPath.RGSS1);
    let rgss2 = pathResolve.joinUri(projectFolder, RGSSBundleScriptsPath.RGSS2);
    let rgss3 = pathResolve.joinUri(projectFolder, RGSSBundleScriptsPath.RGSS3);
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
