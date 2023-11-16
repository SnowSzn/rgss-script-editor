import * as fs from 'fs';
import * as zlib from 'zlib';
import * as marshal from '@hyrious/marshal';
import * as pathResolve from '../utils/path_resolve';

/**
 * Determines that the RPG Maker scripts bundle file was not extracted.
 */
export const SCRIPTS_NOT_EXTRACTED = 100;

/**
 * Determines that all scripts inside the project's bundle file were extracted.
 */
export const SCRIPTS_EXTRACTED = 200;

/**
 * Determines if the script loader bundle was created.
 */
export const LOADER_BUNDLE_CREATED = 150;

/**
 * Unique script section for this extension's external scripts loader script.
 */
const LOADER_SCRIPT_SECTION = 133_769_420;

/**
 * Name of the script that will load all external scripts.
 */
const LOADER_SCRIPT_NAME = 'RGSS Script Editor Loader';

/**
 * Load order file name within the scripts folder.
 */
const LOAD_ORDER_FILE_NAME = 'load_order.txt';

/**
 * Regexp of invalid characters for Windows, Linux-based systems and the script loader.
 */
const INVALID_CHARACTERS = /[\\/:\*\?"<>\|▼■]/g;

/**
 * Regexp to deformat a external script name.
 */
const DEFORMAT_SCRIPT_NAME = /^\d+\s*-\s*(.+?)\.rb$/;

/**
 * Asynchronously checks if the current RPG Maker project has extracted the bundle file previously.
 *
 * The promise is resolved when the extraction is done with a code number.
 *
 * If the check fails it rejects the promise with an error instance.
 * @param bundleFile Absolute path to the bundle file
 * @param scriptFolder Absolute path to the script folder
 * @returns A promise
 */
export async function checkExtractedScripts(
  bundleFile: string
): Promise<number> {
  try {
    let bundle = readBundleFile(bundleFile);
    // Checks if there is scripts left
    if (checkValidExtraction(bundle)) {
      return SCRIPTS_NOT_EXTRACTED;
    } else {
      return SCRIPTS_EXTRACTED;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Asynchronously extracts the given RPG Maker bundle file to the scripts directory.
 *
 * The promise is resolved when the extraction is done with a code number.
 *
 * If the extraction was impossible it rejects the promise with an error.
 * @param bundleFile Absolute path to the RPG Maker bundle file
 * @param scriptFolder Absolute path to the script folder
 * @returns A promise
 */
export async function extractScripts(
  bundleFile: string,
  scriptFolder: string
): Promise<number> {
  try {
    let bundle = readBundleFile(bundleFile);
    // Only perform extraction logic once
    if (checkValidExtraction(bundle)) {
      // Create scripts folder if it does not exists (throws error)
      createScriptFolder(scriptFolder);
      // Perform extraction
      for (let i = 0; i < bundle.length; i++) {
        let section = bundle[i][0];
        let name = formatScriptName(bundle[i][1], i);
        let code = processScriptCode(bundle[i][2]);
        // Checks if the current script is the loader to avoid extracting it
        if (isLoaderScript(section)) {
          continue;
        } else {
          let scriptPath = pathResolve.join(scriptFolder, name);
          fs.writeFileSync(scriptPath, code, { encoding: 'utf8' });
        }
      }
      return SCRIPTS_EXTRACTED;
    } else {
      return SCRIPTS_NOT_EXTRACTED;
    }
  } catch (error) {
    throw error; // Auto. rejects the promise with the thrown error
  }
}

/**
 * Asynchronously overwrites the RPG Maker bundle file to create the script loader inside of it.
 *
 * For security reasons, it always creates a backup file of the bundle file inside the given folder.
 *
 * The promise is resolved when the creation is done with a code number.
 *
 * If something is wrong the promise is rejected with an error.
 * @param bundleFile Absolute path to the RPG Maker bundle file
 * @param backUpsFolderPath Absolute path to the backups folder
 * @param scriptFolder Relative path to the external scripts folder
 */
export async function createScriptLoaderBundle(
  bundleFile: string,
  backUpsFolderPath: string,
  scriptFolder: string
): Promise<number> {
  try {
    // Creates the backup file
    createBackUp(bundleFile, backUpsFolderPath);
    // Formats script loader Ruby script
    let loaderScriptsFolder = pathResolve.resolveRPG(scriptFolder);
    let loaderScript = `#==============================================================================
# ** ${LOADER_SCRIPT_NAME}
#------------------------------------------------------------------------------
# Version: 1.1.1
# Author: SnowSzn
# Github: https://github.com/SnowSzn/
# VSCode extension: https://github.com/SnowSzn/rgss-script-editor
#------------------------------------------------------------------------------
# This script is used to load all external script files from the scripts folder
# that was created using the VSCode extension.
#
# You don't have to modify anything here, the extension automatically creates
# this script after the extraction process is done successfully.
#
# Keep in mind that you shouldn't move or rename neither the scripts folder nor
# the load order TXT file used to load the scripts, since they are used to load
# all scripts files, otherwise this script won't know where to look for scripts.
#
# If for some reason, you want to move the scripts folder to another location
# and you have already extracted the scripts to the default path, you should
# follow these steps:
#   1. Go to the VSCode extension settings and modify the scripts folder path
#     - This option ID is: 'rgss-script-editor.external.scriptsFolder'
#   This is important, since if you don't do it properly, the extension will
#   be working with the same path as before.
#
#   2. Move the folder to the desired location.
#
#   3. Change this script's target folder location.
#   You must change the location where this script will look for script files.
#   You can do this in two ways:
#     - Changing the "SCRIPTS_PATH" value here in the ScriptLoaderConfiguration
#       module.
#     - Using the VSCode extension to re-create the script loader bundle file.
#       The command is: "Create Script Loader Bundle File"
#
# In case you accidentally deleted the scripts folder, you can recover use the
# backup file that was created before the extraction process was initialized
# though you will lose all the progress made that you may have done.
#==============================================================================

#
# VSCode Extension configuration
#
module ScriptLoaderConfiguration
  #
  # Relative path to the scripts folder inside the game project's folder.
  #
  SCRIPTS_PATH = "${loaderScriptsFolder}"
end

###############################################################################
#   DO NOT MODIFY ANYTHING BELOW THIS LINE IF YOU DO NOT WHAT YOU ARE DOING   #
#   DO NOT MODIFY ANYTHING BELOW THIS LINE IF YOU DO NOT WHAT YOU ARE DOING   #
#   DO NOT MODIFY ANYTHING BELOW THIS LINE IF YOU DO NOT WHAT YOU ARE DOING   #
###############################################################################

#
# Script loader
#
module ScriptLoader
  include ScriptLoaderConfiguration
  
  # Script loader error message.
  LOAD_ERROR_MSG = "If you are reading this it's because something went "\\
  "horribly wrong when loading scripts.\\n\\nThe game couldn't load a single "\\
  "script file so that's why it will close after closing this message "\\
  "instantly.\\n\\nCheck the load order TXT file to make sure scripts written "\\
  "there exists!"
  
  # Array used to determine whether a script has been already loaded or not.
  @cache = []
  
  #
  # Loader run logic
  #
  def self.run
    # Prepares run
    log("Running script loader...")
    @cache.clear
    load_order_path = File.join(SCRIPTS_PATH, '${LOAD_ORDER_FILE_NAME}')
    log("Scripts folder path is: '#{SCRIPTS_PATH}'")
    log("Load order file path is: '#{load_order_path}'")
    log("Reading load order file...")
    load_order = File.read(load_order_path).split("\\n")
    # Start load order processing
    load_order.each do |script|
      load_script(script)
    end
    # Post-load logic
    if @cache.empty?
      # Not a single script was loaded?
      raise StandardError.new(LOAD_ERROR_MSG)
    end
  end

  #
  # Loads the script.
  #
  # @param path [String] Script path
  #
  def self.load_script(path)
    # Processes path
    script = process_path(path)
    # Handles the script
    if valid_script?(script)
      log("Loading script: '#{format_path(script)}'")
      @cache << script
      Kernel.send(:load, script)
    elsif valid_directory?(script)
      log("Valid directory detected: '#{format_path(script)}'")
      Dir.entries(script).each do |entry|
        next if ['.', '..'].include?(entry)
        load_script(File.join(script, entry))
      end
    else
      log("Skipping: '#{format_path(script)}' (invalid)")
    end
  end

  #
  # Process the given path.
  #
  # @param path [String] Path.
  #
  # @return [String] Processed path.
  #
  def self.process_path(path)
    # Removes trailing whitespaces
    new_path = path.strip
    # Adds working directory if not present
    unless File.dirname(new_path).include?(Dir.pwd)
      new_path = File.join(Dir.pwd, SCRIPTS_PATH, new_path) 
    end
    # Returns processed path
    return new_path
  end
  
  #
  # Formats the given path for the loader logging.
  #
  # @param path [String] Path.
  #
  # @return [String] Processed path.
  #
  def self.format_path(path)
    return path.gsub(File.join(Dir.pwd, SCRIPTS_PATH) + '/', '')
  end

  #
  # Checks if the given file is a valid Ruby script file.
  #
  # @param path [String] Path.
  #
  # @return [Boolean] Script validness.
  #
  def self.valid_script?(path)
    return false if path[0] == '#'
    return false if @cache.include?(path)
    return false unless File.file?(path)
    return false unless File.extname(path).downcase == '.rb'
    return true
  end
  
  #
  # Checks if the given path is a valid directory.
  #
  # @param path [String] Path.
  #
  # @return [Boolean] Directory validness.
  #
  def self.valid_directory?(path)
    return false if path[0] == '#'
    return false unless File.directory?(path)
    return false unless Dir.entries(path).any? { |entry| valid_script?(entry) }
    return true
  end

  #
  # Checks cache validness.
  #
  # At least a script should have been loaded to ensure validness.
  #
  # @return [Boolean] Cache validness.
  #
  def self.cache?
    @cache.size > 0
  end

  #
  # Checks if the project's version is RGSS1
  #
  # @return [Boolean] Project is RGSS1.
  #
  def self.rgss1?
    File.file?("Data/Scripts.rxdata")
  end

  #
  # Checks if the project's version is RGSS2
  #
  # @return [Boolean] Project is RGSS2.
  #
  def self.rgss2?
    File.file?("Data/Scripts.rvdata")
  end
  
  #
  # Checks if the project's version is RGSS1
  #
  # @return [Boolean] Project is RGSS1.
  #
  def self.rgss3?
    File.file?("Data/Scripts.rvdata2")
  end
  
  #
  # Logs the message.
  #
  # Logging is deactivated in RGSS1 and RGSS2 to avoid message box spam.
  #
  # @param message [String] Message.
  #
  def self.log(message)
    print "[RGSS Script Editor Loader] #{message}\\n" if rgss3?
  end
end

# Start loader processing
ScriptLoader.run
`;
    // Format data
    let bundle: any[][] = [[]];
    bundle[0][0] = LOADER_SCRIPT_SECTION;
    bundle[0][1] = LOADER_SCRIPT_NAME;
    bundle[0][2] = zlib.deflateSync(loaderScript, {
      level: zlib.constants.Z_BEST_COMPRESSION,
      finishFlush: zlib.constants.Z_FINISH,
    });
    let bundleMarshalized = marshal.dump(bundle, {
      hashStringKeysToSymbol: true,
    });
    // Overwrite bundle data
    fs.writeFileSync(bundleFile, bundleMarshalized, {
      flag: 'w',
    });
    return LOADER_BUNDLE_CREATED;
  } catch (error) {
    throw error;
  }
}

/**
 * Asynchronously creates a load order.
 *
 * It looks for all ruby files inside the base directory and writes their relative path into the load order file.
 *
 * If the load order file creation was successful it resolves the promise with the load order file path.
 *
 * If the load order couldn't be created it rejects the promise with an error.
 * @param scriptFolder Absolute path to the external scripts folder
 * @returns A promise
 */
export async function createLoadOrderFile(
  scriptFolder: string
): Promise<string> {
  let filePath = pathResolve.join(scriptFolder, LOAD_ORDER_FILE_NAME);
  let entries = readDirRecursive(scriptFolder);
  let file = fs.openSync(filePath, 'w');
  entries.forEach((entry) => {
    if (entry.endsWith('.rb')) {
      let script = pathResolve.resolveRPG(entry);
      fs.writeSync(file, `${script}\n`);
    }
  });
  fs.closeSync(file);
  return filePath;
}

/**
 * Checks if the extraction process is valid or not.
 *
 * Returns true if there are scripts in the bundle file that were not extracted previously.
 * @param bundle Bundle (marshalized)
 * @returns Whether extraction is valid or not
 */
function checkValidExtraction(bundle: any[][]): boolean {
  // Only a script file exists, check if it is the loader
  return bundle.some((script) => {
    // Checks if it exists at least a valid script in the bundle array that is not a loader
    let scriptSection = script[0];
    if (isLoaderScript(scriptSection)) {
      return false; // It is the loader
    } else if (typeof scriptSection === 'number') {
      return true; // At least a 'true' is needed
    }
    return false;
  });
}

/**
 * Creates the scripts folder at the given path.
 *
 * This function can throw errors.
 */
function createScriptFolder(scriptsFolderPath: string) {
  if (!fs.existsSync(scriptsFolderPath)) {
    fs.mkdirSync(scriptsFolderPath, { recursive: true });
  } else {
  }
}

/**
 * Creates a back up of the given file in the backup folder.
 *
 * Automatically creates the backup folder path if it does not exists already.
 *
 * This function can throw errors
 * @param filePath Absolute path to the file.
 * @param backUpsFolder Absolute path to the destination folder.
 */
function createBackUp(filePath: string, backUpsFolder: string) {
  // Checks if the given file exists first
  if (!fs.existsSync(filePath)) {
    throw new Error(`Failed to copy: '${filePath}', file does not exist!`);
  }
  // Makes sure backup directory exists
  if (!fs.existsSync(backUpsFolder)) {
    fs.mkdirSync(backUpsFolder, { recursive: true });
  }
  // Copy file to destination folder
  let backUpFilePath = pathResolve.join(
    backUpsFolder,
    `${pathResolve.basename(filePath)} - ${currentDate()}.bak`
  );
  fs.copyFileSync(filePath, backUpFilePath);
}

/**
 * Reads the RPG Maker bundle file from the given path and marshalizes it.
 *
 * It returns the bundle data converted.
 *
 * This function may throw exceptions if the file does not exists.
 * @param bundleFile Bundle file absolute path
 * @returns The bundle data
 */
function readBundleFile(bundleFile: string): any[][] {
  let output: any[][] = [];
  let textDecoder = new TextDecoder('utf8');
  // Read binary data
  let bundleContents = fs.readFileSync(bundleFile);
  // Marshalizes the bundle file contents
  let bundleMarshalized = marshal.load(bundleContents, {
    string: 'binary',
  }) as Array<Array<any>>;
  for (let i = 0; i < bundleMarshalized.length; i++) {
    output[i] = [];
    output[i][0] = bundleMarshalized[i][0];
    output[i][1] = textDecoder.decode(bundleMarshalized[i][1]);
    output[i][2] = zlib.inflateSync(bundleMarshalized[i][2]).toString('utf8');
  }
  return output;
}

/**
 * Recursively reads the given directory.
 *
 * It returns a list of all elements inside the base directory.
 *
 * If the 'absolute' flag is set to true the contents are all joined with the base directory.
 *
 * By default 'absolute' flag is set to false.
 *
 * If the given directory does not exists it raises an exception.
 * @param base Base directory
 * @param absolute Absolute path flag
 * @returns List of files
 */
function readDirRecursive(base: string, absolute = false): string[] {
  let elements: string[] = [];
  fs.readdirSync(base).forEach((value) => {
    let valuePath = pathResolve.join(base, value);
    if (fs.statSync(valuePath).isDirectory()) {
      elements = elements.concat(...readDirRecursive(valuePath, absolute));
    } else {
      if (absolute) {
        elements = elements.concat(valuePath);
      } else {
        elements = elements.concat(value);
      }
    }
  });
  return elements;
}

/**
 * Checks if the given script section corresponds to the extension's loader script.
 * @param scriptSection Section of the script
 * @returns Whether it is the script loader or not
 */
function isLoaderScript(scriptSection: number) {
  return scriptSection === LOADER_SCRIPT_SECTION;
}

/**
 * Processes the external script name and returns it.
 *
 * This function makes sure it does not have invalid characters for the OS.
 * @param scriptName Script name
 * @param scriptIndex Script index number
 * @returns The processed script name
 */
function formatScriptName(scriptName: string, scriptIndex: number): string {
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
 * Deformats the given script name.
 *
 * It returns the same script name if deformatting cannot be done.
 * @param scriptName Script name
 * @returns Deformatted script name
 */
function deformatScriptName(scriptName: string): string {
  let match = scriptName.match(DEFORMAT_SCRIPT_NAME);
  return match ? match[0] : scriptName;
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
