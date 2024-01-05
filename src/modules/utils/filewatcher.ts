import * as vscode from 'vscode';
import { Configuration } from './configuration';

/**
 * File system watcher class.
 */
export class FileSystemWatcher {
  /**
   * Extension configuration instance.
   */
  private _config?: Configuration;

  /**
   * File system watcher instance.
   */
  private _watcher?: vscode.FileSystemWatcher;

  /**
   * Event fired when a file system entry is created.
   */
  private _onDidCreateEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidCreate: vscode.Event<vscode.Uri> =
    this._onDidCreateEmitter.event;

  /**
   * Event fired when a file system entry is deleted.
   */
  private _onDidDeleteEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidDelete: vscode.Event<vscode.Uri> =
    this._onDidDeleteEmitter.event;

  /**
   * Event fired when a file system entry is changed.
   */
  private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange: vscode.Event<vscode.Uri> =
    this._onDidChangeEmitter.event;

  /**
   * Updates the scripts controller instance attributes.
   * @param config Configuration.
   */
  update(config: Configuration) {
    this._config = config;
    this._restart();
  }

  /**
   * Disposes the file system watcher instance.
   */
  dispose() {
    this._watcher?.dispose();
    this._watcher = undefined;
  }

  /**
   * Restarts this instance based on the current attributes.
   */
  private _restart() {
    // Checks scripts folder validness
    let scriptsFolder = this._config?.scriptsFolderPath;
    if (!scriptsFolder) {
      return;
    }

    // Disposes previous values
    this.dispose();

    // Recreates the watcher with the current configuration
    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(scriptsFolder, '**')
    );

    // Sets the watcher callbacks
    this._watcher.onDidCreate((uri: vscode.Uri) => {
      this._onDidCreateEmitter.fire(uri);
    });
    this._watcher.onDidDelete((uri) => {
      this._onDidDeleteEmitter.fire(uri);
    });
    this._watcher.onDidChange((uri) => {
      this._onDidChangeEmitter.fire(uri);
    });
  }
}
