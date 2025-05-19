import { l10n } from 'vscode';

export const CLOSE = l10n.t('Close');

export const QUICK_START_INFO = l10n.t(
  'Several RPG Maker folders were detected in the current workspace, choose one to set it as active.'
);

export const SCRIPTS_NOT_EXTRACTED = l10n.t(
  'Some scripts were detected inside the RPG Maker scripts file, you should extract them now.'
);

export const SET_PROJECT_PLACEHOLDER = l10n.t(
  'Choose the RPG Maker active project folder'
);

export const SET_PROJECT_SUCCESS = l10n.t(
  '"{0}" workspace folder opened successfully!'
);

export const SET_PROJECT_FAIL = l10n.t(
  'Failed to open the folder, a valid RGSS version was not detected.'
);

export const ERROR_GENERIC = l10n.t(
  'Something went wrong! Please check RGSS Script Editor output channel for more information.'
);

export const SCRIPT_LOADER_ERROR = l10n.t(
  "'Cannot create script loader because RPG Maker bundle file still has valid scripts inside of it!'"
);

export const SCRIPT_LOADER_SUCCESS = l10n.t(
  'The script loader was created successfully!'
);

export const BUNDLE_BACKUP_SUCCESS = l10n.t(
  'The backup bundle file was created successfully!'
);

export const LOAD_ORDER_BACKUP_SUCCESS = l10n.t('Load order backup created!');

export const BUNDLE_CREATE_SUCCESS = l10n.t(
  'The bundle file was created successfully!'
);

export const BUNDLE_CREATE_SELECTED_INVALID = l10n.t(
  `You must select at least one section on the tree view to create the bundle file!`
);

export const BUNDLE_CREATE_SELECTED_SUCCESS = l10n.t(
  'The bundle file was created successfully!'
);

export const COMPILE_SCRIPT_SUCCESS = l10n.t(
  'Scripts were compiled successfully!'
);

export const PROCESS_EXCEPTION_NO_REPORT = l10n.t(
  'No exception was reported in the last game session.'
);

export const PROCESS_EXCEPTION_WARNING = l10n.t(
  'An exception was reported in the last game session.'
);

export const PROCESS_EXCEPTION_OPT_PEEK = l10n.t('Peek Backtrace');

export const CREATE_TYPE_TITLE = l10n.t('Create a new section at: {0}');

export const CREATE_TYPE_PLACEHOLDER = l10n.t('Choose new section type...');

export const CREATE_TYPE_OPT_SCRIPT = l10n.t('Create Script');

export const CREATE_TYPE_OPT_FOLDER = l10n.t('Create Folder');

export const CREATE_TYPE_OPT_SEPARATOR = l10n.t('Create Separator');

export const CREATE_NAME_TITLE = l10n.t('Create a new section at: {0}');

export const CREATE_NAME_PLACEHOLDER = l10n.t(
  'Type a name for the new section...'
);

export const DELETE_TITLE = l10n.t('Deleting: {0}');

export const DELETE_PLACEHOLDER = l10n.t(
  'Are you sure you want to delete the selected sections? (This is irreversible)'
);

export const DELETE_OPT_DELETE = l10n.t(
  'Delete section (This is irreversible)'
);

export const DELETE_OPT_CANCEL = l10n.t('Cancel section deletion');

export const RENAME_TITLE = l10n.t('Renaming: {0}');

export const RENAME_PLACEHOLDER = l10n.t('Type a new name for this section...');

export const EDITOR_MODE_MERGE = l10n.t('Merge');

export const EDITOR_MODE_MOVE = l10n.t('Move');

export const EDITOR_MODE_UNKNOWN = l10n.t('Unknown');

export const CHOOSE_EDITOR_MODE_TITLE = l10n.t('Current Editor Mode: {0}');

export const CHOOSE_EDITOR_MODE_PLACEHOLDER = l10n.t(
  'Choose the editor mode...'
);

export const VALIDATE_INPUT_NAME = l10n.t(
  'Input contains invalid characters or words! ({0})'
);

export const VALIDATE_INPUT_PATH = l10n.t(
  'An editor section already exists with the given input!'
);

export const UI_SET_PROJECT_NAME = l10n.t(
  'RGSS Script Editor: Set Project Folder'
);

export const UI_SET_PROJECT_TEXT = l10n.t('Choose RPG Maker Project Folder');

export const UI_SET_PROJECT_TOOLTIP = l10n.t(
  'Choose a RPG Maker project folder from the current workspace to activate it'
);

export const UI_PROJECT_FOLDER_NAME = l10n.t(
  'RGSS Script Editor: Active Project Folder'
);

export const UI_PROJECT_FOLDER_TEXT = l10n.t('RPG Maker Active Project: {0}');

export const UI_PROJECT_FOLDER_TOOLTIP = l10n.t(
  'Opens the current active RPG Maker project folder'
);

export const UI_RUN_GAME_NAME = l10n.t('RGSS Script Editor: Run Game');

export const UI_RUN_GAME_TEXT = l10n.t('Run Game');

export const UI_RUN_GAME_TOOLTIP = l10n.t('Runs the game executable');

export const UI_EXTRACT_NAME = l10n.t('RGSS Script Editor: Extract Scripts');

export const UI_EXTRACT_TEXT = l10n.t('Extract Scripts');

export const UI_EXTRACT_TOOLTIP = l10n.t(
  'Extracts all scripts from the bundled RPG Maker scripts file'
);
