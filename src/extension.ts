import * as vscode from 'vscode';
import * as manager from './modules/manager';

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
      manager.onDidChangeConfiguration(event);
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

  // Import scripts
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.importScripts', () => {
      manager.importScripts();
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

  // Create a back up bundle file from extracted scripts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createBackupBundleFile',
      () => {
        manager.createBackUpBundleFile();
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

  // Create bundle file from selected scripts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createSelectedBundleFile',
      () => {
        manager.createSelectedBundleFile();
      }
    )
  );

  // Compile bundle file from enabled scripts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.compileBundleFile',
      () => {
        manager.compileBundleFile();
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

  // Drag and drop handler command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionMove',
      (...what: any[]) => {
        manager.sectionMove(...what);
      }
    )
  );

  // Cut handler command
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.sectionCut', (what) => {
      manager.sectionCut(what);
    })
  );

  // Copy handler command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionCopy',
      (what) => {
        manager.sectionCopy(what);
      }
    )
  );

  // Paste handler command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionPaste',
      (what) => {
        manager.sectionPaste(what);
      }
    )
  );

  // Toggle load status script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionToggleLoad',
      (what) => {
        manager.sectionToggleLoad(what);
      }
    )
  );

  // Toggle collapsible status command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionToggleCollapse',
      (what) => {
        manager.sectionToggleCollapse(what);
      }
    )
  );

  // Reveal script section on VSCode explorer command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionRevealInVSCodeExplorer',
      (what) => {
        manager.revealInVSCodeExplorer(what);
      }
    )
  );

  // Copy section absolute path command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionCopyAbsolutePath',
      (what) => {
        manager.sectionCopyAbsolutePath(what);
      }
    )
  );

  // Copy section relative path command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionCopyRelativePath',
      (what) => {
        manager.sectionCopyRelativePath(what);
      }
    )
  );

  // Reveal script section on file explorer command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.sectionOpenInExplorer',
      (what) => {
        manager.revealInFileExplorer(what);
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
