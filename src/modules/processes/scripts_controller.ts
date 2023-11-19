import * as fs from 'fs';
import * as zlib from 'zlib';
import * as marshal from '@hyrious/marshal';
import * as pathResolve from '../utils/path_resolve';
import * as directories from '../utils/directories';
import { config as configuration } from '../utils/configuration';
import { logger } from '../utils/logger';

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
export const LOADER_BUNDLE_CREATED = 300;

/**
 * Determines if the bundle file using the extracted scripts was created.
 */
export const BUNDLE_CREATED = 400;

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
 *
 * Case insensitive.
 */
const DEFORMAT_SCRIPT_NAME = /(?:\d+\s*-.*?)?(.*?)\.rb$/i;

/**
 * Maximum value to generate a script section
 *
 * Sets as the maximum of the script loader to avoid a double section ID
 */
const SECTION_MAX_VAL = 133_769_420;

/**
 * Asynchronously checks if the current RPG Maker project has extracted the bundle file previously.
 *
 * **The promise is resolved when the extraction is done with a code number.**
 *
 * **If the check fails it rejects the promise with an error instance.**
 * @returns A promise
 */
export async function checkExtractedScripts(): Promise<number> {
  // Gets path to the bundle file
  let bundleFile = configuration.getBundleScriptsPath();
  logger.logInfo(`Bundle file path is: '${bundleFile}'`);
  // Check bundle file validness
  if (!bundleFile) {
    throw new Error(`The path to the bundle file: '${bundleFile}' is invalid!`);
  }
  let bundle = readBundleFile(bundleFile);
  // Checks if there is scripts left
  if (checkValidExtraction(bundle)) {
    return SCRIPTS_NOT_EXTRACTED;
  } else {
    return SCRIPTS_EXTRACTED;
  }
}

/**
 * Asynchronously extracts the given RPG Maker bundle file to the scripts directory.
 *
 * **The promise is resolved when the extraction is done with a code number.**
 *
 * **If the extraction was impossible it rejects the promise with an error.**
 * @returns A promise
 */
export async function extractScriptsFromBundle(): Promise<number> {
  let bundleFile = configuration.getBundleScriptsPath();
  let scriptsFolder = configuration.getScriptsFolderPath();
  logger.logInfo(`RPG Maker bundle file path: '${bundleFile}'`);
  logger.logInfo(`Scripts folder path: '${scriptsFolder}'`);
  // Check validness
  if (!bundleFile || !scriptsFolder) {
    throw new Error(`Cannot extract scripts due to invalid values!`);
  }
  let bundle = readBundleFile(bundleFile);
  // Only perform extraction logic once
  if (checkValidExtraction(bundle)) {
    // Create scripts folder if it does not exists
    directories.createFolder(scriptsFolder);
    // Perform extraction
    for (let i = 0; i < bundle.length; i++) {
      let section = bundle[i][0];
      // Checks if the current script is the loader to avoid extracting it
      if (isLoaderScript(section)) {
        continue;
      }
      // Create scripts contents
      let name = formatScriptName(bundle[i][1], i);
      let code = processScriptCode(bundle[i][2]);
      let scriptPath = pathResolve.join(scriptsFolder, name);
      fs.writeFileSync(scriptPath, code, { encoding: 'utf8' });
    }
    return SCRIPTS_EXTRACTED;
  } else {
    return SCRIPTS_NOT_EXTRACTED;
  }
}

/**
 * Asynchronously overwrites the RPG Maker bundle file to create the script loader inside of it.
 *
 * For security reasons, it always creates a backup file of the bundle file inside the given folder.
 *
 * **The promise is resolved when the creation is done with a code number.**
 *
 * **If the creation was impossible it rejects the promise with an error.**
 * @returns A promise
 */
