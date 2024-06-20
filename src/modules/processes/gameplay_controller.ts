import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as marshal from '@hyrious/marshal';
import { TextDecoder } from 'util';
import { Configuration, RunGameBehavior } from '../utils/configuration';
import { logger } from '../utils/logger';

/**
 * Ruby exception information type.
 *
 * The game process must format the exception to match this structure.
 */
type RubyExceptionInfo = {
  /**
   * Ruby exception type and name.
   */
  type: any;

  /**
   * Ruby exception message.
   */
  mesg: any;

  /**
   * Ruby exception backtrace list.
   */
  back: any[];
};

/**
 * Game exception regular expression.
 *
 * Extracts the file, line and the message with a three group matches.
 *
 * If the message is not present, the third group will be ``undefined``.
 */
const GAME_EXCEPTION_REGEXP = /(.*):(\d+)(?::(.*))?/;

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
  readonly message?: string;

  /**
   * Constructor.
   * @param file File absolute path.
   * @param line Line number.
   * @param message Optional message.
   */
  constructor(file: string, line: number, message?: string) {
    this.file = file;
    this.line = line;
    this.message = message;
  }

  /**
   * Converts the backtrace into a string instance.
   *
   * If the backtrace message is available it will be appended.
   * @returns A string.
   */
  toString(): string {
    return this.message
      ? `${this.file}\nat line ${this.line}: ${this.message}`
      : `${this.file}\nat line ${this.line}`;
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
   * Exception message.
   */
  readonly message: string;

  /**
   * Exception creation timestamp.
   */
  readonly timestamp: Date;

  /**
   * Backtrace list.
   */
  readonly backtrace: GameExceptionBacktrace[];

  /**
   * Constructor.
   * @param name Exception name.
   * @param message Exception message.
   */
  constructor(name: string, message: string) {
    this.name = name;
    this.message = message;
    this.timestamp = new Date();
    this.backtrace = [];
  }

  /**
   * Adds a new backtrace element with the given information.
   * @param file File absolute path.
   * @param line Line number.
   * @param message Optional message.
   */
  addTrace(file: string, line: number, message?: string) {
    this.backtrace.push(new GameExceptionBacktrace(file, line, message));
  }

  /**
   * Formats this extension to show itself on a VSCode Markdown document.
   * @returns Exception information.
   */
  markdown(): string {
    // Document title
    let mark = '**RGSS Script Editor: Last Game Exception Report**\n\n';
    // Document information
    mark = mark.concat(
      'This document is used to display information about the exception that was thrown in the last game session.\n\n'
    );
    mark = mark.concat(
      'If you do not want this tab to appear in the editor, you can disable it in the extension options.\n\n'
    );
    mark = mark.concat(
      'The exception thrown will be shown in the following lines:\n\n'
    );
    // Document exception display
    mark = mark.concat(`# ${this.name}\n\n`);
    mark = mark.concat(`${this.message}\n\n`);
    mark = mark.concat('#### Timestamp\n\n');
    mark = mark.concat(`${this.timestamp}\n\n`);
    mark = mark.concat('#### Backtrace\n\n');
    this.backtrace.forEach((item) => {
      mark = mark.concat('```\n');
      mark = mark.concat(item.toString() + '\n');
      mark = mark.concat('```\n');
    });
    return mark;
  }

  /**
   * Converts the exception into a string instance.
   * @returns A string.
   */
  toString(): string {
    return `${this.name}: ${this.message}\n`;
  }
}

/**
 * Gameplay controller class.
 */
export class GameplayController {
  /**
   * Extension configuration instance.
   */
  private _config?: Configuration;

  /**
   * Executable last exception.
   */
  private _lastException?: GameException;

  /**
   * Executable processes.
   */
  private _executables: Map<number, cp.ChildProcess>;

  /**
   * Text decoder instance.
   */
  private _textDecoder: TextDecoder;

  /**
   * Constructor.
   */
  constructor() {
    this._config = undefined;
    this._lastException = undefined;
    this._executables = new Map();
    this._textDecoder = new TextDecoder('utf8');
  }

