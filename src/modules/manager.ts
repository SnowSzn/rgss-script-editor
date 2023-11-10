import * as fs from 'fs';
import * as marshal from '@hyrious/marshal';
import * as zlib from 'zlib';
import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as configuration from './utils/Configuration';
import * as ui from './ui/ExtensionUI';
import * as scripts from './utils/ScriptFolderUtil';
import { logger } from './utils/Logger';
import { isWineInstalled } from './utils/CheckWine';
import { checkFolderValidness } from './utils/CheckProjectFolderValidness';

/**
 * Quickstart extension
 * @param folders List of folders
 */
export async function quickStart(folders: readonly vscode.WorkspaceFolder[]) {
  let validFolders = [];
  for (let folder of folders) {
    if (checkFolderValidness(folder.uri)) {
      validFolders.push(folder);
    }
  }
  // Opens the folder if there is only one valid
  if (validFolders.length === 1) {
    await setProjectFolder(validFolders[0].uri);
  } else {
    // Do nothing for now
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
      logger.logInfo(`RGSS Version detected: '${value.curRgssVersion}'`);
      // Updates status bar
      ui.controller.updateProjectFolderStatusBar(value.curProjectFolder!);
      ui.controller.showStatusBar();
    },
    (reason) => {
      ui.controller.hideStatusBar();
      logger.logError(reason);
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
export function extractScripts() {
  logger.logInfo('Extracting scripts from the bundled file...');
  let scriptsFolderPath = configuration.config.determineScriptsFolderPath();
  let bundleFilePath = configuration.config.determineBundleScriptsPath();
  // let rgssVersion = configuration.config.getRGSSVersion();
  if (bundleFilePath && scriptsFolderPath) {
    logger.logInfo(`RPG Maker bundle file path is: '${bundleFilePath}'`);
    logger.logInfo(
      `Path to the extracted scripts folder is: '${scriptsFolderPath}'`
    );
    try {
      // TODO: How to extract script files?
      // Makes sure to create the path where all scripts will be stored
      scripts.createScriptFolder();
      // Creates a backup
      scripts.createBackUp(bundleFilePath);
      // Perform extract logic
      // TODO: Importante
      // permitir que se puedan hacer tantos 'extracts' como quiera el usuario, PERO
      // NUNCA se eliminara el directorio y se volvera a recrear por cada extraccion que se haga
      // ademas, la extension DEBE ignorar el script dummy que se crea para cargar los ficheros externos
      // Se podria recurrir a un regex que comprobase una linea especifica en el codigo del script e ignorarlo
      // cuando se cumpla la condicion de que el fichero es el que se ha creado por la extension
      // logger.logInfo('Reading bundled file...');
      // let decoder = new TextDecoder('utf-8');
      // let file = fs.readFileSync(bundleFilePath);
      // var data: any = marshal.load(file, { string: 'binary' });
      // for (let i = 0; i < data.length; i++) {
      //   var [_section, _name, _code] = data[i];
      //   var section = _section;
      //   var name = decoder.decode(_name);
      //   var code = zlib.inflateSync(_code);
      //   logger.logInfo(`Section: '${section.toString()}'`);
      //   logger.logInfo(`Name: '${name.toString()}'`);
      //   logger.logInfo(`Code: '${code.toString()}'`);

      // }
      // TODO: Fixed now, I gotta check if for RGSS1 I need to marshal.loadAll() tho
      // //let binary = await vscode.workspace.fs.readFile(Uri.new());
      // switch (rgssVersion) {
      //   case Configuration.RGSSVersions.RGSS1: {
      //   }
      //   case Configuration.RGSSVersions.RGSS2: {
      //   }
      //   case Configuration.RGSSVersions.RGSS3: {
      //     //let binaryArr = hMarshal.load(binary) as Array<Array<number | string>>;
      //     let binaryArr = hMarshal.load(binary) as Array<Array<ArrayBuffer>>;
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
    encoding: 'utf-8',
    cwd: gameWorkingDir,
  });
  gameProcess.unref();
}
