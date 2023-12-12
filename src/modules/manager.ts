import * as vscode from 'vscode';
import * as context from './context/vscode_context';
import * as events from './utils/events_handler';
import { Configuration } from './utils/configuration';
import { logger } from './utils/logger';
import { openFolder } from './processes/open_folder';
import { GameplayController } from './processes/gameplay_controller';
import {
  ScriptsController,
  EditorSection,
} from './processes/scripts_controller';
import { ExtensionUI } from './ui/ui_extension';

/**
 * Extension extensionConfig.
 */
const extensionConfig: Configuration = new Configuration();

/**
 * Extension scripts controller.
 */
const extensionScripts: ScriptsController = new ScriptsController();

/**
 * Extension gameplay controller.
 */
const extensionGameplay: GameplayController = new GameplayController();

/**
 * Extension extensionUI.
 */
const extensionUI: ExtensionUI = new ExtensionUI();

/**
 * Register refresh event.
 */
events.registerEvent(events.EVENT_REFRESH, (treeItem: EditorSection) => {
  refresh(treeItem);
});

/**
 * Extension re-start logic.
 * @returns A promise.
 */
export async function restart() {
  // Checks if a folder project is opened already
  let folder = extensionConfig.getInfo();
  if (folder) {
    // Project folder opened already.
    logger.logInfo('Restarting RGSS Script Editor...');
    extensionGameplay.update(extensionConfig);
    // TODO: Make extensionScripts get the config instance instead
    extensionScripts.update(extensionConfig);
    extensionGameplay.update(extensionConfig);
    // TODO: Make sure root is not undefined!
    extensionUI.update({
      dragAndDropController: extensionScripts,
      treeRoot: extensionScripts.root!,
      statusBarOptions: { projectFolder: folder.projectFolderPath.path },
    });
  } else {
    // No project folder, falls to quickstart
    logger.logInfo('Starting RGSS Script Editor...');
    if (extensionConfig.configQuickstart()) {
      quickStart();
    } else {
      logger.logWarning('Quickstart is disabled!');
      logger.logInfo('To open a folder you can use the command palette.');
    }
  }
}

/**
 * Quickstart extension.
 *
 * It scans the current opened folders to start the extension:
 *  - If only one folder exists it is a RPG Maker project it is opened.
 *  - If more than one folder exists it enables the 'choose folder' ui element on the status bar.
 * @returns A promise
 */
export async function quickStart() {
  let folders = vscode.workspace.workspaceFolders;
  // Checks if there is any folder opened
  if (!folders) {
    logger.logWarning('No opened folders detected in the VSCode workspace.');
    logger.logInfo('Open a RPG Maker folder to start this extension.');
    return;
  }
  let validFolders = [];
  for (let folder of folders) {
    if (extensionConfig.checkFolder(folder.uri)) {
      validFolders.push(folder);
    }
  }
  // Evaluates valid folders
  if (validFolders.length === 1) {
    // Opens the folder if there is only one valid
    let folder = validFolders[0];
    logger.logInfo(`Detected '${folder.name}' as a RPG Maker project!`);
    vscode.window.showInformationMessage(
      `Detected '${folder.name}' as a RPG Maker project!`
    );
    await setProjectFolder(folder.uri);
  } else if (validFolders.length > 1) {
    // Enables 'choose project folder' button on the status bar
    extensionUI.controlStatusBar({ setProjectFolder: true });
    // Several valid RPG Maker projects were opened
    logger.logInfo(
      'Several valid RPG Maker folders were detected in the current workspace!'
    );
    // Shows a info message with a callback
    vscode.window
      .showInformationMessage(
        `Several folders were detected in the workspace. You can select one as the active folder by clicking the button.`,
        'Set RPG Maker Project Folder'
      )
      .then((value) => {
        if (value) {
          vscode.commands.executeCommand('rgss-script-editor.setProjectFolder');
        }
      });
  } else {
    logger.logWarning(
      'No valid RPG Maker folder was detected in the current workspace'
    );
  }
}

/**
 * Sets the extension working folder to the given one.
 *
 * If the folder is valid the promise is resolved and the folder is set as active.
 *
 * If the folder is invalid the promise is rejected.
 * @param projectFolder Project folder Uri.
 * @returns A promise.
 */
