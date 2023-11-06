import * as fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import * as exEvents from './extension_events';

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
 * Configuration class
 */
class Configuration {
  /**
   * Project folder path
   */
  private projectFolder: string | undefined;
  /**
   * RGSS Version
   */
  private rgssVersion: string | undefined;
  /**
   * RGSS Scripts file path
   */
  private rgssScriptPath: string | undefined;

  /**
   * Constructor
   */
  constructor() {
    this.rgssVersion = undefined;
    this.projectFolder = undefined;
    this.rgssScriptPath = undefined;
  }

  /**
   * Sets the extension folder to the given one
   *
   * ON_PROJECT_FOLDER_CHANGE event is fired when the new folder is different than the current one
   * @param folder Project folder
   */
  setProjectFolder(folder: vscode.Uri): void {
    if (folder.fsPath !== this.projectFolder) {
      let oldProjectFolder = this.projectFolder;
      // Update project folder
      this.projectFolder = folder.fsPath;
      // Fire new folder event
      exEvents.handler.emit(
        exEvents.ON_PROJECT_FOLDER_CHANGE,
        oldProjectFolder,
        this.projectFolder
      );
    }
  }

  /**
   * Gets the project folder path
   * @returns Project folder path
   */
  getProjectFolder(): string | undefined {
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
   * Gets the full RGSS Scripts bundled file path
   *
   * @returns RGSS Scripts path
   */
  getRGSSScriptPath(): string | undefined {
    return this.rgssScriptPath;
  }

  /**
   * Gets log to console flag status
   * @returns Log to console flag
   */
  getLogToConsole(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('debug.logToConsole');
  }

  /**
   * Gets log to file flag status
   * @returns Log to file flag
   */
  getLogToFile(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('debug.logToFile');
  }

  /**
   * Gets the project relative path to the extracted scripts folder
   * @returns Scripts folder path
   */
  getScriptsFolderRelativePath(): string | undefined {
    return this.getVSCodeConfig<string>('external.scriptsFolder');
  }

  /**
   * Gets the game executable name
   * @returns Game executable name
   */
  getGameName(): string | undefined {
    return this.getVSCodeConfig<string>('gameplay.gameName');
  }

  /**
   * Gets whether the test mode is enabled or not
   * @returns Test mode enable status
   */
  getEditorTestMode(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('gameplay.editorTestMode');
  }

  /**
   * Gets whether the RPG Maker native console is enabled or not
   * @returns Native console enable status
   */
  getNativeConsole(): boolean | undefined {
    return this.getVSCodeConfig<boolean>('gameplay.nativeConsole');
  }

  /**
   * Checks if the current project folder is a valid folder or not
   * @returns Whether the project folder is valid or not
   */
  validProjectFolder(): boolean {
    return this.projectFolder !== undefined;
  }

  /**
   * Resets the configuration object based on the current opened folder
   *
   * It throws an exception if the config fails to reset
   */
  resetConfig(): void {
    // Updates atributes to the appropiate value based on the opened project
    this.determineRGSSVersion();
    // Ensures the folder where all scripts are extracted exists
    this.ensureScriptsFolderExists();
  }

  /**
   * Ensures that the scripts folder exists in the project folder
   */
  ensureScriptsFolderExists(): void {
    let scriptsFolder = this.getScriptsFolderRelativePath();
    if (this.projectFolder && scriptsFolder) {
      let scriptsFolderPath = path.join(this.projectFolder, scriptsFolder);
      if (!fs.existsSync(scriptsFolderPath)) {
        fs.mkdirSync(scriptsFolderPath);
      }
    }
  }

  /**
   * Determines the extracted scripts folder full path checking if the path exists
   *
   * It returns undefined if it is impossible to determine the path
   * @returns Game executable path
   */
  determineScriptsFolderPath(): string | undefined {
    let scriptsFolder = this.getScriptsFolderRelativePath();
    if (this.projectFolder && scriptsFolder) {
      let scriptsFolderPath = path.join(this.projectFolder, scriptsFolder);
      if (fs.existsSync(scriptsFolderPath)) {
        return scriptsFolderPath;
      }
    }
    return undefined;
  }

  /**
   * Determines the game executable path for the active project folder
   *
   * If the path to the executable does not exists it returns undefined
   * @returns Game executable path
   */
  determineGamePath(): string | undefined {
    let gameName = this.getGameName();
    // Checks both project folder and game name is valid
    if (this.projectFolder && gameName) {
      let gamePath = path.join(this.projectFolder, gameName);
      if (fs.existsSync(gamePath)) {
        return gamePath;
      }
    }
    return undefined;
  }

  /**
   * Determines the absolute path to the bundled scripts file based on the RGSS version
   *
   * If the path to the bundled scripts file does not exists it returns undefined
   * @returns The absolute path to the bundled RGSS scripts file
   */
  determineRGSSBundledScriptsPath(): string | undefined {
    if (this.rgssScriptPath) {
      if (fs.existsSync(this.rgssScriptPath)) {
        return this.rgssScriptPath;
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
   * Determines the RGSS version based on the current opened project folder
   *
   * It throws an exception if the RGSS version cannot be determined
   */
  private determineRGSSVersion(): void {
    if (this.projectFolder) {
      let projectFolder = path.join(this.projectFolder, '');
      let rgss1Path = path.join(projectFolder, 'Data/Scripts.rxdata');
      let rgss2Path = path.join(projectFolder, 'Data/Scripts.rvdata');
      let rgss3Path = path.join(projectFolder, 'Data/Scripts.rvdata2');
      // Check for RGSS1
      if (fs.existsSync(rgss1Path)) {
        this.rgssVersion = RGSSVersions.RGSS1;
        this.rgssScriptPath = rgss1Path;
      } else if (fs.existsSync(rgss2Path)) {
        this.rgssVersion = RGSSVersions.RGSS2;
        this.rgssScriptPath = rgss2Path;
      } else if (fs.existsSync(rgss3Path)) {
        this.rgssVersion = RGSSVersions.RGSS3;
        this.rgssScriptPath = rgss3Path;
      } else {
        throw new Error('Cannot determine RGSS version!');
      }
    }
  }
}

export let config = new Configuration();

exEvents.handler.on(
  exEvents.ON_PROJECT_FOLDER_CHANGE,
  (oldFolder, newFolder) => {
    try {
      config.ensureScriptsFolderExists();
    } catch (error) {}
  }
);
