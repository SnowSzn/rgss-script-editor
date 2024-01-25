import * as vscode from 'vscode';
import * as context from './context/vscode_context';
import { FileSystemWatcher } from './utils/filewatcher';
import { Configuration } from './utils/configuration';
import { logger } from './utils/logger';
import { openFolder } from './processes/open_folder';
import { GameplayController } from './processes/gameplay_controller';
import {
  EditorSectionType,
  ControllerEditorMode,
  EditorSectionBase,
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
 * Extension file system watcher
 */
const extensionWatcher: FileSystemWatcher = new FileSystemWatcher();

// Sets extension file system watcher callbacks
extensionWatcher.onDidCreate((uri) => {
  watcherOnDidCreate(uri);
});
extensionWatcher.onDidDelete((uri) => {
  watcherOnDidDelete(uri);
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
    vscode.window.showInformationMessage(
      'Several RPG Maker folders were detected in the current workspace, choose one to set it as active'
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
    extensionGameplay.update(extensionConfig);
    extensionScripts.update(extensionConfig);
    extensionWatcher.update(extensionConfig);
    extensionUI.update({
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
      await refresh();
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
    // Gets the project folder
    const projectFolder = extensionConfig.projectFolderPath;
    // Gets destination folder
    let destination = await vscode.window.showSaveDialog({
      defaultUri: projectFolder,
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
  try {
    logger.logInfo('Processing game exception...');
    let exception = extensionGameplay.lastException;
    // Check exception existence
    if (!exception) {
      logger.logInfo('No exception was reported in the last game session!');
      vscode.window.showInformationMessage(
        'No exception was reported in the last game session!'
      );
      return;
    }
    // Process exception
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
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Creates a new editor section in the specified section.
 * @param section Editor section
 * @returns A promise
 */
export async function sectionCreate(section?: EditorSectionBase) {
  try {
    // Checks if user is creating a section from the view more actions submenu
    // if creating from the submenu, section is like '{ preserveFocus: false }'
    let sectionTemp = section
      ? 'preserveFocus' in section
        ? extensionScripts.root
        : section
      : section;
    // Determines the appropiate target
    let selected = extensionUI.getTreeSelection();
    let target = sectionTemp ? sectionTemp : selected ? selected[0] : undefined;

    // Check target validness
    if (!target) {
      return;
    }

    // Prepare creation input
    let type: EditorSectionType | undefined = undefined;
    let name: string | undefined = undefined;

    // Determine section type
    let typeOption = await vscode.window.showQuickPick(
      ['Create Script', 'Create Folder', 'Create Separator'],
      {
        title: `Create a new section at: ${target}`,
        placeHolder: 'Choose the type...',
        canPickMany: false,
      }
    );
    switch (typeOption) {
      case 'Create Separator': {
        type = EditorSectionType.Separator;
        // Automatically sets separator name
        name = extensionScripts.getSeparatorName();
        break;
      }
      case 'Create Folder': {
        type = EditorSectionType.Folder;
        break;
      }
      case 'Create Script': {
        type = EditorSectionType.Script;
        break;
      }
      default: {
        type = undefined;
        break;
      }
    }

    // Determine section name (if not set automatically)
    if (type && !name) {
      name = await vscode.window.showInputBox({
        title: `Create a new section at: ${target}`,
        placeHolder: 'Type a name for the new section...',
        validateInput(value) {
          let info = extensionScripts.determineSectionInfo(
            type!,
            value,
            target!
          );
          return info
            ? validateUserInput(info.parent, info.uri, value)
            : 'Cannot determine validness!';
        },
      });
    }

    // Check user input validness
    if (!name || !type) {
      return;
    }

    // Create new section
    let info = extensionScripts.determineSectionInfo(type, name, target);
    if (info) {
      logger.logInfo(`Creating section: "${info.uri.fsPath}"`);
      extensionScripts.sectionCreate(info);
      await refresh();
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Deletes the given editor section or all editor sections selected in the editor.
 *
 * Before deletion is done, this function asks the user for confirmation.
 * @param section Editor section
 * @returns A promise
 */
export async function sectionDelete(section?: EditorSectionBase) {
  try {
    let items = extensionUI.getTreeSelection() || (section ? [section] : []);
    let option = await vscode.window.showQuickPick(['Yes', 'No'], {
      title: `Deleting: ${items}`,
      placeHolder: 'Are you sure you want to delete the selected items?',
      canPickMany: false,
    });
    // Checks for user option
    if (option === 'Yes') {
      for (let item of items) {
        logger.logInfo(`Deleting section: "${item.resourceUri.fsPath}"`);
        extensionScripts.sectionDelete(item);
      }
      await refresh();
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Ask the user for a new name and renames the given editor section to the new name.
 * @param section Editor section
 * @returns A promise
 */
export async function sectionRename(section?: EditorSectionBase) {
  try {
    let selected = extensionUI.getTreeSelection();
    let item = section ? section : selected ? selected[0] : undefined;

    // Check item validness
    if (!item || item.isType(EditorSectionType.Separator)) {
      return;
    }

    // Determine section name
    let name = await vscode.window.showInputBox({
      title: `Renaming: ${item.label}`,
      placeHolder: 'Type a new name for this section...',
      value: item.label?.toString(),
      validateInput(value) {
        let uri = extensionScripts.determineSectionUri(
          item!.parent!.resourceUri,
          item!.type,
          value
        );
        return validateUserInput(item!.parent!, uri, value);
      },
    });

    // If input is valid, perform rename operation
    if (name) {
      let uri = extensionScripts.determineSectionUri(
        item.getDirectory(),
        item.type,
        name
      );
      logger.logInfo(`Renaming section: "${item}" to: "${uri.fsPath}"`);
      extensionScripts.sectionRename(item, uri);
      await refresh();
    }
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Processes a drag and drop move operation on the tree.
 *
 * All sections in ``source`` will be moved into the ``target`` section.
 * @param source List of sections (drag)
 * @param target Target section (drop)
 */
export async function sectionMove(
  source?: EditorSectionBase[],
  target?: EditorSectionBase
) {
  try {
    // Checks validness
    if (!source || !target) {
      return;
    }
    logger.logInfo(`Moving: "${source}" to: "${target}"`);
    extensionScripts.sectionMove(source, target);
    await refresh();
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Alternates the load status (checkbox) of the given element or elements.
 *
 * If a {@link AlternateLoadMatrix} is given, it must be an array with the section
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
  try {
    let items: AlternateLoadMatrix = [];

    // Handles arguments
    if (section instanceof Array) {
      // AlternateLoadMatrix
      items = section;
    } else {
      // Can be a section or undefined if called using a keyboard shortcut
      for (let item of extensionUI.getTreeSelection() || [section]) {
        if (item) {
          items.push([item, !item.isLoaded()]);
        }
      }
    }

    // Alternate load status
    for (let matrix of items) {
      const item = matrix[0];
      const load = matrix[1];
      logger.logInfo(`Section: "${item}" load status set to: ${load}`);
      extensionScripts.sectionAlternateLoad(item, load);
    }
    await refresh();
  } catch (error) {
    logger.logErrorUnknown(error);
  }
}

/**
 * Reveals the given editor section file system entry on the VSCode built-in file explorer.
 * @param section Editor section
 * @returns A promise
 */
export async function revealInVSCodeExplorer(section?: EditorSectionBase) {
  let selected = extensionUI.getTreeSelection();
  let item = section ? section : selected ? selected[0] : undefined;

  // Check item validness
  if (!item) {
    return;
  }

  // Reveal file based on type
  switch (item.type) {
    case EditorSectionType.Script:
    case EditorSectionType.Folder: {
      await vscode.commands.executeCommand(
        'revealInExplorer',
        item.resourceUri
      );
      break;
    }
  }
}

/**
 * Chooses the current editor mode.
 *
 * Allows the editor to behave different for drag and drop operations.
 */
export async function chooseEditorMode() {
  // Show drop mode selector
  let curMode = extensionScripts.getEditorModeString();
  let value = await vscode.window.showQuickPick(['Merge', 'Move'], {
    title: `Current Editor Mode: ${curMode}`,
    placeHolder: 'Choose the editor mode...',
    canPickMany: false,
  });
  // Update drop mode
  if (value) {
    logger.logInfo(`Setting editor mode to: ${value}`);
    if (value === 'Merge') {
      extensionScripts.setEditorMode(ControllerEditorMode.MERGE);
    } else if (value === 'Move') {
      extensionScripts.setEditorMode(ControllerEditorMode.MOVE);
    }
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
export async function dispose() {
  // Disposes the game controller
  extensionGameplay.dispose();
  // Disposes UI elements
  extensionUI.dispose();
  // Disposes file system watcher
  extensionWatcher.dispose();
  // Disposes logger
  logger.dispose();
}

/**
 * Checks if the configuration change event affects this extension.
 *
 * This function must return ``true`` if a critical configuration value is changed
 * so the manager can trigger an update on the current folder.
 * @param event Config change event
 */
export function affectsConfiguration(event: vscode.ConfigurationChangeEvent) {
  return event.affectsConfiguration('rgssScriptEditor.external.scriptsFolder');
}

/**
 * Processes a file system watcher creation event.
 * @param uri Entry uri
 */
async function watcherOnDidCreate(uri: vscode.Uri) {
  // Check if it is root path
  if (extensionScripts.root.isPath(uri)) {
    return;
  }
  // New entry created
  logger.logInfo(`Entry created: "${uri.fsPath}"`);
  let type = extensionScripts.determineSectionType(uri);
  // Checks if the editor section exists already
  let child = extensionScripts.root.findChild((value) => {
    return value.isPath(uri);
  }, true);
  // Create section only if it does not exists
  if (type && !child) {
    logger.logInfo(`Creating section: "${uri.fsPath}"`);
    extensionScripts.sectionCreate({
      type: type,
      uri: uri,
      parent: extensionScripts.root,
    });
    await refresh();
  }
}

/**
 * Processes a file system watcher deletion event.
 * @param uri Entry uri
 */
async function watcherOnDidDelete(uri: vscode.Uri) {
  logger.logInfo(`Entry deleted: "${uri.fsPath}"`);
  // Find child instance that matches the deleted path.
  let child = extensionScripts.root.findChild((value) => {
    return value.isPath(uri);
  }, true);
  // Delete child if found.
  if (child) {
    logger.logInfo(`Deleting section: "${child.resourceUri.fsPath}"`);
    extensionScripts.sectionDelete(child);
    await refresh();
  }
}

/**
 * Asynchronously refreshes the extension editor.
 *
 * Both the editor tree items and the load order file are updated.
 *
 * To ensure that the tree is refreshes this method should be awaited.
 *
 * If a specific tree item is given, it will refresh that tree item and all of its children.
 * @param treeItem Tree item to refresh.
 */
async function refresh(treeItem?: EditorSectionBase) {
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
 * Checks the validness of the given user input.
 *
 * If the input is invalid, it returns a string with an invalid message, otherwise ``null``.
 * @param parent Editor section parent
 * @param uri Editor section uri
 * @param name Editor section name
 * @returns Input validness
 */
function validateUserInput(
  parent: EditorSectionBase,
  uri: vscode.Uri,
  name: string
): string | null {
  let nameValidness = extensionScripts.validateName(name);
  let uriValidness = extensionScripts.validateUri(parent, uri);
  // Checks name validness
  if (!nameValidness) {
    let match = extensionScripts.matchInvalidCharacters(name);
    return `Input contains invalid characters or words! (${match})`;
  }
  // Checks uri validness
  if (!uriValidness) {
    return 'An editor section already exists with the given input!';
  }
  return null;
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
