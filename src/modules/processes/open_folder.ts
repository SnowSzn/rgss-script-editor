import * as cp from 'child_process';
import * as fs from 'fs';

/**
 * Asynchronously opens the given folder.
 *
 * If opening is successful it resolves the promise with the child process.
 *
 * If opening fails it rejects the promise with an error instance.
 * @param folderPath Absolute path to the folder
 * @returns A child process instance
 */
export async function openFolder(folderPath: string): Promise<cp.ChildProcess> {
  // Checks if path exists
  if (!fs.existsSync(folderPath)) {
    throw new Error(`The given folder path: '${folderPath}' does not exists!`);
  }
  // Open folder
  let command = '';
  switch (process.platform) {
    case 'win32': {
      command = `start "RGSS Script Editor" "${folderPath}"`;
      break;
    }
    case 'linux': {
      command = `xdg-open "${folderPath}"`;
      break;
    }
    case 'darwin': {
      command = `open "${folderPath}"`;
      break;
    }
    default: {
      throw new Error(
        `Cannot open folder because the platform: '${process.platform}' is not supported!`
      );
    }
  }
  let folderProcess = cp.exec(command);
  return folderProcess;
}
