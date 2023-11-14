import * as path from 'path';
import * as vscode from 'vscode';

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