export async function setProjectFolder(projectFolder: vscode.Uri) {
  try {
    logger.logInfo(`Changing project folder to: '${projectFolder.fsPath}'...`);
    // If the folder is invalid an error is thrown
    const folder = await extensionConfig.update(projectFolder);

    // Updates extension instances
    logger.update(extensionConfig);
    extensionScripts.update(extensionConfig);
    extensionGameplay.update(extensionConfig);
    // TODO: Must make sure _root is not undefined here
    extensionUI.update({
      dragAndDropController: extensionScripts,
      treeRoot: extensionScripts.root!,
      statusBarOptions: {
        projectFolder: folder.curProjectFolder.projectFolderPath.path,
      },
    });

    // Updates extension context
    logger.logInfo(
      `'${folder.curProjectFolder.projectFolderPath.fsPath}' opened successfully!`
    );
    logger.logInfo(
      `RGSS Version detected: '${folder.curProjectFolder.rgssVersion}'`
    );
    context.setValidProjectFolder(true);

    // Updates extension extracted scripts context
    logger.logInfo(`Checking project's bundle scripts file status...`);
    const scriptsResponse = await extensionScripts.checkScripts();
    if (scriptsResponse === ScriptsController.SCRIPTS_EXTRACTED) {
      context.setExtractedScripts(true);
      logger.logInfo(
        'Scripts extraction has already been done previously for this project!'
      );
    } else if (scriptsResponse === ScriptsController.SCRIPTS_NOT_EXTRACTED) {
      context.setExtractedScripts(false);
      logger.logWarning('Scripts were detected inside the bundle scripts file');
      logger.logInfo(
        'If this is the first time opening the project you should now extract script files!'
      );
      logger.logInfo(
        'In case you have previously extracted the scripts, make sure not to add new scripts to the bundle file'
      );
    } else {
      context.setExtractedScripts(false);
      logger.logWarning(
        `The bundle scripts file check reported an unknown code: ${scriptsResponse}`
      );
    }

    // Update UI visibility
    extensionUI.showStatusBar();

    // Shows an information VSCode window
    vscode.window.showInformationMessage(
      `Folder: '${folder.curProjectFolder.projectFolderPath.path}' opened succesfully!`
    );
  } catch (error) {
    logger.logErrorUnknown(error);
    context.setValidProjectFolder(false);
    context.setExtractedScripts(false);

    // Shows an error VSCode window
    vscode.window.showErrorMessage(`Failed to open the folder!`);
  }
}

/**
 * Opens the working RPG Maker project folder.
 * @returns A promise
 */
export async function openProjectFolder() {
  let folderPath = extensionConfig.projectFolderPath;
  if (folderPath) {
    try {
      let folderProcess = await openFolder(folderPath.fsPath);
      folderProcess.unref();
    } catch (error) {
      logger.logErrorUnknown(error);
    }
  } else {
    logger.logError(
      `Cannot open project folder, the project folder: '${folderPath}' is invalid!`
    );
  }
}

/**
 * Extracts all scripts from the bundled file into the script folder.
 * @returns A promise
 */
export async function extractScripts() {
  logger.logInfo('Extracting scripts from the bundled file...');
  try {
    // Extracts all scripts
    let extractionResponse = await extensionScripts.extractScripts();
    // Evaluate extraction
    if (extractionResponse === ScriptsController.SCRIPTS_EXTRACTED) {
      logger.logInfo('Scripts extracted successfully!');
      // Overwrites the bundle file with the loader script
      let loaderResponse = await extensionScripts.createLoader(
        GameplayController.GAME_OUTPUT_FILE
      );
      context.setExtractedScripts(true);
    } else if (extractionResponse === ScriptsController.SCRIPTS_NOT_EXTRACTED) {
      logger.logInfo(
        "Extraction not needed, there aren't scripts left in the bundle file"
      );
    } else {
      context.setExtractedScripts(false);
      logger.logWarning(
        `Extraction returned an unknown code: '${extractionResponse}'`
      );
    }
  } catch (error: unknown) {
    context.setExtractedScripts(false);
    logger.logErrorUnknown(error);
  }
}

/**
 * Opens the load order file within the current scripts folder path.
 * @returns A promise
 */
