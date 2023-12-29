import * as path from 'path';
import * as fs from 'fs';

/**
 * Base options.
 */
export type Options = {
  /**
   * Recursive flag.
   */
  recursive?: boolean;
};

/**
 * Read options.
 */
export type ReadOptions = {
  /**
   * Relative flag.
   *
   * Formats all entries to be relative of the given directory.
   */
  relative?: boolean;
} & Options;

/**
 * Write options.
 */
export type WriteOptions = {
  /**
   * Overwrite flag.
   */
  overwrite?: boolean;
} & Options;

/**
 * Checks if the given folder path is a directory or not.
 * @param folder Folder path
 * @returns Whether path is a directory.
 */
export function isFolder(folder: string): boolean {
  // Checks if path exists.
  if (!fs.existsSync(folder)) {
    return false;
  }
  // Checks if file is a directory.
  return fs.statSync(folder).isDirectory();
}

/**
 * Checks if the given file path is a file or not.
 * @param file File path
 * @returns Whether path is a file.
 */
export function isFile(file: string): boolean {
  // Checks if path exists.
  if (!fs.existsSync(file)) {
    return false;
  }
  // Checks if file is actually a file.
  return fs.statSync(file).isFile();
}

/**
 * Checks if the given file path is a Ruby script file or not.
 * @param file File path
 * @returns Whether path is a Ruby file.
 */
export function isRubyFile(file: string): boolean {
  // Checks if it is a file.
  if (!isFile(file)) {
    return false;
  }
  // Checks if file is a Ruby script.
  return path.extname(file).toLowerCase() === '.rb';
}

/**
 * Checks if the given folder path is a directory or not.
 *
 * This function won't check for the file existence.
 * @param folder Folder path
 * @returns Whether path is a directory.
 */
export function isFolderLike(folder: string): boolean {
  // Checks if file is a directory.
  return path.extname(folder) === '';
}

/**
 * Checks if the given file path is a file or not.
 *
 * This function won't check for the file existence.
 * @param file File path
 * @returns Whether path is a file.
 */
export function isFileLike(file: string): boolean {
  // Checks if file is actually a file.
  return path.extname(file) !== '';
}

/**
 * Checks if the given file path is a Ruby script file or not.
 *
 * This function won't check for the file existence.
 * @param file File path
 * @returns Whether path is a Ruby file.
 */
export function isRubyFileLike(file: string): boolean {
  // Checks if file is a Ruby script.
  return path.extname(file).toLowerCase() === '.rb';
}

/**
 * Creates a folder in the given path.
 * @param folderPath Path to the folder.
 * @param options Options.
 */
export function createFolder(folderPath: string, options?: WriteOptions) {
  if (!fs.existsSync(folderPath) || options?.overwrite) {
    fs.mkdirSync(folderPath, { recursive: options?.recursive });
  }
}

/**
 * Copies the file located in ``source`` to ``destination``.
 *
 * If the file already exists it throws an error if ``overwrite`` flag is disabled.
 *
 * If ``recursive`` flag is enabled it will create the destination directory if it does not exists.
 * @param source Source file path
 * @param destination Destination file path
 * @param options Options.
 */
export function copyFile(
  source: string,
  destination: string,
  options?: WriteOptions
) {
  let destinationPath = path.dirname(destination);
  // Create directory if possible
  if (!fs.existsSync(destinationPath) && options?.recursive) {
    createFolder(destinationPath, options);
  }
  // Copy file
  fs.copyFileSync(
    source,
    destination,
    options?.overwrite ? undefined : fs.constants.COPYFILE_EXCL
  );
}

/**
 * Reads all entries of the given directory specified by ``base``.
 *
 * Optionally, some options ({@link ReadOptions ``ReadOptions``}) can be given that changes the behavior of this function.
 *
 * A callback function can be given to handle the entries before returning them.
 *
 * If the given directory does not exists it raises an exception.
 * @param base Base directory
 * @param options Read options
 * @param filter Filter callback
 * @returns List of entries
 */
export function readDirectory(
  base: string,
  options?: ReadOptions,
  filter?: (entries: string[]) => string[]
): string[] {
  // Gets data (absolute paths)
  let entries = readDir(base, options?.recursive);
  // Process relative flag
  if (options?.relative) {
    entries = entries.map((entry) => {
      return path.relative(base, entry);
    });
  }
  // Returns data
  return filter ? filter(entries) : entries;
}

/**
 * Reads the given directory.
 *
 * If ``recursive`` flag is enabled it will read all subfolders of the directory.
 * @param base Base directory
 * @param recursive Recursive flag
 * @returns List of entries
 */
function readDir(base: string, recursive?: boolean) {
  let entries: string[] = [];
  fs.readdirSync(base).forEach((entry) => {
    let fullPath = path.join(base, entry);
    // Inserts entry
    entries.push(fullPath);
    // Process recursiveness
    if (fs.statSync(fullPath).isDirectory() && recursive) {
      entries = entries.concat(...readDir(fullPath, recursive));
    }
  });
  return entries;
}
