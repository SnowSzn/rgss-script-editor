import * as cp from 'child_process';
import * as fs from 'fs';

/**
 * Options to run a executable
 */
export type RunOptions = {
  /**
   * Working directory for the new process
   */
  cwd: string;
  /**
   * Optional arguments for the new process
   */
  args?: string[];
};

/**
 * Asynchronously runs the given executable with the given options.
 *
 * If the execution is successful it resolves the promise with the child process.
 *
 * If the execution fails it rejects the promise with an error instance.
 * @param executablePath Absolute path to the executable
 * @param runOptions Run options
 * @returns A child process instance
 */
export async function runExecutable(
  executablePath: string,
  runOptions: RunOptions
): Promise<cp.ChildProcess> {
  // Checks if the executable exists
  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `The path to the executable: '${executablePath}' does not exists!`
    );
  }
  // Run executable OS-based
  let exePath = '';
  let exeArgs = [];
  switch (process.platform) {
    case 'win32': {
      exePath = executablePath;
      exeArgs = runOptions.args ?? [];
      break;
    }
    case 'darwin':
    case 'linux': {
      if (isWineInstalled()) {
        exePath = 'wine';
        exeArgs = [executablePath, ...(runOptions.args ?? [])];
        break;
      } else {
        throw new Error(
          `It is impossible to run the game on linux-based system if wine is not installed`
        );
      }
    }
    default: {
      throw new Error(
        `Cannot launch executable because the platform: '${process.platform}' is not supported!`
      );
    }
  }
  let gameProcess = cp.spawn(exePath, exeArgs, {
    detached: true,
    cwd: runOptions.cwd,
    stdio: 'ignore',
  });
  return gameProcess;
}

/**
 * Checks for Wine availability specific for Linux-based systems.
 * @returns Whether wine is installed or not.
 */
function isWineInstalled(): boolean {
  let isInstalled = false;
  try {
    const stdout = cp.execSync('wine --version').toString() ?? '';
    isInstalled = stdout.startsWith('wine') ? true : false;
  } catch (error: any) {
    isInstalled = false;
  }
  return isInstalled;
}
