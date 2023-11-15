import * as vscode from 'vscode';
import * as context from './context/context_controller';
import * as uiElements from './ui/ui_elements';
import * as gameplay from './processes/run_game';
import * as workingFolder from './processes/open_folder';
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
    // Check valid folders
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
      vscode.window.showInformationMessage(
        `Several RPG Maker project folders detected!`
      );
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
  try {
    const project = await configuration.setProjectFolder(projectFolder);

    // Deletes log file in the new project folder if logging is enabled
    if (configuration.getConfigLogFile()) {
      logger.deleteLogFile();
    }

    // Updates extension folder context
    logger.logInfo(`'${project.curProjectFolder.fsPath}' opened successfully!`);
    logger.logInfo(`RGSS Version detected: '${project.curRgssVersion}'`);
    context.setValidProjectFolder(true);

    // Updates extension extracted scripts context
    let bundleFile = configuration.getBundleScriptsPath();
    logger.logInfo(`Checking bundle scripts file status: '${bundleFile}'`);
    const projectScripts = await scripts.checkExtractedScripts(bundleFile!);
    if (projectScripts === scripts.SCRIPTS_EXTRACTED) {
      context.setExtractedScripts(true);
      logger.logInfo(
        'Scripts extraction has already been done previously for this project!'
      );
    } else if (projectScripts === scripts.SCRIPTS_NOT_EXTRACTED) {
      context.setExtractedScripts(false);
      logger.logWarning('Scripts were detected inside the bundle scripts file');
      logger.logInfo(
        'If this is the first time opening the project you should now extract script files!'
      );
      logger.logInfo(
        'In case you have previously extracted the scripts, make sure not to add new scripts to the bundle file'
      );
    } else {
      context.setExtractedScripts(false);
      logger.logWarning(
        `The bundle scripts file check reported an unknown code: ${projectScripts}`
      );
    }

    // Process UI elements
    uiElements.controller.updateProjectName(project.curProjectFolderName);
    uiElements.controller.showAllStatusBars();
  } catch (error) {
    logger.logErrorUnknown(error);
    context.setValidProjectFolder(false);
    context.setExtractedScripts(false);
    quickStart();
  }
}

/**
 * Opens the working RPG Maker project folder
 */
export async function openProjectFolder() {
  let folderPath = configuration.getProjectFolderPath();
  if (folderPath) {
    try {
      let folderProcess = await workingFolder.openFolder(folderPath);
    } catch (error) {
      logger.logErrorUnknown(error);
    }
  } else {
    logger.logError(
      `Cannot open project folder, the project folder is invalid: '${folderPath}'`
    );
  }
}

/**
 * Extracts all scripts from the bundled file into the script folder
 */
export async function extractScripts() {
  logger.logInfo('Extracting scripts from the bundled file...');
  let scriptsFolderRel = configuration.getConfigScriptsFolderRelativePath();
  let bundleFile = configuration.getBundleScriptsPath();
  let scriptsFolder = configuration.getScriptsFolderPath();
  let backFolder = configuration.getBackUpsFolderPath();
  // Check validness
  if (!bundleFile || !scriptsFolder || !backFolder) {
    logger.logError('Failed to extract RPG Maker scripts bundle file');
    logger.logError(`RPG Maker bundle file path: '${bundleFile}'`);
    logger.logError(`Backup folder path: '${backFolder}'`);
    logger.logError(`Scripts folder path: '${scriptsFolder}'`);
    return;
  }
  logger.logInfo(`RPG Maker bundle file path: '${bundleFile}'`);
  logger.logInfo(`Scripts folder path: '${scriptsFolder}'`);
  logger.logInfo(`Relative scripts path: '${scriptsFolderRel}'`);
  logger.logInfo(`Backup folder path: '${backFolder}'`);
  try {
    // Extracts all scripts
    let extraction = await scripts.extractScripts(bundleFile, scriptsFolder);
    // Evaluate extraction
    if (extraction === scripts.SCRIPTS_EXTRACTED) {
      logger.logInfo('Scripts extracted successfully!');
      // Overwrites the bundle file with the loader
      await scripts.createScriptLoaderBundle(
        bundleFile,
        backFolder,
        scriptsFolderRel!
      );
      // Creates a load order
      await scripts.createLoadOrderFile(scriptsFolder);
      context.setExtractedScripts(true);
    } else if (extraction === scripts.SCRIPTS_NOT_EXTRACTED) {
      logger.logInfo(
        "Extraction not needed, there aren't scripts left in the bundle file"
      );
    } else {
      logger.logWarning(`Extraction returned an unknown code: '${extraction}'`);
    }
  } catch (error: unknown) {
    context.setExtractedScripts(false);
    logger.logErrorUnknown(error);
  }
}