export async function createScriptLoaderBundle(): Promise<number> {
  let bundleFile = configuration.getBundleScriptsPath();
  let scriptsFolder = configuration.getScriptsFolderPath();
  let backUpsFolderPath = configuration.getBackUpsFolderPath();
  logger.logInfo(`RPG Maker bundle file path: '${bundleFile}'`);
  logger.logInfo(`Scripts folder path: '${scriptsFolder}'`);
  logger.logInfo(`Back ups folder path: '${backUpsFolderPath}'`);
  // Check validness
  if (!bundleFile || !scriptsFolder || !backUpsFolderPath) {
    throw new Error(
      `Cannot create script loader bundle file due to invalid values`
    );
  }
  // Creates the backup file
  directories.copyFile(
    bundleFile,
    pathResolve.join(
      backUpsFolderPath,
      `${pathResolve.basename(bundleFile)} - ${currentDate()}.bak`
    ),
    { recursive: true, overwrite: true }
  );
  // Formats script loader Ruby script
  let loaderScriptsFolder = pathResolve.resolveRPG(scriptsFolder);
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
  // Marshalizes the bundle file contents
  let bundleMarshalized = marshal.dump(bundle, {
    hashStringKeysToSymbol: true,
  });
  // Overwrite bundle data
  fs.writeFileSync(bundleFile, bundleMarshalized, {
    flag: 'w',
  });
  return LOADER_BUNDLE_CREATED;
}

/**
 * Asynchronously creates a load order.
 *
 * It creates a load order TXT file and writes each given script in ``scripts``
 *
 * If the load order file creation was successful it resolves the promise with the load order file path.
 *
 * If the load order couldn't be created it rejects the promise with an error.
 * @param scriptsList List of paths to the script files
 * @returns A promise
 */
export async function createLoadOrderFile(
  scriptsList: string[]
): Promise<string> {
  let scriptsFolder = configuration.getScriptsFolderPath();
  logger.logInfo(`Scripts folder path: '${scriptsFolder}'`);
  if (!scriptsFolder) {
    throw new Error(`Cannot create load order file due to invalid values!`);
  }
  let scripts = scriptsList.map((script) => {
    return pathResolve.relative(scriptsFolder!, script);
  });
  let loadOrderPath = pathResolve.join(scriptsFolder, LOAD_ORDER_FILE_NAME);
  let loadOrderFile = fs.openSync(loadOrderPath, 'w');
  scripts.forEach((script) => {
    fs.writeSync(loadOrderFile, `${script}\n`);
  });
  fs.closeSync(loadOrderFile);
  return loadOrderPath;
}

/**
 * Creates a RPG Maker bundle file based on the RGSS version from all of the extracted scripts files.
 * @param destination Destination path
 * @returns A promise
 */
export async function createBundleFile(destination: string): Promise<number> {
  let scriptsFolder = configuration.getScriptsFolderPath();
  logger.logInfo(`Scripts folder path: '${scriptsFolder}'`);
  if (!scriptsFolder) {
    throw new Error(
      `Cannot create bundle file from extracted scripts because the scripts folder: ${scriptsFolder} is invalid!`
    );
  }
  // Checks load order validness
  let loadOrder = fs
    .readFileSync(pathResolve.join(scriptsFolder, LOAD_ORDER_FILE_NAME), {
      encoding: 'utf8',
    })
    .split('\n');
  if (loadOrder.length <= 0) {
    throw new Error(
      `Failed to create bundle file because load order file is empty!`
    );
  }
  // Read script files
  let entries = directories.readDirectory(
    scriptsFolder,
    { recursive: true },
    (entries) => {
      return entries.filter((entry) => isRubyScript(entry));
    }
  );
  // Process scripts in the order of the load order file
  let scripts: string[] = [];
  loadOrder.forEach((isLoaded) => {
    // Avoids empty lines
    if (isLoaded.length > 0) {
      // Try to find a script that matches the load order line
      let script = entries.find((entry) => {
        let basename = pathResolve.basename(entry);
        let normalized = pathResolve.resolve(isLoaded);
        let relative = pathResolve.relative(scriptsFolder!, entry);
        let result = pathResolve.relative(normalized, relative);
        return result === '' || result === basename;
      });
      // Push new script absolute path
      if (script) {
        scripts.push(script);
      }
    }
  });
  // Bundle file creation
  let usedSections = [LOADER_SCRIPT_SECTION];
  let bundle: any[][] = [];
  scripts.forEach((script, index) => {
    let section = generateScriptSection(usedSections);
    let code = fs.readFileSync(script, { encoding: 'utf8' });
    // Create new bundle section
    bundle[index] = [];
    bundle[index][0] = section;
    bundle[index][1] = deformatScriptName(script);
    bundle[index][2] = zlib.deflateSync(code, {
      level: zlib.constants.Z_BEST_COMPRESSION,
      finishFlush: zlib.constants.Z_FINISH,
    });
    usedSections.push(section);
  });
  // Marshalizes the bundle file contents
  let bundleMarshalized = marshal.dump(bundle, {
    hashStringKeysToSymbol: true,
  });
  // Creates bundle file
  fs.writeFileSync(destination, bundleMarshalized, {
    flag: 'w',
  });
  return BUNDLE_CREATED;
}

