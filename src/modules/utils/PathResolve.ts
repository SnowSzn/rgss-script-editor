import * as path from 'path';
import * as vscode from 'vscode';

export function basenameUri(urifPath: vscode.Uri): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.basename(urifPath.fsPath);
    case 'darwin':
    case 'linux':
      return path.posix.basename(urifPath.fsPath);
    default:
      return path.basename(urifPath.fsPath);
  }
}

export function basename(fPath: string): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.basename(fPath);
    case 'darwin':
    case 'linux':
      return path.posix.basename(fPath);
    default:
      return path.basename(fPath);
  }
}

export function resolveUri(urifPath: vscode.Uri): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.join(urifPath.fsPath);
    case 'darwin':
    case 'linux':
      return path.posix.join(urifPath.fsPath);
    default:
      return urifPath.fsPath;
  }
}

export function resolve(fPath: string): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.join(fPath);
    case 'darwin':
    case 'linux':
      return path.posix.join(fPath);
    default:
      return fPath;
  }
}

export function joinUri(urifPath: vscode.Uri, ...paths: string[]): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.join(urifPath.fsPath, ...paths);
    case 'darwin':
    case 'linux':
      return path.posix.join(urifPath.fsPath, ...paths);
    default:
      return vscode.Uri.joinPath(urifPath, ...paths).fsPath;
  }
}

export function join(fPath: string, ...paths: string[]): string {
  switch (process.platform) {
    case 'win32':
      return path.win32.join(fPath, ...paths);
    case 'darwin':
    case 'linux':
      return path.posix.join(fPath, ...paths);
    default:
      return path.join(fPath, ...paths);
  }
}
