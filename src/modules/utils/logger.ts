import * as fs from 'fs';
import { Configuration } from './configuration';

/**
 * Log file name.
 */
const LOG_FILE_NAME = '.rgss-script-editor.log';

/**
 * Whether to force logging or not.
 *
 * Dev use.
 */
const FORCE_CONSOLE_LOG = true;

/**
 * Extension logger class
 */
class Logger {
  /**
   * Log file name.
   */
  private _fileName: string;

  /**
   * Extension configuration instance.
   */
  private _config: Configuration | undefined;

  /**
   * Constructor.
   * @param logFileName Log file name.
   */
  constructor(logFileName: string) {
    this._fileName = logFileName;
    this._config = undefined;
  }

  /**
   * Sets the logger file name.
   * @param logFileName Name of the log file.
   */
  setLogFileName(logFileName: string): void {
    this._fileName = logFileName;
  }

  /**
   * Gets the logger file name.
   * @returns Logger file name.
   */
  getLogFileName(): string {
    return this._fileName;
  }

  /**
   * Updates the logger with the given configuration instance.
   *
   * A valid configuration instance is needed to allow the logger to log information to an external file.
   * @param config Extension configuration instance.
   */
  update(config: Configuration) {
    if (config.isValid()) {
      this._config = config;
      // Deletes old log file
      if (this._config.configLogFile()) {
        this.deleteLogFile();
      }
    } else {
      this._config = undefined;
    }
  }

  /**
   * Deletes the log file of to this logger instance if it exists.
   */
  deleteLogFile(): void {
    if (this._config) {
      let logFilePath = this._config.joinProject(LOG_FILE_NAME);
      if (logFilePath && fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
      }
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
    if (this._config) {
      let msg = '[RGSS Script Editor] ' + message.concat('\n');
      // Logging to console enabled
      if (this._config.configLogConsole() || FORCE_CONSOLE_LOG) {
        if (errorConsole) {
          console.error(msg);
        } else {
          console.log(msg);
        }
      }
      // Logging to file enabled
      if (this._config.configLogFile()) {
        // Process logging operation
        let logFilePath = this._config.joinProject(LOG_FILE_NAME);
        if (logFilePath) {
          fs.writeFileSync(logFilePath, msg, { flag: 'a' });
        }
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
      this.logError(`[${error.name}] ${error.message} at: ${error.stack}`);
    }
  }
}

export let logger = new Logger(LOG_FILE_NAME);
