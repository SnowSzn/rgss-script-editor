import * as fs from 'fs';
import * as zlib from 'zlib';
import * as marshal from '@hyrious/marshal';
import * as configuration from './Configuration';
import * as pathResolve from './PathResolve';
import { logger } from './Logger';

/**
 * Unique script section for this extension's external scripts loader script
 */
const LOADER_SCRIPT_SECTION = 133_769_420;
/**
 * Name of the script that will load all external scripts
 */
const LOADER_SCRIPT_NAME = 'RGSS Script Editor Loader';
/**
 * A regexp that checks if the Kernel line is present in the loader script file
 */
const LOADER_SCRIPT_CODE_REGEXP = /Kernel\.send\(:require/g;
/**
 * Load order file name within the scripts folder
 */
const LOAD_ORDER_FILE_NAME = 'load_order.txt';
/**
 * Regexp of invalid characters for both Windows, Linux-based systems and the script loader
 */
const INVALID_CHARACTERS = /[\\/:\*\?"<>\|▼■]/g;

/**
 * Asynchronously extracts the given RPG Maker bundle file to the scripts directory.
 *
 * If the extraction was successful the promise is resolved with a true value.
 *
 * If the extraction was already done previously the promise is resolved with a false value.
 *
 * If the extraction was impossible it rejects the promise with an error
 * @param bundleFile Absolute path to the RPG Maker bundle file
 * @param scriptFolder Absolute path to the script folder
 * @returns A promise
 */
export async function extractScripts(
  bundleFile: string,
  scriptFolder: string
): Promise<boolean> {
  try {
    let textDecoder = new TextDecoder('utf8');
    let bundleContents = fs.readFileSync(bundleFile);
    let bundleMarshalized = marshal.load(bundleContents, {
      string: 'binary',
    }) as Array<Array<any>>;
    // Only perform extraction logic once
    if (checkValidExtraction(bundleMarshalized)) {
      // Create scripts folder if it does not exists (throws error)
      await createScriptFolder(scriptFolder);
      // Perform extraction
      for (let i = 0; i < bundleMarshalized.length; i++) {
        let section = bundleMarshalized[i][0];
        let name = processScriptName(
          textDecoder.decode(bundleMarshalized[i][1]),
          i
        );
        let code = processScriptCode(
          zlib.inflateSync(bundleMarshalized[i][2]).toString('utf8')
        );
        // Checks if the current script is the loader to avoid extracting it
        if (validLoaderScript(section)) {
          continue;
        } else {
          let scriptPath = pathResolve.join(scriptFolder, name);
          fs.writeFileSync(scriptPath, code, { encoding: 'utf8' });
        }
      }
      return true;
    } else {
      return false;
    }
  } catch (error) {
    throw error; // Auto. rejects the promise with the thrown error
  }
}

/**
 * Asynchronously overwrites the RPG Maker bundle file to create the script loader inside of it.
 *
 * IMPORTANT: This method must be called after the backup file is done!
 *
 * If the creation was successful it resolves a promise with a true value
 *
 * If something is wrong the promise is rejected with an error
 * @param bundleFile Absolute path to the RPG Maker bundle file
 */
export async function createScriptLoader(bundleFile: string): Promise<boolean> {
  // At this point, bundle file must have been backed up!!
  let scriptFolderRelative =
    configuration.config.getConfigScriptsFolderRelativePath();
  if (scriptFolderRelative) {
    scriptFolderRelative = pathResolve.joinRPG(scriptFolderRelative);
    let loadOrderFilePath = pathResolve.joinRPG(
      scriptFolderRelative,
      LOAD_ORDER_FILE_NAME
    );
    let scriptCode = `# encoding: utf-8
#==============================================================================
# ** ${LOADER_SCRIPT_NAME}
#------------------------------------------------------------------------------
# Author: SnowSzn
# Github: https://github.com/SnowSzn/
# VSCode extension: https://github.com/SnowSzn/rgss-script-editor
# Version: 1.0
#------------------------------------------------------------------------------
# This is script is used to load all external script files from the scripts
# folder that was created using the VSCode extension.
#
# You don't have to modify anything here, the extension automatically creates
# this script after the extraction process is done successfully.
#
# IMPORTANT: In the case that you do one of these situations:
#   1. Moved/Renamed the scripts folder
#   2. Moved/Renamed/Deleted the load order TXT file ('${LOAD_ORDER_FILE_NAME}')
# You MUST change the value of the constants in the configuration module
# to reflect the change, otherwise the script will fail and raise an exception.
#   - SCRIPTS_FOLDER_PATH: Path to the scripts folder
#   - LOAD_ORDER_FILE_PATH: Path to the load order file (including extension)
#
#
# If you don't want to change it here, you can also re-create the loader using
# the appropiate command in the extension context.
#
# In case you accidentally deleted the script folder, you can recover use the
# backup file that was created before the extraction process was initialized
# though you will lose all progress made that you may have done.
#==============================================================================

#
# VSCode Extension configuration
#
module ScriptLoaderConfiguration
  # Path to the scripts folder
  SCRIPTS_FOLDER_PATH = "${scriptFolderRelative}"
  # Path to the loader text file
  LOAD_ORDER_FILE_PATH = "${loadOrderFilePath}"
end

# IMPORTANT: DO NOT MODIFY ANYTHING BELOW THIS LINE

#
# Script loader
#
module ScriptLoader
  include ScriptLoaderConfiguration

  #
  # Loader logic
  #
  def self.run
    print "[RGSS Script Editor] Running script loader\\n"
    load_order = File.read(LOAD_ORDER_FILE_PATH).split("\\n")
    load_order.each do |script|
      script_path = File.join(SCRIPTS_FOLDER_PATH, script)
      print "[RGSS Script Editor] Loading script: '#{script_path}'\\n"
      Kernel.send(:load, script_path)
    end
  end
end

ScriptLoader.run

# IMPORTANT: DO NOT MODIFY ANYTHING ABOVE THIS LINE
`;
    // Format data
    let bundle: any[][] = [[]];
    bundle[0][0] = LOADER_SCRIPT_SECTION;
    bundle[0][1] = LOADER_SCRIPT_NAME;
    bundle[0][2] = zlib.deflateSync(scriptCode, {
      level: zlib.constants.Z_BEST_COMPRESSION,
      finishFlush: zlib.constants.Z_FINISH,
    });
    let bundleMarshalized = marshal.dump(bundle, {
      hashStringKeysToSymbol: true,
    });
    // Overwrite bundle data
    fs.writeFileSync(bundleFile, bundleMarshalized, {
      encoding: 'latin1',
      flag: 'w',
    });
    return true;
  } else {
    throw new Error(
      `Relative path to the scripts folder: ${scriptFolderRelative} is undefined!`
    );
  }
}

/**
 * Asynchronously creates a load order file based on the given external scripts folder
 *
 * If the load order file creation was successful it resolves the promise with a true value.
 *
 * If the scripts folder does not exists it rejects the promise with an error.
 * @param scriptFolder Absolute path to the external scripts folder
 * @returns A promise
 */
export async function createLoadOrder(scriptFolder: string) {
  if (fs.existsSync(scriptFolder)) {
    let loadOrderFile = pathResolve.join(scriptFolder, LOAD_ORDER_FILE_NAME);
    let files = readDirRecursive(scriptFolder);
    // Deletes previous load order file (if it exists)
    if (fs.existsSync(loadOrderFile)) {
      fs.unlinkSync(loadOrderFile);
    }
    // Process all files
    files.forEach((value) => {
      let fileOrder = `${pathResolve.basename(value)}\n`;
      if (value.endsWith('.rb')) {
        fs.writeFileSync(loadOrderFile, fileOrder, {
          flag: 'a+',
        });
      }
    });
    return true;
  } else {
    throw new Error(
      `Cannot create a load order because the script folder: '${scriptFolder}' does not exists`
    );
  }
}

/**
 * Asynchronously creates a back up of the given file in the extension's back up folder location.
 *
 * This function creates the backup folder path if it does not exists already.
 *
 * If the creation is successful the promise is resolved.
 *
 * If something went wrong the promise is rejected with an error.
 * @param filePath Full path to the file
 */
export async function createBackUp(filePath: string) {
  return new Promise<boolean>((resolve, reject) => {
    // Checks if the given file exists first
    if (!fs.existsSync(filePath)) {
      reject(new Error(`The file to copy: '${filePath}' does not exists!`));
      return;
    }
    // Perform backup creation
    let backUpsFolder = configuration.config.determineBackUpsFolderPath();
    if (backUpsFolder) {
      // Makes sure backup directory exists
      if (!fs.existsSync(backUpsFolder)) {
        fs.mkdirSync(backUpsFolder, { recursive: true });
      }
      let backUpFilePath = pathResolve.join(
        backUpsFolder,
        `${pathResolve.basename(filePath)} - ${currentDate()}.bak`
      );
      fs.copyFile(filePath, backUpFilePath, (err) => {
        if (err) {
          reject(new Error(`It was impossible to copy the file (${err})`));
        } else {
          logger.logInfo(
            `Back up scripts bundle file created at: '${backUpFilePath}'`
          );
          resolve(true);
        }
      });
    } else {
      reject(
        new Error(
          `Cannot create backup file because backup folder path: '${backUpsFolder}' is invalid!`
        )
      );
    }
  });
}

/**
 * Asynchronously creates the external script folder and the loader file.
 *
 * If the scripts folder path is already created the promise is resolved.
 *
 * If something went wrong the promise is rejected with an error.
 */
async function createScriptFolder(scriptsFolderPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!scriptsFolderPath) {
      reject(
        new Error(
          `Extracted scripts folder path. '${scriptsFolderPath}' is invalid!`
        )
      );
      return;
    }
    // Checks if it does not exists already and creates it
    if (!fs.existsSync(scriptsFolderPath)) {
      fs.mkdir(scriptsFolderPath, { recursive: true }, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.logInfo(`Created scripts folder at: '${scriptsFolderPath}'`);
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * Recursively reads the given directory.
 *
 * If the given directory does not exists it raises an exception.
 *
 * It returns a list of absolute paths of all items.
 * @param directory Directory to read
 * @returns List of files
 */
function readDirRecursive(directory: string): string[] {
  let files: string[] = [];
  fs.readdirSync(directory).forEach((value) => {
    let valuePath = pathResolve.join(directory, value);
    if (fs.statSync(valuePath).isDirectory()) {
      files = files.concat(...readDirRecursive(valuePath));
    } else {
      files = files.concat(valuePath);
    }
  });
  return files;
}

/**
 * Checks if the extraction process is valid or not.
 *
 * Being 'valid' means that there are new scripts in the bundle file that were not extracted previously.
 *
 * This is done by checking if the only scripts in the buffer are just the extension script loader.
 * @param bundle Bundle file marshalized
 * @returns Whether it is a valid extraction or not
 */
function checkValidExtraction(bundle: any[][]): boolean {
  // Only a script file exists, check if it is the loader
  return bundle.some((script) => {
    // Checks if it exists at least a valid script in the bundle array that is not a loader
    let scriptSection = script[0];
    let scriptCode = zlib.inflateSync(script[2]).toString('utf8');
    if (validLoaderScript(scriptSection)) {
      return false; // It is the loader
    } else {
      return true; // At least a 'true' is needed
    }
  });
}

/**
 * Processes the external script name and returns it.
 *
 * This function makes sure it does not have invalid characters for the OS.
 * @param scriptName Script name
 * @param scriptIndex Script index number
 * @returns The processed script name
 */
function processScriptName(scriptName: string, scriptIndex: number): string {
  let index = scriptIndex.toString();
  // Removes any invalid characters
  let name = scriptName.replace(INVALID_CHARACTERS, '');
  // Removes any whitespace left in the start
  name = name.trim();
  // Adds script index
  name = `${index.padStart(4, '0')} - ${name}`;
  // Concatenates the ruby extension if it isn't already
  if (!name.includes('.rb')) {
    return name.concat('.rb');
  }
  return name;
}

/**
 * Processes the script code body to ensure compatibility with RPG Maker.
 *
 * Ruby 1.9 does not automatically detects file encoding so it must be added in the script to avoid encoding crashes.
 * @param scriptCode Code of the script
 * @returns The script code processed
 */
function processScriptCode(scriptCode: string): string {
  let script = '';
  if (!scriptCode.includes('# encoding: utf-8')) {
    script = `# encoding: utf-8\n${scriptCode}`;
  }
  return script;
}

/**
 * Checks if the given arguments corresponds to the extension's loader script
 * @param scriptSection Section of the script
 * @returns Whether it is a valid script loader or not
 */
function validLoaderScript(scriptSection: number) {
  return scriptSection === LOADER_SCRIPT_SECTION;
}

/**
 * Formats the current date and returns it as a string
 * @returns Formatted date
 */
function currentDate(): string {
  let date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  const hour = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day}_${hour}.${minutes}.${seconds}`;
}
