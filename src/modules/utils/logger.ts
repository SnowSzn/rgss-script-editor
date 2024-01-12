import * as fs from 'fs';
import * as vscode from 'vscode';
import { Configuration } from './configuration';

/**
 * Extension logger class.
 */
class Logger {
  /**
   * Extension configuration instance.
   */
  private _config?: Configuration;

  /**
   * VSCode log output channel.
   */
  private _output: vscode.OutputChannel;

  /**
   * Constructor.
   */
  constructor() {
    this._config = undefined;
    this._output = vscode.window.createOutputChannel('RGSS Script Editor');
  }

  /**
   * Updates the logger with the given configuration instance.
   *
   * A valid instance is needed for the logger to log information to the log file.
   * @param config Extension configuration instance.
   */
  update(config: Configuration) {
    this._config = config;
    // Clears current output channel contents
    this._output.clear();
    // Deletes old log file
    if (this._config.configLogFile()) {
      this.deleteLogFile();
    }
  }

  /**
   * Deletes the log file of to this logger instance if it exists.
   */
  deleteLogFile(): void {
    let logFilePath = this._config?.determineLogFilePath();
    if (logFilePath && fs.existsSync(logFilePath.fsPath)) {
      fs.unlinkSync(logFilePath.fsPath);
    }
  }

  /**
   * Logs the given message.
   *
   * A new line character is automatically concatenated.
   * @param message Log message.
   * @param errorConsole Console error output flag.
   */
  log(message: string, errorConsole: boolean = false): void {
    let msg = '[RGSS Script Editor] ' + message.concat('\n');
    // Logging to console enabled
    if (this._config?.configLogConsole()) {
      // Write console message (dev console)
      if (errorConsole) {
        console.error(msg);
      } else {
        console.log(msg);
      }
      this._output.append(msg);
    }
    // Logging to file enabled
    if (this._config?.configLogFile()) {
      let logFile = this._config?.determineLogFilePath();
      // Process logging operation
      if (logFile) {
        fs.writeFileSync(logFile.fsPath, msg, { flag: 'a' });
      }
    }
  }

  /**
   * Logs the given message with an INFO label
   *
   * A new line character is automatically concatenated
   * @param message Message
   */
  logInfo(message: string): void {
    this.log('INFO: '.concat(message));
  }

  /**
   * Logs the given message with a WARNING label
   *
   * A new line character is automatically concatenated
   * @param message Message
   */
  logWarning(message: string): void {
    this.log('WARNING: '.concat(message));
  }

  /**
   * Logs the given message with an ERROR label
   *
   * A new line character is automatically concatenated
   * @param message Message
   */
  logError(message: string): void {
    this.log('ERROR: '.concat(message), true);
  }

  /**
   * Logs the given unknown error with an ERROR label
   *
   * A new line character is automatically concatenated
   * @param message Message
   */
  logErrorUnknown(error: unknown): void {
    if (typeof error === 'string') {
      this.logError(error);
    } else if (error instanceof Error) {
      this.logError(`${error.stack}`);
    }
  }
}

export let logger = new Logger();
