import * as path from 'path';
import * as fs from 'fs';
import * as configuration from './Configuration';
import * as pathResolve from './PathResolve';

/**
 * Creates the external script folder if it does not exists
 */
export function createScriptFolder(): void {
  let scriptsFolder = configuration.config.determineScriptsFolderPath();
  if (scriptsFolder) {
    if (!fs.existsSync(scriptsFolder)) {
      fs.mkdirSync(scriptsFolder, {
        recursive: true,
      });
    }
  }
}

/**
 * Creates a back up of the given file at the back up folder location.
 *
 * This method creates the back up folder path if it does not exists
 *
 * The back up gets the current date appended and the extension changed to '.bak'.
 * @param filePath Full path to the file
 */
export function createBackUp(filePath: string) {
  let backUpsFolder = configuration.config.determineBackUpsFolderPath();
  if (fs.existsSync(filePath) && backUpsFolder) {
    // Makes sure directory exists
    if (!fs.existsSync(backUpsFolder)) {
      fs.mkdirSync(backUpsFolder, { recursive: true });
    }
    // Copy file
    let backUpPath = pathResolve.join(
      backUpsFolder,
      `${path.basename(filePath)} - ${currentDate()}.bak`
    );
    fs.copyFileSync(filePath, backUpPath);
  }
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
