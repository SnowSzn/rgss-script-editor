import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as filesys from '../utils/filesystem';
import { Configuration } from '../utils/configuration';
import { logger } from '../utils/logger';

/**
 * Game exception regular expression.
 *
 * Extracts the file, line and the message with a three group matches.
 */
const GAME_EXCEPTION_REGEXP = /(.*):(\d+):(.*)/;

/**
 * Exception backtrace information class.
 */
class GameExceptionBacktrace {
  /**
   * Absolute path to the file.
   *
   * This is the file that caused the exception.
   */
  readonly file: string;

  /**
   * Line where the exception ocurred.
   */
  readonly line: number;

  /**
   * Backtrace message.
   */
  readonly message: string;

  /**
   * Constructor
   * @param file File absolute path.
   * @param line Line number.
   * @param message Message.
   */
  constructor(file: string, line: number, message: string) {
    this.file = file;
    this.line = line;
    this.message = message;
  }

  /**
   * Converts the backtrace into a string instance.
   * @returns A string.
   */
  toString(): string {
    return `${this.file}\n    at line ${this.line}: ${this.message}`;
  }
}

/**
 * Game exception class.
 */
export class GameException {
  /**
   * Exception name.
   */
  readonly name: string;

  /**
   * Backtrace list.
   */
  readonly backtrace: GameExceptionBacktrace[];

  /**
   * Constructor
   * @param name Exception name.
   */
  constructor(name: string) {
    this.name = name;
    this.backtrace = [];
  }

  /**
   * Adds a new backtrace element with the given information.
   * @param file File absolute path.
   * @param line Line number.
   * @param message Message.
   */
  add(file: string, line: number, message: string) {
    this.backtrace.push(new GameExceptionBacktrace(file, line, message));
  }

  /**
   * Formats this extension to show itself on a VSCode text document.
   * @returns Exception doc info.
   */
  document(): string {
    return (
      'RGSS Script Editor: Last game exception report\n\n' +
      'This document is used to show information about the las exception reported\n' +
      'by the game executable in the last game session.\n' +
      'If you do not want this tab to appear, you can disable it on the extension settings page.\n' +
      'The exception information will be shown in the following lines:\n\n' +
      this.toString()
    );
  }

  /**
   * Converts the exception into a string instance.
   * @returns A string.
   */
  toString(): string {
    let error = `Game exception: ${this.name}\n`;
    this.backtrace.forEach((info) => {
      error = error.concat(`  from: ${info.toString()}\n`);
    });
    return error;
  }
}

/**
 * Gameplay controller class.
 */
export class GameplayController {
  /**
   * Game execution output file name.
   *
   * This file is created by the game when an exception kills the process.
   *
   * The exception's name and the backtrace are written inside of it.
   */
  static readonly GAME_OUTPUT_FILE = '.rgss-script-editor-game.log';

  /**
   * Extension configuration instance.
   */
  private _config: Configuration | undefined;

  /**
   * Executable process.
   */
  private _executable: cp.ChildProcess | undefined;

  /**
   * Executable last exception.
   */
  private _lastException: GameException | undefined;

  /**
   * Constructor.
   */
  constructor() {
    this._config = undefined;
    this._executable = undefined;
    this._lastException = undefined;
  }

  /**
   * Gets the last exception instance that the game executable reported.
   *
   * If the game did not report any exception it returns ``undefined``.
   * @returns The last exception.
   */
  public get lastException(): GameException | undefined {
    return this._lastException;
  }

  /**
   * Updates the extension configuration instance.
   *
   * The given ``configuration`` instance must be valid.
   * @param config Configuration instance.
   */
  update(config: Configuration) {
    if (config.isValid()) {
      // Make sure to dispose so info does not mix up between projects
      this.dispose();
      this._config = config;
    } else {
      this._config = undefined;
    }
  }

  /**
   * Disposes this gameplay controller instance.
   *
   * This method kills the executable if it is running.
   *
   * To avoid invalid exception processing it sets the last exception to ``undefined``.
   */
  dispose() {
    this._executable?.kill();
    this._lastException = undefined;
  }

