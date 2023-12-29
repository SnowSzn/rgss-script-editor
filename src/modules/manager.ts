import * as vscode from 'vscode';
import * as context from './context/vscode_context';
import * as events from './utils/events_handler';
import { Configuration } from './utils/configuration';
import { logger } from './utils/logger';
import { openFolder } from './processes/open_folder';
import { GameplayController } from './processes/gameplay_controller';
import {
  EditorSectionType,
  EditorSectionBase,
  ControllerDropMode,
  ScriptsController,
} from './processes/scripts_controller';
import { ExtensionUI } from './ui/ui_extension';

/**
 * Editor section alternate load type.
 */
type AlternateLoadMatrix = Array<
  [EditorSectionBase, vscode.TreeItemCheckboxState | boolean]
>;

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
events.registerEvent(events.EVENT_REFRESH, (treeItem: EditorSectionBase) => {
  refresh(treeItem);
});

/**
 * Extension start logic.
 * @returns A promise.
 */
export async function restart() {
  logger.logInfo('Starting RGSS Script Editor...');
  let currentFolder = extensionConfig.getInfo();
  if (currentFolder) {
    // Folder is opened already, open it again to refresh configuration
    await setProjectFolder(currentFolder.projectFolderPath);
  } else {
    // No folder opened, falls to quickstart
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
 * @returns A promise
 */
export async function quickStart() {
  let validFolders = fetchWorkspaceFolders();
  if (validFolders.length === 1) {
    // Opens the folder if there is only one valid
    let folder = validFolders[0];
    logger.logInfo(`Detected "${folder.name}" as a RPG Maker project!`);
    await setProjectFolder(folder.uri);
  } else if (validFolders.length > 1) {
    // Several valid RPG Maker projects were opened
    logger.logInfo(
      'Several valid RPG Maker folders were detected in the current workspace!'
    );
    extensionUI.control({ changeProjectFolder: true });
  } else {
    logger.logInfo(
      'No valid RPG Maker folder was detected in the current workspace'
    );
    extensionUI.hide();
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
    logger.logInfo(`Changing project folder to: "${projectFolder.fsPath}"...`);
    // If the folder is invalid an error is thrown
    const folder = await extensionConfig.update(projectFolder);

    // Updates extension instances
    logger.update(extensionConfig);
    extensionScripts.update(extensionConfig);
    extensionGameplay.update(extensionConfig);
    extensionUI.update({
      dragAndDropController: extensionScripts,
      treeRoot: extensionScripts.root,
      statusBarOptions: {
        projectFolder: folder.curProjectFolder.projectFolderName,
      },
    });

    // Updates extension context
    logger.logInfo(
      `Workspace folder "${folder.curProjectFolder.projectFolderName}" opened successfully!`
    );
    vscode.window.showInformationMessage(
      `Workspace folder "${folder.curProjectFolder.projectFolderName}" opened successfully!`
    );
    logger.logInfo(
      `RGSS Version detected: "${folder.curProjectFolder.rgssVersion}"`
    );
    context.setOpenedProjectFolder(true);

    // Updates extension extracted scripts context
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
    extensionUI.show();
  } catch (error) {
    // Invalid folder
    logger.logErrorUnknown(error);
    vscode.window.showErrorMessage(
      `Failed to open the folder, a valid RGSS version was not detected!`
    );

    // Updates extension context
    context.setOpenedProjectFolder(false);
    context.setExtractedScripts(false);

    // Resets all UI elements
    extensionUI.reset();

    // Activate the status bar only if valid folders detected
    if (fetchWorkspaceFolders().length > 0) {
      extensionUI.control({ changeProjectFolder: true });
    }
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
      `Cannot open project folder, the project folder: "${folderPath}" is invalid!`
    );
  }
}

/**
 * Extracts all scripts from the bundled file into the script folder.
 * @returns A promise
 */
export async function extractScripts() {
  try {
    // Extracts all scripts
    let extractionResponse = await extensionScripts.extractScripts();
    // Evaluate extraction
    if (extractionResponse === ScriptsController.SCRIPTS_EXTRACTED) {
      logger.logInfo('Scripts extracted successfully!');

      // Overwrites the bundle file with the loader script
      let loaderResponse = await extensionScripts.createLoader();

      // Updates the load order file.
      let loadResponse = await extensionScripts.updateLoadOrderFile();

      // Updates extension context.
      context.setExtractedScripts(true);

      // Refresh UI
      refresh();
    } else if (extractionResponse === ScriptsController.SCRIPTS_NOT_EXTRACTED) {
      logger.logInfo(
        "Extraction not needed, there aren't scripts left in the bundle file!"
      );
    } else {
      context.setExtractedScripts(false);
      logger.logWarning(
        `Extraction returned an unknown code: ${extractionResponse}`
      );
      logger.logWarning(`Stopping to avoid possible data loss.`);
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
    let loadOrderFile = extensionScripts.loadOrderFilePath;
    if (loadOrderFile) {
      vscode.commands.executeCommand('vscode.open', loadOrderFile);
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

// TODO: Since extension will update automatically the load order file
// this command should be deleted to avoid confusion.
/**
 * Creates the load order file within the current scripts folder path.
 * @returns A promise
 */
export async function createLoadOrderFile() {
  try {
    let response = await extensionScripts.updateLoadOrderFile();
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
    let loaderResponse = await extensionScripts.createLoader();
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
      logger.logInfo(
        `Bundle file created successfully at: "${destination.fsPath}"`
      );
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
          language: 'markdown',
          content: exception.markdown(),
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
        new vscode.Position(exception.backtrace[0].line - 1, 0),
        exception.backtrace.map((info) => {
          return new vscode.Location(
            vscode.Uri.file(info.file),
            new vscode.Position(info.line - 1, 0)
          );
        }),
        'gotoAndPeek'
      );
    }
  } else {
    logger.logInfo('No exception was reported in the last game session!');
    vscode.window.showInformationMessage(
      'No exception was reported in the last game session!'
    );
  }
}

// TODO: Needs a refactor
// Also specify args types

export async function sectionCreate(what: any, option: any) {
  // Creating from root?
  if (!(what instanceof EditorSectionBase)) {
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

export async function sectionDelete(section?: EditorSectionBase) {
  // let selected = extensionUI.getTreeSelection();
  // if (selected) {
  //   console.log(`Deleted: ${selected}`);
  // } else {
  //   console.log(`Deleted: ${what}`);
  // }
  let items = extensionUI.getTreeSelection() || [section];
  console.log(items);
}

/**
 * Ask the user for a new name and renames the given editor section to the new name.
 * @param section Editor section
 * @returns A promise
 */
export async function sectionRename(section?: EditorSectionBase) {
  try {
    // Check for selected tree items
    let selected = extensionUI.getTreeSelection();
    let item = section;
    if (selected) {
      // This is needed since command can activated through a keybind
      item = selected.length > 1 ? section : selected[0];
    }
    // Check item validness
    if (!item || item.isType(EditorSectionType.Separator)) {
      return;
    }
    // Ask user for input
    let name = await vscode.window.showInputBox({
      title: `Renaming: ${item.label}`,
      placeHolder: 'Type a new name for this section...',
      value: item.label?.toString(),
      validateInput(value) {
        return extensionScripts.validateName(value)
          ? null
          : 'Input contains invalid characters or words!';
      },
    });
    // If input is valid, perform rename operation
    if (name) {
      extensionScripts.renameSection(item, name);
      refresh();
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Alternates the load status (checkbox) of the given element or elements.
 *
 * If a {@link AlternateLoadMatrix} is given, it must be a list of arrays with the section
 * instance along with the checkbox status.
 *
 * If a single element is given, it will check the current tree selection and alternate
 * the checkbox of the given element or the list of selected elements accordingly.
 * @param section Editor section
 * @returns A promise
 */
export async function sectionAlternateLoad(
  section?: EditorSectionBase | AlternateLoadMatrix
) {
  // Check section validness
  if (!section) {
    return;
  }

  // Prepare the list of items to alternate
  let items: AlternateLoadMatrix = [];
  if (section instanceof Array) {
    // A list was given already
    items = section;
  } else if (section instanceof EditorSectionBase) {
    // Create list based on the current tree selection
    for (let item of extensionUI.getTreeSelection() || [section]) {
      items.push([item, !item.isLoaded()]);
    }
  }

  // Alternate load status
  for (let matrix of items) {
    const item = matrix[0];
    const load = matrix[1];
    extensionScripts.alternateSectionLoad(item, load);
  }
  refresh();
}

/**
 * Reveals the given editor section file system entry on the VSCode built-in file explorer.
 * @param section Editor section
 * @returns A promise
 */
export async function revealInVSCodeExplorer(section?: EditorSectionBase) {
  // Check section validness
  if (!section) {
    return;
  }
  // Reveal file based on type
  switch (section.type) {
    case EditorSectionType.Script:
    case EditorSectionType.Folder: {
      vscode.commands.executeCommand('revealInExplorer', section.resourceUri);
      break;
    }
  }
}

/**
 * Chooses the current drop mode.
 *
 * Allows the editor to behave different for drag and drop operations.
 */
export async function chooseDropMode() {
  // Show drop mode selector
  let curDropMode = extensionScripts.getDropModeString();
  let value = await vscode.window.showQuickPick(['Merge', 'Move'], {
    title: `Current Drop Mode: ${curDropMode}`,
    placeHolder: 'Choose the active drop mode',
    canPickMany: false,
  });
  // Update drop mode
  if (value) {
    logger.logInfo(`Setting drop mode to: ${value}`);
    if (value === 'Merge') {
      extensionScripts.setDropMode(ControllerDropMode.MERGE);
    } else if (value === 'Move') {
      extensionScripts.setDropMode(ControllerDropMode.MOVE);
    }
  }
}

/**
 * Refreshes the extension editor.
 *
 * Both the editor tree items and the load order file are updated.
 *
 * If a specific tree item is given, it will refresh that tree item and all of its children.
 * @param treeItem Tree item to refresh.
 */
export async function refresh(treeItem?: EditorSectionBase) {
  try {
    let item = treeItem ?? extensionScripts.root;
    if (item) {
      // Refreshes item/root based on the given argument
      extensionUI.refresh(item, !treeItem);
      // Updates load order file to match the current VSCode editor tree
      let response = await extensionScripts.updateLoadOrderFile();
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
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Updates the selected script section on the tree view to match the file opened in the given text editor.
 *
 * Extension auto-reveal functionality must be enabled.
 * @param editor Text editor instance.
 * @returns A promise.
 */
export async function updateTextEditor(editor?: vscode.TextEditor) {
  if (editor && extensionConfig.configAutoReveal()) {
    extensionUI.revealInTreeView(editor.document.uri, {
      select: true,
      expand: true,
    });
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

/**
 * Fetchs all valid folders from the current workspace.
 *
 * A valid folder is a folder in which a RGSS version was detected.
 * @returns List of valid folders.
 */
function fetchWorkspaceFolders() {
  let folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    return [];
  }
  let validFolders = [];
  for (let folder of folders) {
    if (extensionConfig.checkFolder(folder.uri)) {
      validFolders.push(folder);
    }
  }
  return validFolders;
}