export function createTreeData(scriptsFolder: string): string[] {
  let data = directories.readDirectory(
    scriptsFolder,
    { relative: false, recursive: true },
    (entries) => {
      return entries.filter(
        (entry) =>
          isRubyFolder(entry, scriptsFolder) ||
          isRubyScript(entry, scriptsFolder)
      );
    }
  );
  return data;
}

/**
 * Processes the external script name and returns it.
 *
 * This function makes sure it does not have invalid characters for the OS.
 * @param scriptName Script name
 * @param scriptIndex Script index number
 * @returns The processed script name
 */
export function formatScriptName(
  scriptName: string,
  scriptIndex: number
): string {
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
 * If a path is given, it will get the basename first before deformatting it.
 *
 * It returns the same script name if deformatting cannot be done.
 * @param script Script
 * @returns Deformatted script name
 */
export function deformatScriptName(script: string): string {
  let baseName = pathResolve.basename(script);
  let match = baseName.match(DEFORMAT_SCRIPT_NAME);
  return match ? match[1] : baseName;
}

/**
 * Checks if the given ``file`` is a Ruby script file.
 *
 * If a ``base`` path is given, it is joined with the given ``file`` before the check.
 * @param file File path
 * @param base Base path
 * @returns Whether the path is a Ruby file or not.
 */
export function isRubyScript(file: string, base?: string): boolean {
  // Resolves path
  let path = base ? pathResolve.join(base, file) : file;
  // Checks if path exists
  if (!fs.existsSync(path)) {
    return false;
  }
  // Checks if path is a file
  if (!fs.statSync(path).isFile()) {
    return false;
  }
  // Checks file extension
  if (!(pathResolve.extname(path).toLowerCase() === '.rb')) {
    return false;
  }
  return true;
}

/**
 * Checks if the given ``file`` is actually a folder containing ruby files.
 *
 * If a ``base`` path is given, it is joined with the given ``file`` before the check.
 * @param folder Folder path
 * @param base Base path
 * @returns Whether the path is a valid folder or not.
 */
export function isRubyFolder(folder: string, base?: string): boolean {
  // Resolves path
  let path = base ? pathResolve.join(base, folder) : folder;
  // Checks if path exists
  if (!fs.existsSync(path)) {
    return false;
  }
  // Checks if path is a directory
  if (!fs.statSync(path).isDirectory()) {
    return false;
  }
  // Checks if it has (at least) a ruby script
  let rubyScripts = directories.readDirectory(
    path,
    { recursive: false },
    (entries) => {
      return entries.filter((entry) => isRubyScript(entry));
    }
  );
  if (rubyScripts.length <= 0) {
    return false;
  }
  return true;
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
 * Checks if the scripts extraction process from the given ``bundle`` file is valid or not.
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
 * Generates a number for a script's section.
 *
 * The generated section won't be any of the given list of sections IDs.
 * @param sections List of sections IDs
 * @returns A valid section
 */
function generateScriptSection(sections: number[]): number {
  let section = 0;
  do {
    section = Math.floor(Math.random() * SECTION_MAX_VAL);
  } while (sections.includes(section));
  return section;
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
  } else {
    // Code already contains encoding comment
    script = scriptCode;
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
