import * as fs from 'fs';
import * as pathResolve from './path_resolve';
import { config } from './configuration';

/**
 * Log file name
 */
const LOG_FILE_NAME = '.rgss-script-editor.log';

/**
 * Extension logger class
 */
class Logger {
  /**
   * Log file name
   */
  private fileName: string;

  /**
   * Creates a Logger with the given file name
   * @param logFileName Name of the log file
   */
  constructor(logFileName: string) {
    this.fileName = logFileName;
  }

  /**
   * Sets logger filename
   * @param logFileName Name of the log file
   */
  setLogFileName(logFileName: string): void {
    this.fileName = logFileName;
  }

  /**
   * Gets the logger file name
   * @returns Logger file name
   */
  getLogFileName(): string {
    return this.fileName;
  }

  /**
   * Deletes the log file corresponding to this Logger if it exists
   */

  deleteLogFile(): void {
    let logFilePath = this.determineLogFilePath();
    if (logFilePath) {
      if (fs.existsSync(logFilePath)) {
        fs.unlinkSync(logFilePath);
      }
    }
  }

  /**
   * Logs the given message
   *
   * A new line character is automatically concatenated
   * @param message Message
   * @param errorConsole Console error output flag
   */
  log(message: string, errorConsole: boolean = false): void {
    let msg = '[RGSS Script Editor] ' + message.concat('\n');
    // Logs the message to the console
    if (config.getConfigLogConsole()) {
      if (errorConsole) {
        console.error(msg);
      } else {
        console.log(msg);
      }
    }
    // Check if log to file is enabled
    if (config.getConfigLogFile()) {
      // Process logging operation
      let logFilePath = this.determineLogFilePath();
      if (logFilePath) {
        fs.writeFileSync(logFilePath, msg, { flag: 'a' });
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
      this.logError(`${error.name}: ${error.message} at: ${error.stack}`);
    }
  }

  /**
   * Determines the path to the log file based on the current RPG Maker project folder
   *
   * It returns undefined in case the path couldn't be created
   * @returns Log file path
   */
  private determineLogFilePath(): string | undefined {
    let projectFolder = config.getProjectFolderPath();
    if (projectFolder && this.fileName) {
      return pathResolve.join(projectFolder, this.fileName);
    } else {
      return undefined;
    }
  }
}

export let logger = new Logger(LOG_FILE_NAME);