/**
 * Asynchronously creates the bundle script loader file for RPG Maker engine
 * @returns A promise
 */
export async function createScriptLoader() {
  logger.logInfo('Creating script loader bundle file...');
  let bundleFile = configuration.getBundleScriptsPath();
  let backFolder = configuration.getBackUpsFolderPath();
  let scriptsFolder = configuration.getConfigScriptsFolderRelativePath();
  // Check validness
  if (!bundleFile || !scriptsFolder || !backFolder) {
    logger.logError('Failed to create script loader bundle file');
    logger.logError(`RPG Maker bundle file path: '${bundleFile}'`);
    logger.logError(`Backup folder path: '${backFolder}'`);
    logger.logError(`Scripts folder path: '${scriptsFolder}'`);
    return;
  }
  // Perform creation
  try {
    let bundleStatus = await scripts.checkExtractedScripts(bundleFile);
    if (bundleStatus === scripts.SCRIPTS_NOT_EXTRACTED) {
      logger.logError(
        'Cannot create script loader bundle file because RPG Maker bundle file still has valid scripts inside of it!'
      );
      logger.logWarning(
        'You should make sure to extract the scripts to avoid data loss before doing this'
      );
      return;
    }
    // Overwrite bundle file
    let loaderStatus = await scripts.createScriptLoaderBundle(
      bundleFile,
      backFolder,
      scriptsFolder
    );
    if (loaderStatus === scripts.LOADER_BUNDLE_CREATED) {
      logger.logInfo('Script loader bundle file created successfully!');
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Creates the load order file within the current scripts folder path
 * @returns A promise
 */
export async function createLoadOrder() {
  let scriptsFolder = configuration.getScriptsFolderPath();
  if (!scriptsFolder) {
    logger.logError(
      `Cannot create load order file because the scripts folder path: '${scriptsFolder}' is invalid!`
    );
    return;
  }
  try {
    logger.logInfo('Creating load order file...');
    const loadOrderPath = await scripts.createLoadOrderFile(scriptsFolder);
    logger.logInfo(
      `Load order file created succesfully at: '${loadOrderPath}'`
    );
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Runs the game executable if the there is an active project folder set
 * @returns A promise
 */
export async function runGame() {
  logger.logInfo('Trying to run the game executable...');
  let gameWorkingDir = configuration.getProjectFolderPath();
  let gameExecutablePath = configuration.getGameExePath();
  let gameExecutableArgs = configuration.determineGameExeArguments();
  logger.logInfo(`Executable working directory: '${gameWorkingDir}'`);
  logger.logInfo(`Executable path: '${gameExecutablePath}'`);
  logger.logInfo(`Executable arguments: '${gameExecutableArgs}'`);
  // Evaluates validness
  if (!gameWorkingDir || !gameExecutablePath || !gameExecutableArgs) {
    logger.logError(`Cannot run the executable due to invalid values.`);
    return;
  }
  // Run logic
  try {
    let gameProcess = await gameplay.runExecutable(gameExecutablePath, {
      cwd: gameWorkingDir,
      args: gameExecutableArgs,
    });
    gameProcess.unref();
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}
