import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as uiElements from './ui/ExtensionUIElements';
import * as configuration from './utils/Configuration';
import * as scriptsUtils from './utils/ScriptFolderUtils';
import { logger } from './utils/Logger';
import { isWineInstalled } from './utils/CheckWine';

/**
 * Quickstart extension
 */
export async function quickStart() {
  let folders = vscode.workspace.workspaceFolders;
  if (folders && configuration.config.getConfigQuickstart()) {
    let validFolders = [];
    for (let folder of folders) {
      if (configuration.config.checkFolderValidness(folder.uri)) {
        validFolders.push(folder);
      }
    }
    // Opens the folder if there is only one valid
    if (validFolders.length === 1) {
      let folder = validFolders[0];
      vscode.window.showInformationMessage(
        `Detected '${folder.name}' as a RPG Maker project!`
      );
      await setProjectFolder(folder.uri);
    } else {
      uiElements.controller.controlStatusBar({ setProjectFolder: true });
    }
  } else {
    uiElements.controller.hideAllStatusBars();
  }
}

/**
 * Sets the extension working folder to the given one
 * @param projectFolder Project folder Uri
 */
export async function setProjectFolder(projectFolder: vscode.Uri) {
  logger.logInfo(`Changing project folder to: '${projectFolder.fsPath}'...`);
  configuration.config.setProjectFolder(projectFolder).then(
    (value) => {
      // Deletes log file in the new project folder if it exists and logging is enabled
      if (configuration.config.getConfigLogFile()) {
        logger.deleteLogFile();
      }
      logger.logInfo(
        `Folder '${value.curProjectFolder?.fsPath}' opened successfully!`
      );
      // Updates VSCode context when clause
      vscode.commands.executeCommand(
        'setContext',
        'rgss-script-editor.validWorkingFolder',
        true
      );
      logger.logInfo(`RGSS Version detected: '${value.curRgssVersion}'`);
      // Updates status bar
      uiElements.controller.updateProjectFolderStatusBar(
        value.curProjectFolderName!
      );
      uiElements.controller.showAllStatusBars();
    },
    (reason) => {
      logger.logError(reason);
      // Updates VSCode context when clause
      vscode.commands.executeCommand(
        'setContext',
        'rgss-script-editor.validWorkingFolder',
        false
      );
      // Tries quickstart again
      quickStart();
    }
  );
}

/**
 * Tries to open the working RPG Maker project folder
 */
export async function openProjectFolder() {
  logger.logInfo(`Opening the working project folder...`);
  configuration.config.openProjectFolder().then(
    (value) => {
      if (value) {
        logger.logInfo(`Project folder opened successfully!`);
      }
    },
    (reason) => {
      logger.logError(`Failed to open the project folder: ${reason}`);
    }
  );
}

/**
 * Extracts all scripts from the bundled file into the script folder
 */
export async function extractScripts() {
  logger.logInfo('Extracting scripts from the bundled file...');
  let scriptsFolderPath = configuration.config.determineScriptsFolderPath();
  let bundleFilePath = configuration.config.determineBundleScriptsPath();
  if (bundleFilePath && scriptsFolderPath) {
    logger.logInfo(`RPG Maker bundle file path is: '${bundleFilePath}'`);
    logger.logInfo(
      `Path to the extracted scripts folder is: '${scriptsFolderPath}'`
    );
    try {
      // Creates a backup file
      await scriptsUtils.createBackUp(bundleFilePath);
      // Extracts all scripts
      await scriptsUtils.extractScripts(bundleFilePath, scriptsFolderPath);
      // Overwrites the bundle file with the loader
      await scriptsUtils.createScriptLoader(bundleFilePath);
      // Creates a load order
      await scriptsUtils.createLoadOrder(scriptsFolderPath);
      vscode.commands.executeCommand(
        'setContext',
        'rgss-script-editor.extractedScripts',
        true
      );
    } catch (error: unknown) {
      if (typeof error === 'string') {
        logger.logError(error.toUpperCase());
      } else if (error instanceof Error) {
        logger.logError(error.message);
      }
      vscode.commands.executeCommand(
        'setContext',
        'rgss-script-editor.extractedScripts',
        false
      );
    }
  } else {
    logger.logError(
      `Cannot extract scripts because either the scripts folder: '${scriptsFolderPath}' 
      or the bundled scripts file path: '${bundleFilePath}' are not valid!`
    );
  }
}

/**
 * Asynchronously creates the bundle script loader file for RPG Maker engine
 */
export async function createScriptLoader() {
  logger.logInfo('Creating script loader...');
  let bundleFilePath = configuration.config.determineBundleScriptsPath();
  if (bundleFilePath) {
    logger.logInfo(`RPG Maker bundle file path is: '${bundleFilePath}'`);
    await scriptsUtils.createBackUp(bundleFilePath);
    // TODO: En lugar de llamar explicitamente a 'createBackUp' lo que deberia hacer es
    // hacer que se llama automaticamente dentro del unico metodo que sobreescribe el fichero rvdata
    // que es: 'createScriptLoader'
    await scriptsUtils.createScriptLoader(bundleFilePath);
  } else {
    logger.logError(
      `Cannot create the script loader bundled file because the bundled scripts 
      file path: '${bundleFilePath}' is not valid!`
    );
  }
}

/**
 * Runs the game if the project folder is valid
 */
export async function runGame() {
  logger.logInfo('Trying to run the game...');
  let executableName = '';
  let executableArgs = [];
  let gameWorkingDir = configuration.config.determineProjectFolder();
  let gameExecutablePath = configuration.config.determineGameExePath();
  let gameExecutableArgs = configuration.config.determineGameExeArguments();
  // Check for executable path validness
  if (gameExecutablePath === undefined) {
    logger.logError(
      `The path to the game exe: '${gameExecutablePath}' is invalid!`
    );
    return;
  }
  // Run logic OS-based
  switch (process.platform) {
    case 'win32': {
      // Treat game execution as normal
      executableName = gameExecutablePath;
      executableArgs = gameExecutableArgs;
      break;
    }
    case 'darwin':
    case 'linux': {
      // Uses wine to launch game executable
      if (isWineInstalled()) {
        executableName = 'wine';
        executableArgs = [gameExecutablePath, ...gameExecutableArgs];
      } else {
        logger.logError(`Cannot launch the game`);
        logger.logInfo(
          `You must install wine on linux-based system to run the game executable`
        );
        return;
      }
      break;
    }
    default: {
      logger.logError(
        `The platform: '${process.platform}' is not supported by this extension`
      );
      return;
    }
  }
  // Launch the game
  logger.logInfo(`Running game with: '${executableName}'...`);
  logger.logInfo(`Using arguments: '${executableArgs.toString()}'`);
  let gameProcess = cp.execFile(executableName, executableArgs, {
    encoding: 'utf8',
    cwd: gameWorkingDir,
  });
  gameProcess.unref();
}