export async function openLoadOrderFile() {
  try {
    let loadOrderFile = extensionScripts.getLoadOrderFilePath();
    if (loadOrderFile) {
      vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.file(loadOrderFile)
      );
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Creates the load order file within the current scripts folder path.
 * @returns A promise
 */
export async function createLoadOrderFile() {
  try {
    let response = await extensionScripts.createLoadOrderFile();
    logger.logInfo('Load order TXT file updated successfully!');
    if (response === 0) {
      logger.logWarning('Load order TXT file is empty!');
      logger.logWarning(
        'You should use the RGSS Script Editor view in VSCode to load scripts'
      );
      logger.logWarning(
        'If load order TXT file is left empty, the game will not work at all!'
      );
    } else {
      logger.logInfo(
        `${response} entries were written in the load order TXT file.`
      );
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Asynchronously creates the bundle script loader file for RPG Maker engine
 * @returns A promise
 */
export async function createScriptLoader() {
  try {
    let extractedResponse = await extensionScripts.checkScripts();
    if (extractedResponse === ScriptsController.SCRIPTS_NOT_EXTRACTED) {
      logger.logError(
        'Cannot create script loader bundle file because RPG Maker bundle file still has valid scripts inside of it!'
      );
      logger.logWarning(
        'You should make sure to extract the scripts to avoid data loss before doing this'
      );
      return;
    }
    // Overwrite bundle file
    let loaderResponse = await extensionScripts.createLoader(
      GameplayController.GAME_OUTPUT_FILE
    );
    if (loaderResponse === ScriptsController.LOADER_BUNDLE_CREATED) {
      logger.logInfo('Script loader bundle file created successfully!');
    } else {
      logger.logError(
        `Script loader bundle file creation reported an unknown code!`
      );
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Creates a bundle file based on the load order file.
 * @returns A promise
 */
export async function createBundleFile() {
  try {
    // Gets destination folder
    let destination = await vscode.window.showSaveDialog({
      filters: {
        'RPG Maker VX Ace': ['rvdata2'],
        'RPG Maker VX': ['rvdata'],
        'RPG Maker XP': ['rxdata'],
      },
    });
    if (!destination) {
      logger.logError(`You must select a valid path to save the bundle file!`);
      return;
    }
    // Create bundle file
    let response = await extensionScripts.createBundle(destination);
    if (response === ScriptsController.BUNDLE_CREATED) {
      logger.logInfo(`Bundle file created successfully at: '${destination}'`);
    } else {
      logger.logError(`Bundle file creation reported an unknown code!`);
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Runs the game executable if the there is an active project folder set
 * @returns A promise
 */
export async function runGame() {
  try {
    let pid = await extensionGameplay.runGame();
    if (pid) {
      logger.logInfo(`Game executable launched successfully with PID: ${pid}`);
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Asynchronously process the exception got from the last game session.
 * @returns A promise.
 */
export async function processGameException() {
  logger.logInfo('Processing game exception...');
  let exception = extensionGameplay.lastException;
  if (exception) {
    let option = await vscode.window.showWarningMessage(
      'An exception was reported in the last game session.',
      'Peek Backtrace',
      'Close'
    );
    if (option === 'Peek Backtrace') {
      // Shows the exception in a new text document besides the main editor if allowed.
      if (extensionConfig.configGameErrorShowEditor()) {
        let doc = await vscode.workspace.openTextDocument({
          language: 'text',
          content: exception.document(),
        });
        await vscode.window.showTextDocument(
          doc,
          vscode.ViewColumn.Beside,
          true
        );
      }
      // Opens the peek menu to backtrace.
      await vscode.commands.executeCommand(
        'editor.action.peekLocations',
        vscode.Uri.file(exception.backtrace[0].file),
        new vscode.Position(exception.backtrace[0].line, 0),
        exception.backtrace.map((info) => {
          return new vscode.Location(
            vscode.Uri.file(info.file),
            new vscode.Position(info.line - 1, 0)
          );
        }),
        'gotoAndPeek',
        'Not Found'
      );
    }
  } else {
    logger.logInfo('No exception was reported in the last game session!');
    vscode.window.showInformationMessage(
      'No exception was reported in the last game session!'
    );
  }
}

/**
 * Updates the selected script section on the tree view to match the file opened in the given text editor.
 *
 * Extension auto-reveal functionality must be enabled.
 * @param editor Text editor instance.
 * @returns A promise.
 */
export async function updateActiveFile(editor: vscode.TextEditor | undefined) {
  if (editor && extensionConfig.configAutoReveal()) {
    // TODO: Resolve Uri
    extensionUI.revealInTreeView(editor.document.uri.fsPath, {
      select: true,
      expand: true,
    });
  }
}

// TODO: Needs a refactor
// Also specify args types

export async function revealScriptSection(what: any) {
  let selected = extensionUI.getTreeSelection();
  if (selected && selected.length > 1) {
    logger.logWarning('You must select a single script section to reveal it!');
  } else {
    console.log(`revealing: '${what}'`);
    let path = vscode.Uri.file((what as EditorSection).path);
    vscode.commands.executeCommand('revealInExplorer', path);
  }
}

export async function createScriptSection(what: any, option: any) {
  // Creating from root?
  if (!(what instanceof EditorSection)) {
    // Root creation
    console.log(`Created: ${what} in root as a: ${option}`);
    return;
  }
  let selected = extensionUI.getTreeSelection();
  if (selected && selected.length > 1) {
    logger.logWarning(
      'You must select only a single script section to create a new one!'
    );
  } else {
    console.log(`Created: ${what} as a: ${option}`);
  }
}

export async function deleteScriptSection(what: any) {
  let selected = extensionUI.getTreeSelection();
  if (selected) {
    console.log(`Deleted: ${selected}`);
  } else {
    console.log(`Deleted: ${what}`);
  }
}

export async function renameScriptSection(what: any) {
  let selected = extensionUI.getTreeSelection();
  if (selected && selected.length > 1) {
    logger.logWarning(
      'You must select only a single script section to rename it!'
    );
  } else {
    console.log(`Renamed: ${what}`);
  }
}

export async function alternateLoadScriptSection(what: any) {
  // Alternating from root?
  // TODO: UI Controller calls this method to alternate single scripts, the format is:
  // [[ScriptSection1, checkboxState1], [ScriptSection2, checkboxState2], [ScriptSection3, checkboxState3]]
  // TODO: IMPORTANT
  // Cuando un tree item se activa o desactiva, hay que actualizar el valor de todos sus hijos.
  // normalmente VSCode lo haria automaticamente, pero parece ser que cuando un tree item con hijos
  // esta en estado "Collapsed", no se actualiza bien los hijos y se quedan con el estado anterior
  // esto provoca que no se actualice bien el load_order.txt
  // puede que tenga que poner la opcion "manageCheckboxStateManually" del tree view a ``true``
  // para evitar que VSCode cambie el checkbox de los hijos automaticamente.
  if (!(what instanceof EditorSection)) {
    // Root alternation
    console.log(`Alternating all scripts`);
  }
  let selected = extensionUI.getTreeSelection();
  if (selected && selected.length > 1) {
    console.log(selected);
  } else {
    console.log(what);
  }
  // TODO: UI must be refreshed everytime root is changed
  refresh();
}

export async function alternateDropMode() {
  // TODO: Alternates the extension scripts controller drop mode
  // If a file is in MOVE mode and it is dropped on a folder, it will take the next priority value.
  // If a file is in CREATE mode and it is dropped on a folder, it will be inserted as a child.
  logger.logInfo('Alternating drop mode!');
}

/**
 * Refreshes the extension UI.
 *
 * If a specific tree item is given, it will refresh that tree item and all of its children.
 *
 * Call ``refresh()`` with no arguments to force a root refresh.
 * @param treeItem Tree item to refresh.
 */
export async function refresh(treeItem?: EditorSection) {
  if (treeItem) {
    // Refresh the given tree item
    extensionUI.refresh({ treeItem: treeItem });
  } else {
    // Force root refresh
    let root = extensionScripts.root;
    if (root) {
      extensionUI.refresh({ treeItem: root, isRoot: true });
    }
  }
}

/**
 * Disposes the extension upon deactivation.
 */
export function dispose() {
  // Disposes script controller
  extensionScripts.dispose();
  // Disposes the game controller
  extensionGameplay.dispose();
  // Disposes UI elements
  extensionUI.dispose();
}
