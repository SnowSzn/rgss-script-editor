import * as fs from 'fs';
import * as vscode from 'vscode';
import * as pathResolve from './PathResolve';
import { RGSSBundleScriptsPath } from './Configuration';

/**
 * Checks if the given folder is a valid RPG Maker project folder for this extension
 * @param folder Folder Uri path
 * @returns Whether it is a valid RPG Maker project folder or not
 */
export function checkFolderValidness(folder: vscode.Uri): boolean {
  let rgss1 = pathResolve.joinUri(folder, RGSSBundleScriptsPath.RGSS1);
  let rgss2 = pathResolve.joinUri(folder, RGSSBundleScriptsPath.RGSS2);
  let rgss3 = pathResolve.joinUri(folder, RGSSBundleScriptsPath.RGSS3);
  for (let data of [rgss1, rgss2, rgss3]) {
    if (fs.existsSync(data)) {
      return true;
    }
  }
  return false;
}
