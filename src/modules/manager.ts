import * as vscode from 'vscode';
import * as context from './context/context_controller';
import * as uiElements from './ui/ui_elements';
import * as gameplay from './processes/run_game';
import * as folder from './processes/open_folder';
import * as scripts from './processes/scripts_controller';
import { config as configuration } from './utils/configuration';
import { logger } from './utils/logger';

/**
 * Quickstart extension.
 *
 * It scans the current opened folders to start the extension:
 *  - If only one folder exists it is a RPG Maker project it is opened.
 *  - If more than one folder exists it enables the 'choose folder' ui element on the status bar.
 */
export async function quickStart() {
  let folders = vscode.workspace.workspaceFolders;
  if (folders && configuration.getConfigQuickstart()) {
    let validFolders = [];
    for (let folder of folders) {
      if (configuration.checkFolderValidness(folder.uri)) {
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
      // Enables 'choose project folder' button on the status bar
      uiElements.controller.controlStatusBar({ setProjectFolder: true });
    }
  } else {
    // Quickstart disabled, let folder be selected via command palette
    uiElements.controller.hideAllStatusBars();
  }
}

/**
 * Sets the extension working folder to the given one
 * @param projectFolder Project folder Uri
 */
export async function setProjectFolder(projectFolder: vscode.Uri) {
  logger.logInfo(`Changing project folder to: '${projectFolder.fsPath}'...`);
  configuration
    .setProjectFolder(projectFolder)
    .then((value) => {
      // Deletes log file in the new project folder if it exists and logging is enabled
      if (configuration.getConfigLogFile()) {
        logger.deleteLogFile();
      }
      context.setValidProjectFolder(true);
      logger.logInfo(`RGSS Version detected: '${value.curRgssVersion}'`);
      // Updates status bar
      uiElements.controller.updateProjectFolderStatusBar(
        value.curProjectFolderName!
      );
      uiElements.controller.showAllStatusBars();
      logger.logInfo(
        `Folder '${value.curProjectFolder.fsPath}' opened successfully!`
      );
      // TODO: Add method to scripts to check whether this folder currently has
      // extracted successfully the bundled data.
      // It must check if the current bundled data has ONLY the loader script
    })
    .catch((reason) => {
      logger.logErrorUnknown(reason);
      context.setValidProjectFolder(false);
      // Tries quickstart again
      quickStart();
    });
}

/**
 * Opens the working RPG Maker project folder
 */
export async function openProjectFolder() {
  let folderPath = configuration.getProjectFolderPath();
  if (folderPath) {
    try {
      let folderProcess = await folder.openFolder(folderPath);
    } catch (error) {
      logger.logErrorUnknown(error);
    }
  } else {
    logger.logError(
      `Cannot open project folder, the project folder is: '${folderPath}'`
    );
  }
}

/**
 * Extracts all scripts from the bundled file into the script folder
 */
export async function extractScripts() {
  logger.logInfo('Extracting scripts from the bundled file...');
  let scriptsFolderRelPath = configuration.getConfigScriptsFolderRelativePath();
  let scriptsFolderPath = configuration.getScriptsFolderPath();
  let bundleFilePath = configuration.getBundleScriptsPath();
  let backupsFolderPath = configuration.getBackUpsFolderPath();
  if (
    bundleFilePath &&
    scriptsFolderPath &&
    scriptsFolderRelPath &&
    backupsFolderPath
  ) {
    logger.logInfo(`RPG Maker bundle file path is: '${bundleFilePath}'`);
    logger.logInfo(
      `Path to the extracted scripts folder is: '${scriptsFolderPath}'`
    );
    try {
      // Extracts all scripts
      await scripts.extractScripts(bundleFilePath, scriptsFolderPath);
      // Overwrites the bundle file with the loader
      await scripts.createScriptLoader(
        bundleFilePath,
        backupsFolderPath,
        scriptsFolderRelPath
      );
      // Creates a load order
      await scripts.createLoadOrder(scriptsFolderPath);
      context.setExtractedScripts(true);
    } catch (error: unknown) {
      logger.logErrorUnknown(error);
      context.setExtractedScripts(false);
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
  let scriptsFolder = configuration.getConfigScriptsFolderRelativePath();
  let bundleFilePath = configuration.getBundleScriptsPath();
  let backupsFolderPath = configuration.getBackUpsFolderPath();
  if (bundleFilePath && scriptsFolder && backupsFolderPath) {
    logger.logInfo(`RPG Maker bundle file path is: '${bundleFilePath}'`);
    await scripts.createScriptLoader(
      bundleFilePath,
      backupsFolderPath,
      scriptsFolder
    );
  } else {
    logger.logError(
      `Cannot create the script loader bundled file because the bundled scripts 
      file path: '${bundleFilePath}' is not valid!`
    );
  }
}

/**
 * Runs the game executable if the there is an active project folder set
 */
export async function runGame() {
  logger.logInfo('Trying to run the game executable...');
  // Local variables
  let gameWorkingDir = configuration.getProjectFolderPath();
  let gameExecutablePath = configuration.getGameExePath();
  let gameExecutableArgs = configuration.determineGameExeArguments();
  try {
    if (gameWorkingDir && gameExecutablePath) {
      logger.logInfo(`Process working directory is: '${gameWorkingDir}'`);
      logger.logInfo(`Game executable path is: '${gameExecutablePath}'`);
      logger.logInfo(`Using arguments: '${gameExecutableArgs.toString()}'`);
      // Launch process
      let gameProcess = await gameplay.runExecutable(gameExecutablePath, {
        cwd: gameWorkingDir,
        args: gameExecutableArgs,
      });
      // Detaches from the executable
      gameProcess.unref();
    } else {
      logger.logError(
        `The path to the game executable: '${gameExecutablePath}' is invalid!`
      );
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}
