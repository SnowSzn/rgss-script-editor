import path from 'path';
import * as fs from 'fs';
import * as exEvents from './extension_events';
import { config } from './configuration';

/**
 * Log file name
 */
const LOG_FILE_NAME = '.rgss-script-editor.log';

class Logger {
  /**
   * Folder path to the log file
   */
  private filePath: string | undefined;
  /**
   * Log file name
   */
  private fileName: string;
  /**
   * File options
   */
  private options: fs.WriteFileOptions;

  /**
   * Creates a Logger instance with the given file name on the workspace folder path
   * @param logFileName Name of the log file
   */
  constructor(logFileName: string) {
    this.fileName = logFileName;
    this.filePath = undefined;
    this.options = { flag: 'a' };
  }

  /**
   * Sets the logger path to the given one
   * @param logFilePath Log file path
   */
  setLogFilePath(logFilePath: string): void {
    this.filePath = logFilePath;
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
  getFileName(): string {
    return this.fileName;
  }

  /**
   * Deletes the log file corresponding to this Logger instance
   */
  deleteLogFile(): void {
    let logFilePath = this.getLogFilePath();
    if (logFilePath) {
      fs.unlink(logFilePath, (err) => {
        if (err) {
          this.logError(err.message);
        }
      });
    } else {
      this.logWarning('Cannot delete log file because it does not exists!');
    }
  }

  /**
   * Logs the given message
   *
   * A new line character is automatically concatenated
   * @param message Message
   * @param error Console error output flag
   */
  log(message: string, error: boolean = false): void {
    let msg = '[RGSS Script Editor] ' + message.concat('\n');
    // Logs the message to the console
    if (config.getLogToConsole()) {
      if (error) {
        console.error(msg);
      } else {
        console.log(msg);
      }
    }
    // Check if log to file is enabled
    if (config.getLogToFile()) {
      // Process logging operation
      let logFilePath = this.getLogFilePath();
      if (logFilePath) {
        fs.writeFile(logFilePath, msg, this.options, (error) => {
          if (error) {
            console.error(error.message);
            console.error(
              `[Fatal Logger] Cannot write the message '${message}'`
            );
          }
        });
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
   * Gets the path to the log file
   *
   * It returns undefined in case the path couldn't be created
   * @returns Path to the log file
   */
  private getLogFilePath(): string | undefined {
    if (this.filePath) {
      // Formats logging path
      return path.join(this.filePath, this.fileName);
    }
    return undefined;
  }
}

export let logger = new Logger(LOG_FILE_NAME);

exEvents.handler.on(
  exEvents.ON_PROJECT_FOLDER_CHANGE,
  (oldFolder, newFolder) => {
    logger.setLogFilePath(newFolder);
    // Deletes the log file in the new folder
    if (config.getLogToFile()) {
      logger.deleteLogFile();
    }
  }
);
