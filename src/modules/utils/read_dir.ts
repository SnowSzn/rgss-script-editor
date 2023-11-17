import * as fs from 'fs';
import * as pathResolve from './path_resolve';

/**
 * Reads the given directory.
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
export function readDir(base: string, absolute = false): string[] {
  let elements: string[] = [];
  fs.readdirSync(base).forEach((value) => {
    if (absolute) {
      let valuePath = pathResolve.join(base, value);
      elements = elements.concat(valuePath);
    } else {
      elements = elements.concat(value);
    }
  });
  return elements;
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
export function readDirRecursive(base: string, absolute = false): string[] {
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
