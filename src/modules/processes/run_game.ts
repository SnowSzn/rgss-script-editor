import * as cp from 'child_process';
import * as fs from 'fs';
import * as pathResolve from '../utils/path_resolve';

/**
 * Options to run an executable
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
  /**
   * Optional flag to use Wine or not (Linux only)
   *
   * This flag is ignored for Windows.
   */
  useWine?: boolean;
};

/**
 * Asynchronously runs the given executable with the given options.
 *
 * If the execution is successful it resolves the promise with the child process.
 *
 * If the execution fails it rejects the promise with an error instance.
 * @param executableName Executable path
 * @param runOptions Run options
 * @returns A child process instance
 */
export async function runExecutable(
  executableName: string,
  runOptions: RunOptions
): Promise<cp.ChildProcess> {
  let executable = pathResolve.join(runOptions.cwd, executableName);
  let exeFinalPath = '';
  let exeFinalArgs = [];
  // Checks if the executable exists
  if (!fs.existsSync(executable)) {
    throw new Error(
      `The path to the executable: '${executable}' does not exists!`
    );
  }
  // Run executable OS-based
  switch (process.platform) {
    case 'win32': {
      exeFinalPath = executableName;
      exeFinalArgs = runOptions.args ?? [];
      break;
    }
    case 'darwin':
    case 'linux': {
      // Checks for Wine usage
      if (runOptions.useWine) {
        if (isWineInstalled()) {
          // Use Wine to run executable
          exeFinalPath = 'wine';
          exeFinalArgs = [executableName, ...(runOptions.args ?? [])];
          break;
        } else {
          // Wine is not installed!
          throw new Error(
            `It is impossible to run the executable on Linux using Wine if Wine is not installed, you must install Wine first on your system.`
          );
        }
      } else {
        // Wine won't be used, check if executable is valid first
        if (pathResolve.extname(executableName).toLowerCase() === '.exe') {
          throw new Error(
            'The executable trying to run seems a Windows EXE file and Wine usage is disabled!'
          );
        } else {
          // Assume it is a Linux executable
          exeFinalPath = executableName;
          exeFinalArgs = runOptions.args ?? [];
          break;
        }
      }
    }
    default: {
      throw new Error(
        `Cannot launch executable because the platform: '${process.platform}' is not supported!`
      );
    }
  }
  let gameProcess = cp.execFile(
    pathResolve.resolve(exeFinalPath),
    exeFinalArgs,
    {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      cwd: runOptions.cwd,
      shell: true,
    }
  );
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