  /**
   * Gets the last exception instance that the game executable reported.
   *
   * If the game did not report any exception it returns ``undefined``.
   * @returns The last exception.
   */
  get lastException() {
    return this._lastException;
  }

  /**
   * Gets if the game executable is currently running
   * @returns Whether it is running or not
   */
  isRunning(): boolean {
    return this._executables.size > 0;
  }

  /**
   * Updates the extension configuration instance.
   *
   * The given ``configuration`` instance must be valid.
   * @param config Configuration instance.
   */
  update(config: Configuration) {
    // Make sure to dispose so info does not mix up between projects
    this.dispose();
    this._config = config;
  }

  /**
   * Disposes this gameplay controller instance.
   *
   * This method kills the executable if it is running (not undefined).
   *
   * To avoid invalid exception processing it sets the last exception to ``undefined``.
   *
   * The promise is resolved with the termination code
   */
  async dispose() {
    return new Promise<void>((resolve, reject) => {
      // Checks if there is any game process currently running
      if (!this.isRunning()) {
        resolve();
      }

      // Kill all game processes and clear the hash tracker
      this._executables.forEach((gameProcess) => {
        gameProcess.kill();
      });

      // Clears attributes and resolve
      this._executables.clear();
      this._lastException = undefined;
      resolve();
    });
  }

  /**
   * Asynchronously runs the game executable.
   *
   * If the game is spawned successfully it resolves the promise with its PID.
   *
   * If the game fails to run it rejects the promise with an error.
   * @returns A promise
   * @throws An error when process cannot be executed
   */
  async runGame() {
    logger.logInfo('Trying to run the game executable...');
    // Checks for configuration validness
    if (!this._config) {
      throw new Error('Cannot run the game because configuration is invalid!');
    }
    // Checks if already running.
    if (this.isRunning()) {
      let gameBehavior = this._config.determineGameBehavior();
      logger.logInfo(`Current game behavior: ${gameBehavior}`);

      // Process game behavior
      switch (gameBehavior) {
        case RunGameBehavior.NOTHING:
          throw new Error('Cannot run the game because it is already running!');
        case RunGameBehavior.KILL_AND_RUN:
          await this.dispose();
          break;
        case RunGameBehavior.ALLOW_MULTIPLE:
          break;
        default:
          throw new Error('Unknown run game behavior!');
      }
    }

    // Preparation
    let workingDir = this._config.projectFolderPath?.fsPath;
    let gamePath = this._config.determineGamePath()?.fsPath;
    let gameArgs = this._config.determineGameArgs();
    let exePath = '';
    let exeArgs = [];
    let usingWine = false;
    logger.logInfo(`Game working directory: "${workingDir}"`);
    logger.logInfo(`Game executable path: "${gamePath}"`);
    logger.logInfo(`Game executable arguments: "${gameArgs}"`);

    // Safe-check for variables validness
    if (!workingDir || !gamePath || !gameArgs) {
      throw new Error('Cannot run the game due to invalid values!');
    }
    // Checks if executable path exists
    if (!fs.existsSync(gamePath)) {
      throw new Error(`Game executable path: "${gamePath}" does not exists!`);
    }

    // Determine info based on the OS
    logger.logInfo(`Resolving game information based on platform...`);
    switch (process.platform) {
      case 'win32': {
        exePath = gamePath;
        exeArgs = gameArgs;
        break;
      }
      case 'darwin':
      case 'linux': {
        // Checks game executable
        if (this._isLinuxExecutable(gamePath)) {
          // It is a Linux executable, try to run it
          exePath = gamePath;
          exeArgs = gameArgs;
        } else {
          // It is likely that the game is a Windows executable, use Wine
          const wineCommand = this._config.configUseWine();
          if (wineCommand.length > 0) {
            exePath = wineCommand;
            exeArgs = [`"${gamePath}"`, ...gameArgs];
            usingWine = true;
          } else {
            throw new Error(
              'Cannot run the game because it seems like a Windows executable and the command to run Wine is empty, check the extension settings to fix this'
            );
          }
        }
        break;
      }
      default: {
        throw new Error(
          `Cannot launch the game because the platform: "${process.platform}" is unknown or not supported!`
        );
      }
    }

    // Launch game process
    logger.logInfo(`Resolved process command: "${exePath}"`);
    logger.logInfo(`Resolved process arguments: "${exeArgs}"`);
    logger.logInfo('Spawning process...');
    // Process should not be piped because if 'console' is passed as an argument to a RGSS3
    // executable, when the process spawns, it redirects $stdout and $stderr to the console window.
    // Making it impossible for the extension to listen to either $stdout or $stderr.
    const gameProcess = cp.spawn(exePath, exeArgs, {
      cwd: workingDir,
      stdio: ['ignore', 'ignore', 'ignore'],
      shell: usingWine,
    });

    // Checks if the process spawned correctly
    if (gameProcess && gameProcess.pid) {
      // Prepares callbacks
      gameProcess.on('exit', (code, signal) =>
        this._onProcessExit(gameProcess.pid!, code, signal)
      );

      // Tracks the game process
      this._executables.set(gameProcess.pid, gameProcess);

      return gameProcess.pid;
    } else {
      return undefined;
    }
  }

