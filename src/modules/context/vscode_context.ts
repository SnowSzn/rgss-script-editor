import * as vscode from 'vscode';

/**
 * Sets extension's valid working folder context state.
 * @param contextState Context state value
 */
export function setOpenedProjectFolder(contextState: boolean) {
  vscode.commands.executeCommand(
    'setContext',
    'rgss-script-editor.openedFolder',
    contextState
  );
}

/**
 * Sets extension's extracted scripts context state.
 * @param contextState Context state value
 */
export function setExtractedScripts(contextState: boolean) {
  vscode.commands.executeCommand(
    'setContext',
    'rgss-script-editor.extractedScripts',
    contextState
  );
}
