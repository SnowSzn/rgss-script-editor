import * as fs from 'fs';
import * as pathResolve from './path_resolve';

/**
 * Read options
 */
export type ReadOptions = {
  /**
   * Recursive flag.
   *
   * Allows to read the given directory recursively.
   */
  recursive?: boolean;
  /**
   * Relative flag.
   *
   * Formats all entries to be relative of the given directory.
   */
  relative?: boolean;
};

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
      return pathResolve.relative(base, entry);
    });
  }
  // Returns data
  return filter ? filter(entries) : entries;
}

/**
 * Reads the given directory.
 *
 * If the recursive flag is activated it will read all subfolders of the directory.
 * @param base Base directory
 * @param recursive Recursive flag
 * @returns List of entries
 */
function readDir(base: string, recursive?: boolean) {
  let entries: string[] = [];
  fs.readdirSync(base).forEach((entry) => {
    let fullPath = pathResolve.join(base, entry);
    // Process recursiveness
    if (fs.statSync(fullPath).isDirectory() && recursive) {
      entries = entries.concat(...readDir(fullPath, recursive));
    } else {
      entries.push(fullPath);
    }
  });
  return entries;
}