  /**
   * Creates a ruby exception object from the given exception file
   * @param exceptionFilePath Exception file path
   * @throws An error if file does not exists
   * @throws An error if it is impossible to create a ruby exception object
   */
  async createException(exceptionFilePath: string) {
    // Checks if the exception file path exists
    if (!fs.existsSync(exceptionFilePath)) {
      throw new Error(
        `Exception file path: "${exceptionFilePath}" does not exists!`
      );
    }

    // If file exists, an exception ocurred in the last game session
    let contents = fs.readFileSync(exceptionFilePath);
    let rubyError = marshal.load(contents, {
      string: 'binary',
      hashSymbolKeysToString: true,
    }) as RubyExceptionInfo;
    // Process exception binary data
    let type = this._textDecoder.decode(rubyError.type);
    let mesg = this._textDecoder.decode(rubyError.mesg);
    let back = rubyError.back.map((item) => this._textDecoder.decode(item));
    // Build the extension error instance
    let exception = new GameException(type, mesg);
    back.forEach((backtrace) => {
      let match = backtrace.match(GAME_EXCEPTION_REGEXP);
      if (match) {
        let file = match[1];
        let line = parseInt(match[2]);
        let mesg = match[3];
        // Skips invalid backtrace lines, only files that exists.
        // RPG Maker includes backtrace lines of scripts inside its built-in editor.
        if (fs.existsSync(file)) {
          exception.addTrace(file, line, mesg);
        }
      }
    });
    // Updates last exception.
    this._lastException = exception;
    // Deletes output for next game run
    fs.unlinkSync(exceptionFilePath);
    // Executes command to process the exception.
    vscode.commands.executeCommand('rgss-script-editor.processGameException');
  }

  /**
   * Method called when the current game process finishes its execution.
   * @param pid Game process PID.
   * @param code Exit code.
   * @param signal Exit signal.
   */
  private _onProcessExit(
    pid: number,
    code: number | null,
    signal: NodeJS.Signals | null
  ) {
    logger.logInfo(
      `Game execution (PID: ${pid}) finished with code: ${code}, signal: ${signal}`
    );

    // Resets for next game run
    this._executables.delete(pid);

    // Checks exception
    if (this._config) {
      // Checks output file for possible exceptions that killed the game
      let output = this._config.determineGameOutputPath()?.fsPath;
      if (output && fs.existsSync(output)) {
        this.createException(output);
      }
    }
  }

  /**
   * Checks If the given file is an executable for Linux
   * @param file File path
   * @returns Whether it is an executable or not.
   */
  private _isLinuxExecutable(file: string): boolean {
    try {
      fs.accessSync(file, fs.constants.X_OK);
      return !(path.extname(file).toLowerCase() === '.exe');
    } catch (error: any) {
      return false;
    }
  }
}
