import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Parses the given path.
 * @param urifPath Uri path or string path
 * @returns Parsed path.
 */
export function parse(rPath: vscode.Uri | string) {
  switch (process.platform) {
    case 'win32':
      if (rPath instanceof vscode.Uri) {
        return path.win32.parse(rPath.fsPath);
      } else {
        return path.win32.parse(rPath);
      }
    case 'darwin':
    case 'linux':
      if (rPath instanceof vscode.Uri) {
        return path.posix.parse(rPath.fsPath);
      } else {
        return path.posix.parse(rPath);
      }
    default:
      if (rPath instanceof vscode.Uri) {
        return path.parse(rPath.fsPath);
      } else {
        return path.parse(rPath);
      }
  }
}

/**
 * Gets the basename from the given path based on the current platform (OS)
 * @param urifPath Uri path or string path
 * @returns The basename
 */
export function basename(rPath: vscode.Uri | string): string {
  switch (process.platform) {
    case 'win32':
      if (rPath instanceof vscode.Uri) {
        return path.win32.basename(rPath.fsPath);
      } else {
        return path.win32.basename(rPath);
      }
    case 'darwin':
    case 'linux':
      if (rPath instanceof vscode.Uri) {
        return path.posix.basename(rPath.fsPath);
      } else {
        return path.posix.basename(rPath);
      }
    default:
      if (rPath instanceof vscode.Uri) {
        return path.basename(rPath.fsPath);
      } else {
        return path.basename(rPath);
      }
  }
}

/**
 * Gets the directory name from the given path based on the current platform (OS)
 * @param urifPath Uri path or string path
 * @returns The directory name
 */
export function dirname(rPath: vscode.Uri | string): string {
  switch (process.platform) {
    case 'win32':
      if (rPath instanceof vscode.Uri) {
        return path.win32.dirname(rPath.fsPath);
      } else {
        return path.win32.dirname(rPath);
      }
    case 'darwin':
    case 'linux':
      if (rPath instanceof vscode.Uri) {
        return path.posix.dirname(rPath.fsPath);
      } else {
        return path.posix.dirname(rPath);
      }
    default:
      if (rPath instanceof vscode.Uri) {
        return path.dirname(rPath.fsPath);
      } else {
        return path.dirname(rPath);
      }
  }
}

/**
 * Gets the extension of the given path.
 * @param urifPath Uri path or string path
 * @returns The file extension
 */
export function extname(rPath: vscode.Uri | string): string {
  switch (process.platform) {
    case 'win32':
      if (rPath instanceof vscode.Uri) {
        return path.win32.extname(rPath.fsPath);
      } else {
        return path.win32.extname(rPath);
      }
    case 'darwin':
    case 'linux':
      if (rPath instanceof vscode.Uri) {
        return path.posix.extname(rPath.fsPath);
      } else {
        return path.posix.extname(rPath);
      }
    default:
      if (rPath instanceof vscode.Uri) {
        return path.extname(rPath.fsPath);
      } else {
        return path.extname(rPath);
      }
  }
}

/**
 * Gets the relative path between the two given paths.
 * @param rPathFrom From path
 * @param rPathTo To path
 * @returns Returns the relative path
 */
export function relative(
  rPathFrom: vscode.Uri | string,
  rPathTo: vscode.Uri | string
): string {
  let from = rPathFrom instanceof vscode.Uri ? rPathFrom.fsPath : rPathFrom;
  let to = rPathTo instanceof vscode.Uri ? rPathTo.fsPath : rPathTo;
  switch (process.platform) {
    case 'win32':
      return path.win32.relative(from, to);
    case 'darwin':
    case 'linux':
      return path.posix.relative(from, to);
    default:
      return path.posix.relative(from, to);
  }
}

/**
 * Normalizes the given path based on the current platform (OS)
 * @param urifPath Uri path or string path
 * @returns The resolved path
 */
export function resolve(rPath: vscode.Uri | string): string {
  switch (process.platform) {
    case 'win32':
      if (rPath instanceof vscode.Uri) {
        return path.win32.normalize(rPath.fsPath);
      } else {
        return path.win32.normalize(rPath);
      }
    case 'darwin':
    case 'linux':
      if (rPath instanceof vscode.Uri) {
        return path.posix.normalize(rPath.fsPath);
      } else {
        return path.posix.normalize(rPath);
      }
    default:
      if (rPath instanceof vscode.Uri) {
        return path.normalize(rPath.fsPath);
      } else {
        return path.normalize(rPath);
      }
  }
}

/**
 * Normalizes the given path for RPG Maker editor
 * @param urifPath Uri path or string path
 * @returns The resolved path
 */
export function resolveRPG(rPath: vscode.Uri | string): string {
  if (rPath instanceof vscode.Uri) {
    return path.posix.normalize(rPath.fsPath);
  } else {
    return path.posix.normalize(rPath);
  }
}

/**
 * Joins the given path based on the current platform (OS)
 * @param urifPath Uri path or string path
 * @param paths List of paths to join
 * @returns The joined path
 */
export function join(rPath: vscode.Uri | string, ...paths: string[]): string {
  switch (process.platform) {
    case 'win32':
      if (rPath instanceof vscode.Uri) {
        return path.win32.join(rPath.fsPath, ...paths);
      } else {
        return path.win32.join(rPath, ...paths);
      }
    case 'darwin':
    case 'linux':
      if (rPath instanceof vscode.Uri) {
        return path.posix.join(rPath.fsPath, ...paths);
      } else {
        return path.posix.join(rPath, ...paths);
      }
    default:
      if (rPath instanceof vscode.Uri) {
        return path.join(rPath.fsPath, ...paths);
      } else {
        return path.join(rPath, ...paths);
      }
  }
}

/**
 * Joins the given path for RPG Maker editor
 * @param urifPath Uri path or string path
 * @param paths List of paths to join
 * @returns The joined path
 */
export function joinRPG(
  rPath: vscode.Uri | string,
  ...paths: string[]
): string {
  if (rPath instanceof vscode.Uri) {
    return path.posix.join(rPath.fsPath, ...paths);
  } else {
    return path.posix.join(rPath, ...paths);
  }
}

/**
 * Gets the directory separator character based on the OS.
 * @returns The directory separator
 */
export function separator(): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.sep;
    case 'darwin':
    case 'linux':
      return path.posix.sep;
    default:
      return path.sep;
  }
}
