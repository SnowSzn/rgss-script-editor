import * as zlib from 'zlib';
import * as marshal from '@hyrious/marshal';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as Configuration from './utils/configuration';
import { logger } from './utils/logger';

// // TODO: Check usage at: https://www.npmjs.com/package/marshal
// const Marshal = require('marshal');

/**
 * Sets the extension working folder to the given one
 * @param projectFolder Project folder Uri
 */
export function setProjectFolder(projectFolder: vscode.Uri): void {
  try {
    logger.logInfo(`Changing project folder to: '${projectFolder.fsPath}'...`);
    // Updates project folder
    Configuration.config.setProjectFolder(projectFolder);
    // Resets configuration file
    Configuration.config.resetConfig();
    // Logging
    logger.logInfo(
      `Configuration project folder set to: '${Configuration.config.getProjectFolder()}'`
    );
    logger.logInfo(
      `Configuration RGSS version is: '${Configuration.config.getRGSSVersion()}'`
    );
    logger.logInfo(
      `Configuration RGSS script file path is: '${Configuration.config.getRGSSScriptPath()}'`
    );
  } catch (error: unknown) {
    if (typeof error === 'string') {
      logger.logError(error.toUpperCase());
    } else if (error instanceof Error) {
      logger.logError(error.message);
    }
  }
}

/**
 * Extracts all scripts from the bundled file into the script folder
 */
export async function extractScripts(): Promise<void> {
  logger.logInfo('Extracting scripts from the bundled file...');
  let scriptsFolderPath = Configuration.config.determineScriptsFolderPath();
  let bundleFilePath = Configuration.config.determineRGSSBundledScriptsPath();
  let rgssVersion = Configuration.config.getRGSSVersion();
  if (bundleFilePath && scriptsFolderPath) {
    logger.logInfo('Valid scripts folder and bundle file path found!');
    logger.logInfo(`RPG Maker bundle file path is: '${bundleFilePath}'`);
    logger.logInfo(
      `Path to the extracted scripts folder is: '${scriptsFolderPath}'`
    );
    try {
      // TODO: How to extract script files?
      // logger.logInfo('Reading bundled file...');
      // Configuration.config.ensureScriptsFolderExists();
      // // let binary = fs.readFileSync(bundleFilePath);
      // //let binary = await vscode.workspace.fs.readFile(Uri.new());
      // switch (rgssVersion) {
      //   case Configuration.RGSSVersions.RGSS1: {
      //   }
      //   case Configuration.RGSSVersions.RGSS2: {
      //   }
      //   case Configuration.RGSSVersions.RGSS3: {
      //     //let binaryArr = marshal.load(binary) as Array<Array<number | string>>;
      //     let binaryArr = marshal.load(binary) as Array<Array<ArrayBuffer>>;
      //     for (let index = 0; index < binaryArr.length; index++) {
      //       let script = binaryArr[index];
      //       let code = zlib.inflateRawSync(binaryArr[index][2], {
      //         windowBits: zlib.constants.Z_MAX_WINDOWBITS,
      //       });
      //       logger.logInfo(`stop`);
      //     }
      //   }
      // }
    } catch (error: unknown) {
      if (typeof error === 'string') {
        logger.logError(error.toUpperCase());
      } else if (error instanceof Error) {
        logger.logError(error.message);
      }
    }
  } else {
    logger.logError(
      `Cannot extract scripts because either the scripts folder: '${scriptsFolderPath}' 
      or the bundled scripts file path: '${bundleFilePath}' are not valid!`
    );
  }
}

/**
 * Runs the game if the project folder is valid
 */
export function runGame(): void {
  try {
    logger.logInfo('Run the game command called!');
    let gamePath = Configuration.config.determineGamePath();
    // Checks if the path to the game executable is valid
    if (gamePath) {
      logger.logInfo(`Running game executable: '${gamePath}'...`);
      let args = [];
      // Formats arguments
      switch (Configuration.config.getRGSSVersion()) {
        case Configuration.RGSSVersions.RGSS1:
          logger.logInfo('Running the game on RGSS1');
          // Adds test argument if appropiate
          if (Configuration.config.getEditorTestMode()) {
            args.push(Configuration.RGSSTestArguments.RGSS1);
          }
          // Adds console argument if appropiate
          if (Configuration.config.getNativeConsole()) {
            args.push(Configuration.RGSSConsoleArguments.RGSS1);
          }
          break;
        case Configuration.RGSSVersions.RGSS2:
          logger.logInfo('Running the game on RGSS2');
          // Adds test argument if appropiate
          if (Configuration.config.getEditorTestMode()) {
            args.push(Configuration.RGSSTestArguments.RGSS2);
          }
          // Adds console argument if appropiate
          if (Configuration.config.getNativeConsole()) {
            args.push(Configuration.RGSSConsoleArguments.RGSS2);
          }
          break;
        case Configuration.RGSSVersions.RGSS3:
          logger.logInfo('Running the game on RGSS3');
          // Adds test argument if appropiate
          if (Configuration.config.getEditorTestMode()) {
            args.push(Configuration.RGSSTestArguments.RGSS3);
          }
          // Adds console argument if appropiate
          if (Configuration.config.getNativeConsole()) {
            args.push(Configuration.RGSSConsoleArguments.RGSS3);
          }
          break;
        default:
          logger.logError(
            `Cannot set arguments because Config RGSS version: '${Configuration.config.getRGSSVersion()}' is unknown!`
          );
          break;
      }
      // Launchs game executable
      let process = cp.execFile(gamePath, args, {
        encoding: 'utf-8',
      });
      process.unref();
    }
  } catch (error: unknown) {
    if (typeof error === 'string') {
      logger.logError(error.toUpperCase());
    } else if (error instanceof Error) {
      logger.logError(error.message);
    }
  }
}
