import * as vscode from 'vscode';
import * as manager from './modules/manager';

// TODO: Bugfixing

/**
 * Entry point.
 *
 * This method is called when your extension is activated.
 *
 * Your extension is activated the very first time the command is executed.
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // **********************************************************
  // Basic configuration
  // **********************************************************
  // VSCode Configuration change event.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      // Forces a restart so extension knows about the new change
      manager.restart();
    })
  );
  // VSCode Tree view update active file
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      manager.updateTextEditor(editor);
    })
  );
  // **********************************************************
  // User commands
  // **********************************************************
  // Set project folder command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.setProjectFolder',
      () => {
        vscode.window
          .showWorkspaceFolderPick({
            placeHolder: 'Choose the RPG Maker active project folder',
            ignoreFocusOut: true,
          })
          .then((value) => {
            if (value) {
              manager.setProjectFolder(value.uri);
            }
          });
      }
    )
  );
  // Open project folder command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.openProjectFolder',
      () => {
        manager.openProjectFolder();
      }
    )
  );
  // Extract scripts
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.extractScripts', () => {
      manager.extractScripts();
    })
  );
  // Create script loader
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createScriptLoader',
      () => {
        manager.createScriptLoader();
      }
    )
  );
  // Create bundle file from extracted scripts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createBundleFile',
      () => {
        manager.createBundleFile();
      }
    )
  );
  // Run game command
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.runGame', () => {
      manager.runGame();
    })
  );
  // Process game exception
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.processGameException',
      () => {
        manager.processGameException();
      }
    )
  );
  // Choose drop mode command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.chooseEditorMode',
      () => {
        manager.chooseEditorMode();
      }
    )
  );
  // Open load order txt file.
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.openLoadOrder', () => {
      manager.openLoadOrderFile();
    })
  );
  // **********************************************************
  // Extension commands (won't be used by the user)
  // **********************************************************
  // Reveal script section on VSCode explorer
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.revealInVSCodeExplorer',
      (what) => {
        manager.revealInVSCodeExplorer(what);
      }
    )
  );
  // Create script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionCreate',
      (what) => {
        manager.sectionCreate(what);
      }
    )
  );
  // Delete script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionDelete',
      (what) => {
        manager.sectionDelete(what);
      }
    )
  );
  // Rename script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionRename',
      (what) => {
        manager.sectionRename(what);
      }
    )
  );
  // Alternate load status script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionAlternateLoad',
      (what) => {
        manager.sectionAlternateLoad(what);
      }
    )
  );
  // **********************************************************
  // Start extension logic
  // **********************************************************
  // Restart manager
  manager.restart();
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate() {
  manager.dispose();
}