  /**
   * Asynchronously runs the game executable.
   *
   * If the game is spawned successfully it resolves the promise with its PID.
   *
   * If the game fails to run it rejects the promise with an error.
   * @returns A promise
   */
  async runGame() {
    logger.logInfo('Trying to run the game executable...');
    // Checks for configuration validness
    if (!this._config) {
      throw new Error('Cannot run the game because configuration is invalid!');
    }
    // Checks if executable is already running.
    if (this._executable !== undefined) {
      throw new Error('Cannot run the game because it is already running!');
    }
    // Preparation
    let workingDir = this._config.projectFolderPath?.fsPath;
    let gamePath = this._config.gameExePath?.fsPath;
    let gameArgs = this._config.determineGameArgs();
    let exePath = '';
    let exeArgs = [];
    logger.logInfo(`Game working directory: '${workingDir}'`);
    logger.logInfo(`Game executable path: '${gamePath}'`);
    logger.logInfo(`Game executable arguments: '${gameArgs}'`);
    // Safe-check for variables validness
    if (!workingDir || !gamePath || !gameArgs) {
      throw new Error('Cannot run the game due to invalid values!');
    }
    logger.logInfo(`Resolving game information based on platform...`);
    // Run executable OS-based
    switch (process.platform) {
      case 'win32': {
        exePath = `"${gamePath}"`;
        exeArgs = gameArgs;
        break;
      }
      case 'darwin':
      case 'linux': {
        // Checks for Wine usage
        if (this._config.configUseWine()) {
          if (!this._isWineInstalled()) {
            // Wine is not installed!
            throw new Error(
              `It is impossible to run the executable on Linux using Wine if Wine is not installed, you must install Wine first on your system.`
            );
          }
          // Use Wine to run executable
          exePath = 'wine';
          exeArgs = [`"${gamePath}"`, ...gameArgs];
        } else {
          // Wine won't be used, check if executable is valid first
          if (gamePath.toLowerCase().endsWith('.exe')) {
            throw new Error(
              'Cannot launch the game because the game executable seems like a Windows EXE file and Wine usage is disabled!'
            );
          } else {
            // Just assume it is a Linux executable.
            exePath = `"${gamePath}"`;
            exeArgs = gameArgs;
          }
        }
        break;
      }
      default: {
        throw new Error(
          `Cannot launch the game because the platform: '${process.platform}' is unknown or not supported!`
        );
      }
    }
    logger.logInfo(`Resolved process command: '${exePath}'`);
    logger.logInfo(`Resolved process arguments: '${exeArgs}'`);
    logger.logInfo('Spawning process...');
    // Process should not be piped because if 'console' is passed as an argument to a RGSS3
    // executable, when the process spawns, it redirects $stderr to the console window.
    // Making it impossible for the extension to listen to $stderr.
    this._executable = cp.spawn(exePath, exeArgs, {
      cwd: workingDir,
      stdio: ['ignore', 'ignore', 'ignore'],
      shell: true,
    });
    // Prepares callbacks
    this._executable.on('exit', (code, signal) =>
      this._onProcessExit(code, signal)
    );
    return this._executable.pid;
  }

  /**
   * Method called when the current game process finishes its execution.
   * @param code Exit code.
   * @param signal Exit signal.
   */
  private _onProcessExit(code: number | null, signal: NodeJS.Signals | null) {
    if (this._config) {
      logger.logInfo(
        `Game execution finished with code: ${code}, signal: ${signal}`
      );
      // Checks output file for possible exceptions that killed the game
      let output = this._config.joinProject(
        GameplayController.GAME_OUTPUT_FILE
      )?.fsPath;
      if (output && filesys.isFile(output)) {
        // If file exists, an exception ocurred in the last game session
        let contents = filesys.readTextFile<string[]>(output, (contents) => {
          return contents.split('\n');
        });
        let name = contents[0];
        let backtrace = JSON.parse(contents[1]) as string[];
        let exception = new GameException(name);
        backtrace.forEach((info) => {
          let match = info.match(GAME_EXCEPTION_REGEXP);
          if (match) {
            let file = match[1];
            let line = parseInt(match[2]);
            let mesg = match[3];
            // Skips invalid backtrace lines, only files that exists.
            // RPG Maker includes backtrace lines of scripts inside its built-in editor.
            if (filesys.isRubyFile(file)) {
              exception.add(file, line, mesg);
            }
          }
        });
        // Updates last exception.
        this._lastException = exception;
        // Deletes output for next game run
        filesys.remove(output);
        // Executes command to process the exception if auto-process config is enabled.
        if (this._config.configGameErrorAutoProcess()) {
          vscode.commands.executeCommand(
            'rgss-script-editor.processGameException'
          );
        }
      }
    }
    // Resets for next game run
    this._executable = undefined;
  }

  /**
   * Checks for Wine availability specific for Linux-based systems.
   * @returns Whether wine is installed or not.
   */
  private _isWineInstalled(): boolean {
    let isInstalled = false;
    try {
      const stdout = cp.execSync('wine --version').toString() ?? '';
      isInstalled = stdout.startsWith('wine') ? true : false;
    } catch (error: any) {
      isInstalled = false;
    }
    return isInstalled;
  }
}
