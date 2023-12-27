import * as cp from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as marshal from '@hyrious/marshal';
import { TextDecoder } from 'util';
import { Configuration } from '../utils/configuration';
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
    mark = mark.concat(`# ${this.name}\n`);
    mark = mark.concat(`${this.message}\n`);
    mark = mark.concat('##### Backtrace\n');
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
   * Executable process.
   */
  private _executable?: cp.ChildProcess;

  /**
   * Executable last exception.
   */
  private _lastException?: GameException;

  /**
   * Text decoder instance.
   */
  private _textDecoder: TextDecoder;

  /**
   * Constructor.
   */
  constructor() {
    this._config = undefined;
    this._executable = undefined;
    this._lastException = undefined;
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
   */
  dispose() {
    this._executable?.kill();
    this._executable = undefined;
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
    logger.logInfo(`Game working directory: "${workingDir}"`);
    logger.logInfo(`Game executable path: "${gamePath}"`);
    logger.logInfo(`Game executable arguments: "${gameArgs}"`);
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
          `Cannot launch the game because the platform: "${process.platform}" is unknown or not supported!`
        );
      }
    }
    logger.logInfo(`Resolved process command: "${exePath}"`);
    logger.logInfo(`Resolved process arguments: "${exeArgs}"`);
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
      let output = this._config.gameOutputPath?.fsPath;
      if (output) {
        // If file exists, an exception ocurred in the last game session
        let contents = fs.readFileSync(output);
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
        fs.unlinkSync(output);
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
