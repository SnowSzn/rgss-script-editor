import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as marshal from '@hyrious/marshal';
import * as vscode from 'vscode';
import * as pathing from '../utils/pathing';
import * as filesys from '../utils/filesystem';
import { TextDecoder } from 'util';
import { Configuration } from '../utils/configuration';
import { logger } from '../utils/logger';

/**
 * Editor section instance type enumerator.
 */
enum EditorSectionType {
  /**
   * Represents a separator.
   */
  Separator,

  /**
   * Represents a folder.
   */
  Folder,

  /**
   * Represents a Ruby script file.
   */
  Script,
}

/**
 * Editor section information.
 */
type EditorSectionInfo = {
  /**
   * Editor section label.
   */
  label: string;

  /**
   * Editor section uri path.
   */
  uri: vscode.Uri;
};

/**
 * Loader bundle creation type.
 */
type LoaderScriptConfig = {
  /**
   * Scripts folder relative path.
   *
   * The path must be relative to the game's folder.
   */
  scriptsFolder: string;

  /**
   * Loader script name.
   */
  scriptName: string;

  /**
   * Load order TXT file name.
   *
   * The file that dictates the load order.
   *
   * File must exists inside ``scriptsFolder`` path.
   */
  loadOrderFileName: string;

  /**
   * Error file name.
   *
   * The file that creates the loader with the error output of the process.
   */
  errorFileName: string;

  /**
   * Skip script character.
   */
  skipCharacter: string;
};

/**
 * Regexp of invalid characters for Windows, Linux-based systems and this extension.
 */
const INVALID_CHARACTERS = /[\\/:\*\?"<>\|#▼■]/g;

/**
 * Load order file name within the scripts folder.
 */
const LOAD_ORDER_FILE_NAME = 'load_order.txt';

/**
 * Name of any editor section separator instance.
 *
 * To avoid issues, it should include, at least, an invalid character from {@link INVALID_CHARACTERS} invalid character list.
 */
const EDITOR_SECTION_SEPARATOR_NAME = '*separator*';

/**
 * Character used to mark a editor section as skipped.
 *
 * To avoid issues, this character should be included inside the {@link INVALID_CHARACTERS} invalid character list.
 */
const EDITOR_SECTION_SKIPPED_CHARACTER = '#';

/**
 * Unique script section for this extension's external scripts loader script.
 *
 * Note: This value is used to uniquely identify the script loader this extension creates.
 */
const LOADER_SCRIPT_SECTION = 133_769_420;

/**
 * Name of the script loader inside the RPG Maker bundled file.
 */
const LOADER_SCRIPT_NAME = 'RGSS Script Editor Loader';

/**
 * Maximum value to generate a script section for RPG Maker.
 *
 * Note: Should be set below {@link LOADER_SCRIPT_SECTION} to avoid a double section ID.
 */
const RPG_MAKER_SECTION_MAX_VAL = 133_769_419;

/**
 * Editor section base class.
 *
 * The virtual representation of a RPG Maker script section.
 */
export abstract class EditorSectionBase extends vscode.TreeItem {
  /**
   * Editor section collapsible states.
   */
  public static Collapsible = vscode.TreeItemCollapsibleState;

  /**
   * Editor section checkbox values.
   */
  public static Checkbox = vscode.TreeItemCheckboxState;

  /**
   * Editor section type.
   *
   * **Note: This attribute is inmutable and cannot be changed in subclasses.**
   */
  private readonly _type: number;

  /**
   * Editor section priority.
   */
  protected _priority: number;

  /**
   * Editor section children.
   */
  protected _children: EditorSectionBase[];

  /**
   * Editor section parent.
   */
  protected _parent?: EditorSectionBase;

  /**
   * The {@link vscode.Uri Uri} of the resource representing this item.
   *
   * Will be used to derive the {@link vscode.TreeItem.label label}, when it is not provided.
   *
   * Will be used to derive the icon from current file icon theme, when {@link vscode.TreeItem.iconPath iconPath} has {@link vscode.ThemeIcon ThemeIcon} value.
   */
  resourceUri: vscode.Uri;

  /**
   * Constructor.
   * @param type Editor section type.
   * @param label Editor section label.
   * @param uri Editor section path.
   */
  constructor(type: number, label: string, uri: vscode.Uri) {
    super(label);
    this._type = type;
    this.resourceUri = uri;
    this._children = [];
    this._priority = 0;
    this._parent = undefined;
  }

  /**
   * Adds the given editor section instance as a new child of this one.
   *
   * The given child instance priority attribute will be updated to the size of the children list.
   *
   * Note: For the sake of consistency, the section given must be relative to this instance.
   *
   * For example:
   *  - This instance: *'My Folder/Subfolder/'*
   *  - Child instance: *'My Folder/Subfolder/file.txt'*
   *
   * Otherwise, this method will throw an error.
   * @param section Editor section.
   * @throws An error when the section is not valid.
   */
  abstract addChild(section: EditorSectionBase): void;

  /**
   * Deletes the given editor section instance from the children list.
   *
   * If deletion was successful it returns the deleted element and resets its parent reference to ``undefined``.
   *
   * If the element is not found it returns ``undefined``.
   * @param section Editor section.
   * @returns List of deleted elements.
   */
  abstract deleteChild(
    section: EditorSectionBase
  ): EditorSectionBase | undefined;

  /**
   * Creates a new instance and automatically inserts it as a child of this editor section.
   *
   * The given Uri path ``path`` must be inmediate to this editor section.
   *
   * If the creation is not possible, it returns ``undefined``.
   * @param type Editor section type.
   * @param uri Editor section Uri path.
   * @returns Editor section child instance.
   */
  abstract createChild(
    type: number,
    uri: vscode.Uri
  ): EditorSectionBase | undefined;

  /**
   * Recursively creates a new child instance and automatically inserts it as a child of this editor section.
   *
   * The given Uri path ``path`` must be inmediate to this editor section.
   *
   * If the creation is not possible, it returns ``undefined``.
   *
   * This method recursively creates all needed child instances to create the child with the given information.
   *
   * For example:
   *
   * If a child is created with path ``./some/path/file.rb`` but the child ``some`` does not exists it will create it before the last child (in this case, ``file.rb``) is created.
   * @param type Editor section type.
   * @param uri Editor section Uri path.
   * @returns The last editor section child instance.
   */
  abstract createChildren(
    type: number,
    uri: vscode.Uri
  ): EditorSectionBase | undefined;

  /**
   * Resets this editor section instance configuration based on the current atributes.
   *
   * This method must be used every time the attributes changes.
   */
  protected abstract _reset(): void;

  /**
   * Editor section type.
   */
  get type() {
    return this._type;
  }

  /**
   * Editor section priority.
   */
  get priority() {
    return this._priority;
  }

  /**
   * Editor section children.
   */
  get children() {
    return this._children;
  }

  /**
   * Editor section parent.
   */
  get parent() {
    return this._parent;
  }

  /**
   * Sets this instance prioriry to the given ``priority`` value.
   * @param priority Editor section priority.
   */
  setPriority(priority: number) {
    this._priority = priority;
  }

  /**
   * Sets this instance parent reference to the given ``section``.
   *
   * If the given ``section`` is invalid or it is ``undefined`` the parent reference is set to ``undefined``.
   *
   * If this instance parent was set previously and the given ``section`` is valid:
   *  - This instance is automatically removed from the previous parent children list.
   *  - This instance parent reference will be updated to the new one.
   *
   * **Note: The given ``section`` must have this instance in their children list, otherwise the parent reference won't be updated.**
   * @param section Editor section instance.
   */
  setParent(section: EditorSectionBase | undefined) {
    // Updates the parent only if this instance is relative to the parent.
    if (section?.hasChild(this)) {
      // Removes this instance from the previous parent (if it exists)
      this.delete();
      // Updates the parent.
      this._parent = section;
    } else {
      this._parent = undefined;
    }
    this._parent = section;
  }

  /**
   * Sets this editor section description text on the tree view.
   *
   * When true, it is derived from resourceUri and when falsy, it is not shown.
   * @param description Description.
   */
  setDescription(description?: string | boolean) {
    this.description = description;
  }

  /**
   * Sets this editor section tooltip text on the tree view.
   *
   * The tooltip text when you hover over this item.
   * @param tooltip Tooltip.
   */
  setTooltip(tooltip?: string) {
    this.tooltip = tooltip;
  }

  /**
   * Sets this editor section checkbox state.
   *
   * The checkbox is used to determine whether this editor section is loaded or not.
   * @param state Checkbox state.
   */
  setCheckboxState(state?: vscode.TreeItemCheckboxState | boolean) {
    if (state === undefined) {
      this.checkboxState = undefined;
    } else {
      this.checkboxState = state
        ? vscode.TreeItemCheckboxState.Checked
        : vscode.TreeItemCheckboxState.Unchecked;
    }
  }

  /**
   * Sets this script section collapsible state.
   * @param state Collapsible state.
   */
  setCollapsibleState(state?: vscode.TreeItemCollapsibleState) {
    this.collapsibleState = state;
  }

  /**
   * Sets this editor section tree item icon.
   * @param icon Tree item icon.
   */
  setIcon(icon?: vscode.ThemeIcon | vscode.Uri | string) {
    // The only way to not show an icon is using
    // { light: '', dark: '' } and not undefined.
    // When falsy, Folder Theme Icon is assigned,
    // if item is collapsible otherwise File Theme Icon.
    this.iconPath = icon ? icon : { light: '', dark: '' };
  }

  /**
   * Checks if this editor section is of the given ``type``.
   * @param type Editor section type.
   * @returns Whether it is the given type or not.
   */
  isType(type: number) {
    return this._type === type;
  }

  /**
   * Checks if this editor section path is the given ``uri`` path.
   * @param uri Uri path.
   * @returns Whether it is the given path or not.
   */
  isPath(uri: vscode.Uri) {
    return this.resourceUri.fsPath === uri.fsPath;
  }

  /**
   * Checks if this editor section instance is currently loaded.
   * @returns Whether it is loaded or not.
   */
  isLoaded() {
    return this.checkboxState === EditorSectionBase.Checkbox.Checked;
  }

  /**
   * Checks if this editor section instance is currently collapsed.
   *
   * If the instance cannot be collapsed it will always return ``false``.
   * @returns Whether is is collapsed or not.
   */
  isCollapsed() {
    return this.collapsibleState === EditorSectionBase.Collapsible.Collapsed;
  }

  /**
   * Checks if the given ``uri`` path is inmediate to this editor section uri path.
   *
   * Being inmediate means that ``uri`` could be a child of this section.
   *
   * If this instance does not have a path or the given path is ``undefined`` it returns ``false``.
   * @param uri Uri path.
   * @returns Whether it is inmediate of the path or not.
   */
  isInmediate(uri: vscode.Uri | undefined) {
    // Evaluates Uri path validness.
    if (!uri) {
      return false;
    }
    // Gets the relative path and check it.
    let relative = this.relative(uri);
    return this._tokenize(relative).length === 1;
  }

  /**
   * Checks if the given ``uri`` path is relative to this editor section uri path.
   *
   * Being relative means that this section could have the given Uri path as inmediate or nested child.
   *
   * For example:
   *
   * - This instance Uri path is: ``Scripts/Folder/``
   * - The given Uri path is: ``Scripts/Folder/Subfolder/file.rb``
   * - Relative path is: ``Subfolder/file.rb``
   *
   * In case the given path is ``undefined`` it returns ``false``.
   * @param uri Uri path.
   * @returns Whether it is relative of the path or not.
   */
  isRelative(uri: vscode.Uri | undefined) {
    // Evaluates Uri path validness.
    if (!uri) {
      return false;
    }
    // Checks for path relativeness
    return uri.fsPath.includes(this.resourceUri.fsPath);
  }

  /**
   * Checks if this editor section instance is the same as the given one.
   *
   * This method compares the attributes to check equality.
   * @param other Editor section instance.
   */
  isEqual(other: EditorSectionBase) {
    return (
      this._type === other.type &&
      this._priority === other.priority &&
      this._parent === other.parent &&
      this._children === other.children
    );
  }

  /**
   * Checks if this instance has the given ``section`` as a child instance.
   * @param section Editor section instance.
   * @returns Whether it is a child or not.
   */
  hasChild(section: EditorSectionBase) {
    return this._children.some((child) => {
      return child === section;
    });
  }

  /**
   * Checks if this instance has a child equal to the given ``section``.
   *
   * This method uses the ``isEqual()`` method to evaluate truthiness.
   * @param section Editor section instance.
   * @returns Whether it has an equal child instance or not.
   */
  hasChildEqual(section: EditorSectionBase) {
    return this._children.some((child) => {
      return child.isEqual(section);
    });
  }

  /**
   * Checks if this instance has a child instance with the given ``path``.
   * @param uri Uri path.
   * @returns Whether it has a child with the given path or not.
   */
  hasChildPath(uri: vscode.Uri) {
    return this.findChild(uri) !== undefined;
  }

  /**
   * Checks if this editor section instance has children instances or not.
   * @returns Whether it has children or not.
   */
  hasChildren() {
    return this._children.length > 0;
  }

  /**
   * Gets the relative path from this editor section to the given ``uri`` path.
   * @param uri Uri Path.
   * @returns Relative path.
   */
  relative(uri: vscode.Uri): string {
    return pathing.relative(this.resourceUri, uri);
  }

  /**
   * Recursively returns all nested child instances from this editor section.
   * @returns Nested editor section instances.
   */
  nestedChildren(): EditorSectionBase[] {
    let children: EditorSectionBase[] = [];
    this._children.forEach((section) => {
      if (section.hasChildren()) {
        children.push(section, ...section.nestedChildren());
      } else {
        children.push(section);
      }
    });
    return children;
  }

  /**
   * Renames this section instance with the given information.
   *
   * To avoid inconsistencies:
   *  - The given path must be inmediate to this instance's parent path.
   *    - This way an editor section path won't be updated outside of the parent's bounds.
   * - It must not already exists a editor section with the same path.
   * @param info Information.
   * @throws An error when operation fails.
   */
  rename(info: EditorSectionInfo): void {
    //Checks information validness.
    if (this._parent) {
      if (!this._parent.isRelative(info.uri)) {
        throw new Error(
          `Failed to rename this instance, path: "${info.uri.fsPath}" is not relative to the parent!`
        );
      }
      if (this._parent.hasChildPath(info.uri)) {
        throw new Error(
          `Failed to rename this instance, the given path exists already in the parent!`
        );
      }
    }
    // Updates section information
    this.resourceUri = info.uri;
    this.label = info.label;
  }

  /**
   * Clears this instance children list.
   *
   * All children instances will be removed and their parent references nullified.
   */
  clear() {
    // Nullifies parent references
    this._children.forEach((child) => {
      child.setParent(undefined);
    });
    // Resets children list
    this._children = [];
  }

  /**
   * Deletes this instance from the parent's children list, if it exists.
   *
   * @returns The deleted instance.
   */
  delete() {
    return this._parent?.deleteChild(this);
  }

  moveChildren(target: number, ...children: EditorSectionBase[]) {
    // TODO: finish move method
    // Checks if the given children are in the list
    if (!children.every((child) => this.hasChild(child))) {
      return;
    }
    // Gets the proper index
    let index = -1;
    if (target < 0) {
      index = 0;
    } else if (target >= this._children.length) {
      index = this._children.length - 1;
    }
    let temp = this._children.splice(index);
    // Updates the priority of all child instances based on the target
    children.forEach((child, i) => {
      child.setPriority(index + i);
    });
    // Updates temporal child instances priority.
    temp.forEach((child, i) => {
      child.setPriority(index + i + children.length);
    });
    this._children.push(...children);
    this._children.push(...temp);
  }

  /**
   * Returns the child instance that matches the given ``uri`` path.
   *
   * If the ``nested`` flag is set, it will search each child recursively until found.
   *
   * If no script section is found, it returns ``undefined``.
   * @param uri Uri path.
   * @param nested Nested flag.
   * @returns Child instance.
   */
  findChild(uri: vscode.Uri, nested?: boolean) {
    let child: EditorSectionBase | undefined = undefined;
    if (this.isInmediate(uri)) {
      // Child target should be an inmediate child of this instance.
      child = this._children.find((section) => {
        return section.isPath(uri);
      });
    } else if (nested) {
      // Child target could be nested.
      child = this.nestedChildren().find((section) => {
        return section.isPath(uri);
      });
    }
    return child;
  }

  /**
   * Returns all children instances that meets the condition specified in the ``callback`` function.
   *
   * If the ``nested`` flag is set, it will apply the filter for each child recursively.
   * @param callback Callback function.
   * @param nested Nested flag.
   * @returns Children instances.
   */
  filterChildren(
    callback: (
      value: EditorSectionBase,
      index: number,
      array: EditorSectionBase[]
    ) => boolean,
    nested?: boolean
  ) {
    let children: EditorSectionBase[] = [];
    if (nested) {
      children = this.nestedChildren().filter(callback);
    } else {
      children = this._children.filter(callback);
    }
    return children;
  }

  /**
   * Creates a string of this editor section instance.
   * @returns Editor section stringified.
   */
  toString(): string {
    return `${this.label}`;
  }

  /**
   * Creates a list of path elements by the given ``item``.
   *
   * This method splits ``path`` with the current OS path separator.
   * @param item Path
   * @returns List of elements
   */
  private _tokenize(item: string) {
    return item.split(path.sep);
  }
}

/**
 * Editor section separator class.
 */
class EditorSectionSeparator extends EditorSectionBase {
  /**
   * Constructor.
   * @param uri Editor section Uri path.
   */
  constructor(uri: vscode.Uri) {
    super(EditorSectionType.Separator, '', uri);
    this._reset();
  }

  setCheckboxState(
    state?: boolean | vscode.TreeItemCheckboxState | undefined
  ): void {
    // Forced so separators has no checkbox rendered
    super.setCheckboxState(undefined);
  }

  addChild(section: EditorSectionBase) {
    this._children = [];
  }

  deleteChild(section: EditorSectionBase): EditorSectionBase | undefined {
    return undefined;
  }

  createChild(type: number, uri: vscode.Uri): EditorSectionBase | undefined {
    return undefined;
  }

  createChildren(type: number, uri: vscode.Uri): EditorSectionBase | undefined {
    return undefined;
  }

  rename(info: EditorSectionInfo): void {
    super.rename({ label: '', uri: info.uri });
    this._reset();
  }

  protected _reset() {
    this.setDescription(undefined);
    this.setTooltip('Separator');
    this.setCollapsibleState(EditorSectionBase.Collapsible.None);
    this.setCheckboxState(undefined);
    this.setIcon(undefined);
    this.command = undefined;
  }
}

/**
 * Editor section script class.
 */
class EditorSectionScript extends EditorSectionBase {
  /**
   * Constructor.
   * @param uri Script resource Uri.
   */
  constructor(uri: vscode.Uri) {
    super(EditorSectionType.Script, path.parse(uri.fsPath).name, uri);
    this._reset();
  }

  addChild(section: EditorSectionBase): void {
    this._children = [];
  }

  deleteChild(section: EditorSectionBase): EditorSectionBase | undefined {
    return undefined;
  }

  createChild(type: number, uri: vscode.Uri): EditorSectionBase | undefined {
    return undefined;
  }

  createChildren(type: number, uri: vscode.Uri): EditorSectionBase | undefined {
    return undefined;
  }

  rename(info: EditorSectionInfo): void {
    super.rename({ label: path.parse(info.uri.fsPath).name, uri: info.uri });
    this._reset();
  }

  protected _reset() {
    this.setDescription(undefined);
    this.setTooltip(this.resourceUri.fsPath);
    this.setCollapsibleState(EditorSectionBase.Collapsible.None);
    this.setCheckboxState(this.isLoaded());
    this.setIcon(vscode.ThemeIcon.File);
    this.command = {
      title: 'Open Script File',
      command: 'vscode.open',
      arguments: [this.resourceUri],
    };
  }
}

/**
 * Editor section folder class.
 */
class EditorSectionFolder extends EditorSectionBase {
  /**
   * Constructor.
   * @param priority Folder priority.
   * @param uri Folder resource Uri.
   */
  constructor(uri: vscode.Uri) {
    super(EditorSectionType.Folder, path.parse(uri.fsPath).name, uri);
    this._reset();
  }

  addChild(section: EditorSectionBase): void {
    if (!this.isInmediate(section.resourceUri)) {
      throw new Error(
        `Cannot add: ${section}} as a child instance because it is not inmediate!`
      );
    }
    // Adds the new child instance.
    this._children.push(section);
    // Updates the priority
    section.setPriority(this._children.length);
    // Updates the parent reference.
    section.setParent(this);
    // Sort list
    this._children.sort((a, b) => a.priority - b.priority);
  }

  deleteChild(section: EditorSectionBase): EditorSectionBase | undefined {
    let index = this._children.indexOf(section);
    if (index !== -1) {
      let child = this._children.splice(index, 1)[0];
      child.setParent(undefined); // nullifies parent reference
      return child;
    }
    return undefined;
  }

  createChild(type: number, uri: vscode.Uri): EditorSectionBase | undefined {
    if (!this.isInmediate(uri)) {
      return undefined;
    }
    // Child creation
    let child = this.findChild(uri);
    if (!child) {
      switch (type) {
        case EditorSectionType.Separator: {
          child = new EditorSectionSeparator(uri);
          this.addChild(child);
          break;
        }
        case EditorSectionType.Folder: {
          child = new EditorSectionFolder(uri);
          this.addChild(child);
          break;
        }
        case EditorSectionType.Script: {
          child = new EditorSectionScript(uri);
          this.addChild(child);
          break;
        }
      }
    }
    return child;
  }

  createChildren(type: number, uri: vscode.Uri): EditorSectionBase | undefined {
    // End reached, children creation must have been done by now.
    if (!this.isRelative(uri)) {
      return undefined;
    }
    // Child creation
    let child = this.createChild(type, uri);
    if (!child) {
      // Child does not exists, create parent first.
      let parent = this.createChildren(
        EditorSectionType.Folder,
        vscode.Uri.file(pathing.dirname(uri))
      );
      if (parent) {
        child = parent.createChildren(type, uri);
      }
    }
    return child;
  }

  rename(info: EditorSectionInfo): void {
    super.rename({ label: path.parse(info.uri.fsPath).name, uri: info.uri });
    this._reset();
  }

  protected _reset() {
    this.setDescription(undefined);
    this.setTooltip(this.resourceUri.fsPath);
    this.setCollapsibleState(
      this.isCollapsed()
        ? EditorSectionBase.Collapsible.Collapsed
        : EditorSectionBase.Collapsible.Expanded
    );
    this.setCheckboxState(this.isLoaded());
    this.setIcon(vscode.ThemeIcon.Folder);
    this.command = undefined;
  }
}

/**
 * Scripts controller class.
 */
export class ScriptsController
  implements vscode.TreeDragAndDropController<EditorSectionBase>
{
  /**
   * Determines that the RPG Maker scripts bundle file was not extracted.
   */
  public static readonly SCRIPTS_NOT_EXTRACTED = 100;

  /**
   * Determines that all scripts inside the project's bundle file were extracted.
   */
  public static readonly SCRIPTS_EXTRACTED = 150;

  /**
   * Determines if the script loader bundle was created.
   */
  public static readonly LOADER_BUNDLE_CREATED = 200;

  /**
   * Determines if the bundle file using the extracted scripts was created.
   */
  public static readonly BUNDLE_CREATED = 300;

  /**
   * Extension configuration instance.
   */
  private _config?: Configuration;

  /**
   * Load order file Uri path.
   */
  private _loadOrderFilePath?: vscode.Uri;

  /**
   * Scripts folder watcher.
   */
  private _watcher?: vscode.FileSystemWatcher;

  /**
   * Script section root instance.
   */
  private _root?: EditorSectionFolder;

  /**
   * UTF-8 text decoder instance.
   */
  private _textDecoder: TextDecoder;

  /**
   * Drop accepted MIME types.
   */
  dropMimeTypes: readonly string[] = ['application/rgss.script.editor'];

  /**
   * Drag accepted MIME types.
   */
  dragMimeTypes: readonly string[] = ['application/rgss.script.editor'];

  /**
   * Constructor.
   */
  constructor() {
    this._textDecoder = new TextDecoder('utf8');
  }

  /**
   * Load order file Uri path.
   */
  get loadOrderFilePath() {
    return this._loadOrderFilePath;
  }

  /**
   * Root editor section instance.
   */
  public get root() {
    return this._root;
  }

  /**
   * Gets the load order TXT file absolute path.
   *
   * It returns ``undefined`` in case path to the load order file cannot be determined.
   * @returns Absolute path to the load oder file.
   */
  getLoadOrderFilePath() {
    let scriptsFolderPath = this._config?.scriptsFolderPath;
    if (scriptsFolderPath) {
      return vscode.Uri.joinPath(scriptsFolderPath, LOAD_ORDER_FILE_NAME);
    }
    return undefined;
  }

  /**
   * Updates the scripts controller instance attributes.
   *
   * If the given configuration instance is valid, it restarts this controller.
   * @param config Configuration.
   */
  update(config: Configuration) {
    this._config = config;
    this._restart();
  }

  /**
   * Asynchronously checks if the current RPG Maker project has extracted all scripts from the bundle file previously.
   *
   * **The promise is resolved when the extraction is done with a code number.**
   *
   * **If the check fails it rejects the promise with an error instance.**
   * @returns A promise
   */
  async checkScripts(): Promise<number> {
    logger.logInfo(`Checking project's bundle scripts file status...`);
    // Checks configuration validness
    if (!this._config) {
      throw new Error(
        `Script controller has an invalid configuration instance!`
      );
    }
    let bundleFilePath = this._config.bundleFilePath?.fsPath;
    logger.logInfo(`Bundle file path is: "${bundleFilePath}"`);
    if (!bundleFilePath) {
      throw new Error('Cannot check bundle scripts due to invalid values!');
    }
    // Checks if there is scripts left
    let bundle = this._readBundleFile(bundleFilePath);
    if (this._checkValidExtraction(bundle)) {
      return ScriptsController.SCRIPTS_NOT_EXTRACTED;
    } else {
      return ScriptsController.SCRIPTS_EXTRACTED;
    }
  }

  /**
   * Asynchronously extracts the given RPG Maker bundle file to the scripts directory.
   *
   * This method will check first if the extraction is valid for the current project.
   *
   * The scripts folder is automatically created if it does not exists.
   *
   * The root editor section instance is automatically updated with the new instances.
   *
   * **The promise is resolved when the extraction is done with a code number.**
   *
   * **If the extraction was impossible it rejects the promise with an error.**
   * @returns A promise
   */
  async extractScripts(): Promise<number> {
    logger.logInfo('Extracting scripts from RPG Maker bundle file...');
    let bundleFilePath = this._config?.bundleFilePath;
    let scriptsFolderPath = this._config?.scriptsFolderPath;
    logger.logInfo(`Bundle file path is: "${bundleFilePath?.fsPath}"`);
    logger.logInfo(`Scripts folder path is: "${scriptsFolderPath?.fsPath}"`);
    // Checks bundle file path validness
    if (!bundleFilePath || !scriptsFolderPath) {
      throw new Error(`Cannot extract scripts due to invalid values!`);
    }
    // Extraction logic
    let bundle = this._readBundleFile(bundleFilePath.fsPath);
    if (this._checkValidExtraction(bundle)) {
      // Creates scripts folder if it does not exists.
      this._createScriptsFolder(scriptsFolderPath);

      // Perform extraction loop.
      for (let i = 0; i < bundle.length; i++) {
        // Ignores the loader script
        if (this._isExtensionLoader(bundle[i][0])) {
          continue;
        }
        let baseName = bundle[i][1] as string;
        let baseCode = bundle[i][2] as string;
        if (baseName.trim().length === 0 && baseCode.trim().length === 0) {
          // Untitled script and empty code block
          let uri = vscode.Uri.joinPath(
            scriptsFolderPath,
            EDITOR_SECTION_SEPARATOR_NAME
          );
          this._createSection(EditorSectionType.Separator, uri);
        } else if (baseName.trim().length === 0) {
          // Untitled script with code
          let uri = vscode.Uri.joinPath(
            scriptsFolderPath,
            `Untitled Script ${i}.rb`
          );
          let code = this._formatScriptCode(baseCode);
          this._createSection(EditorSectionType.Script, uri, code);
        } else {
          // Titled script
          let uri = vscode.Uri.joinPath(
            scriptsFolderPath,
            this._formatScriptName(baseName)
          );
          let code = this._formatScriptCode(baseCode);
          this._createSection(EditorSectionType.Script, uri, code);
        }
      }
      return ScriptsController.SCRIPTS_EXTRACTED;
    } else {
      return ScriptsController.SCRIPTS_NOT_EXTRACTED;
    }
  }

  /**
   * Asynchronously overwrites the RPG Maker bundle file to create the script loader inside of it.
   *
   * For security reasons, it always creates a backup file of the bundle file inside the given folder.
   *
   * **The promise is resolved when the creation is done with a code number.**
   *
   * **If the creation was impossible it rejects the promise with an error.**
   * @returns A promise
   */
  async createLoader(): Promise<number> {
    logger.logInfo('Creating script loader bundle file...');
    let bundleFilePath = this._config?.bundleFilePath;
    let backUpsFolderPath = this._config?.backUpsFolderPath;
    let scriptsFolderPath = this._config?.configScriptsFolder();
    let gameOutputFile = Configuration.GAME_OUTPUT_FILE;
    logger.logInfo(`RPG Maker bundle file path: "${bundleFilePath?.fsPath}"`);
    logger.logInfo(`Back ups folder path: "${backUpsFolderPath?.fsPath}"`);
    logger.logInfo(`Scripts folder relative path: "${scriptsFolderPath}"`);
    logger.logInfo(`Game output file: "${gameOutputFile}"`);
    if (
      !gameOutputFile ||
      !bundleFilePath ||
      !backUpsFolderPath ||
      !scriptsFolderPath
    ) {
      throw new Error(
        'Cannot create script loader bundle due to invalid values!'
      );
    }
    // Formats backup destination path.
    let backUpFilePath = vscode.Uri.joinPath(
      backUpsFolderPath,
      `${pathing.basename(bundleFilePath)} - ${this._currentDate()}.bak`
    );
    logger.logInfo(`Resolved back up file: ${backUpFilePath.fsPath}`);
    logger.logInfo('Backing up original RPG Maker bundle file...');
    // Create backup of the bundle file
    filesys.copyFile(bundleFilePath.fsPath, backUpFilePath.fsPath, {
      recursive: true,
      overwrite: true,
    });
    logger.logInfo('Back up completed!');
    logger.logInfo('Creating script loader bundle file...');
    // Create script loader bundle file
    let bundle: any[][] = [[]];
    bundle[0][0] = LOADER_SCRIPT_SECTION;
    bundle[0][1] = LOADER_SCRIPT_NAME;
    bundle[0][2] = zlib.deflateSync(
      this._scriptLoaderCode({
        scriptsFolder: scriptsFolderPath,
        scriptName: LOADER_SCRIPT_NAME,
        loadOrderFileName: LOAD_ORDER_FILE_NAME,
        errorFileName: gameOutputFile,
        skipCharacter: EDITOR_SECTION_SKIPPED_CHARACTER,
      }),
      {
        level: zlib.constants.Z_BEST_COMPRESSION,
        finishFlush: zlib.constants.Z_FINISH,
      }
    );
    // Marshalizes the bundle file contents
    let bundleMarshalized = marshal.dump(bundle, {
      hashStringKeysToSymbol: true,
    });
    // Overwrite bundle data
    fs.writeFileSync(bundleFilePath.fsPath, bundleMarshalized, {
      flag: 'w',
    });
    return ScriptsController.LOADER_BUNDLE_CREATED;
  }

  /**
   * Asynchronously updates the load order file within the scripts folder.
   *
   * This method will overwrite the load order file if it already exists.
   *
   * If the load order file creation was successful it resolves the promise with the number of scripts written.
   *
   * If the load order file couldn't be created it rejects the promise with an error.
   * @returns A promise.
   */
  async updateLoadOrderFile(): Promise<number> {
    // TODO: Hacer que este metodo se llama por cada 'refresh' que ocurra en la extension:
    //  - Cualquier modificacion del tree view
    //    -> Se cambia de nombre un fichero.
    //    -> Se activa/desactiva el checkbox de un fichero.
    //    -> Se elimina un fichero (que estaba activado)
    //    -> TBD...
    //
    // Dentro de la funcion refresh() de manager.ts, llamar a este metodo?
    logger.logInfo(`Updating load order file...`);
    logger.logInfo(
      `Load order file path: "${this._loadOrderFilePath?.fsPath}"`
    );
    if (!this._loadOrderFilePath) {
      throw new Error('Cannot create load order file due to invalid values!');
    }
    let loadOrder = this._root?.nestedChildren() || [];
    this._saveLoadOrder(loadOrder);
    return loadOrder.length;
  }

  /**
   * Asynchronously creates a RPG Maker bundle file.
   *
   * This method will create a packaged bundle file with all active scripts on the tree view.
   *
   * If ``destination`` already exists it throws an error to avoid overwriting the RPG Maker bundle file.
   *
   * **The promise is resolved when the creation is done with a code number.**
   *
   * **If the creation was impossible it rejects the promise with an error.**
   * @param destination Destination path
   * @returns A promise
   * @throws An error if creation fails.
   */
  async createBundle(destination: vscode.Uri): Promise<number> {
    logger.logInfo('Creating bundle file...');
    logger.logInfo(`Destination path: "${destination.fsPath}"`);
    if (!this._root) {
      throw new Error('Cannot create bundle file because root is undefined!');
    }
    // Gets all script section files enabled
    let checked = this._root.filterChildren((value) => {
      return value.isLoaded() && value.isType(EditorSectionType.Script);
    }, true);
    // Formats RPG Maker bundle
    let usedIds: number[] = [];
    let bundle: any[][] = [];
    checked.forEach((section, index) => {
      let id = this._generateScriptId(usedIds);
      let name = this._deformatScriptName(section.resourceUri.fsPath);
      let code = fs.readFileSync(section.resourceUri.fsPath, {
        encoding: 'utf8',
      });
      // Create new bundle section
      bundle[index] = [];
      bundle[index][0] = id;
      bundle[index][1] = name;
      bundle[index][2] = zlib.deflateSync(code, {
        level: zlib.constants.Z_BEST_COMPRESSION,
        finishFlush: zlib.constants.Z_FINISH,
      });
      usedIds.push(id);
    });
    // Marshalizes the bundle file contents
    let bundleMarshalized = marshal.dump(bundle, {
      hashStringKeysToSymbol: true,
    });
    // Creates bundle file (throws error if it exists)
    fs.writeFileSync(destination.fsPath, bundleMarshalized, {
      flag: 'wx',
    });
    return ScriptsController.BUNDLE_CREATED;
  }

  /**
   * Checks if this scripts controller instance is currently disposed or not.
   * @returns Whether the controller is disposed.
   */
  isDisposed(): boolean {
    return this._watcher === undefined;
  }

  /**
   * Disposes this scripts controller.
   */
  dispose() {
    this._watcher?.dispose();
    this._watcher = undefined;
  }

  /**
   * Handles a drag operation in the tree.
   * @param source List of tree items
   * @param dataTransfer Data transfer
   * @param token Token
   */
  handleDrag(
    source: readonly EditorSectionBase[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    logger.logInfo('Dragging handler called!');
  }

  /**
   * Handles a drop operation on the tree.
   * @param target Target tree item
   * @param dataTransfer Data transfer
   * @param token Token
   */
  handleDrop(
    target: EditorSectionBase | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // TODO: Para poder dropear en secciones diferentes
    // EditorSectionBase deberia poder permitir añadir secciones que no sean relativas
    // ya que si se coge una seccion de nivel profundidad 1 y se dropea en un nivel de profundidad
    // de 3 o 4, por ejemplo, la clase EditorSectionBase deberia poder permitir añadir un item
    // que no sea relativo
    //
    // o incluso eliminar el metodo moveChildren() y modificar addChild() para poder añadir
    // un hijo en una posicion especifica de la array.
    //
    // de tal forma que la operacion de mover seria borrar los items que se quieren mover
    // de source y añadirlos en el target con la prioridad de target + 1
    logger.logInfo('Dropping handler called!');
  }

  /**
   * Restarts this instance based on the given
   *
   */
  private _restart() {
    let scriptsFolderPath = this._config?.scriptsFolderPath;
    // Checks scripts folder path validness
    if (!scriptsFolderPath) {
      return;
    }

    // Disposes previous values
    this.dispose();

    // Updates load order file path
    this._loadOrderFilePath = vscode.Uri.joinPath(
      scriptsFolderPath,
      LOAD_ORDER_FILE_NAME
    );

    // Create scripts folder path if it does not exists
    this._createScriptsFolder(scriptsFolderPath);

    // Updates the root script section
    this._root = new EditorSectionFolder(scriptsFolderPath);

    // Reads the load order file
    this._readLoadOrder();

    // Creates the watcher instance
    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(scriptsFolderPath, '**')
    );

    // Sets the watcher callbacks
    this._watcher.onDidCreate((uri) => this._onDidCreate(uri));
    this._watcher.onDidChange((uri) => this._onDidChange(uri));
    this._watcher.onDidDelete((uri) => this._onDidDelete(uri));
  }

  /**
   * Event callback when something is created within the scripts folder.
   * @param uri Entry uri
   */
  private _onDidCreate(uri: vscode.Uri) {
    // TODO: Process entry create, possible valid cases:
    //  -> ``uri`` is the scripts folder.
    //  -> ``uri`` is load_order.txt
    //  -> ``uri`` is a folder.
    //  -> ``uri`` is a script section inside the scripts folder.
    logger.logInfo(`Entry created: ${uri.fsPath}`);
  }

  /**
   * Event callback when something is changed within the scripts folder.
   * @param uri Entry uri
   */
  private _onDidChange(uri: vscode.Uri) {
    // TODO: Process entry change, possible valid cases:
    //  -> ``uri`` is the scripts folder.
    //  -> ``uri`` is load_order.txt
    //  -> ``uri`` is a folder.
    //  -> ``uri`` is a script section inside the scripts folder.
    logger.logInfo(`Entry changed: ${uri.fsPath}`);
  }

  /**
   * Event callback when something is deleted within the scripts folder.
   * @param uri Entry uri
   */
  private _onDidDelete(uri: vscode.Uri) {
    // TODO: Process entry deletion, possible valid cases:
    //  -> ``uri`` is the scripts folder.
    //  -> ``uri`` is load_order.txt
    //  -> ``uri`` is a folder.
    //  -> ``uri`` is a script section inside the scripts folder.
    logger.logInfo(`Entry deleted: ${uri.fsPath}`);
  }

  private _createSection(type: number, uri: vscode.Uri, code?: string) {
    let child = this._root?.createChildren(type, uri);
    if (child) {
      child.setCheckboxState(true);
      // Create file if it does not exists
      if (!fs.existsSync(child.resourceUri.fsPath)) {
        switch (child.type) {
          case EditorSectionType.Separator: {
            // Separators are not real files.
            break;
          }
          case EditorSectionType.Script: {
            fs.writeFileSync(uri.fsPath, code || '', {
              encoding: 'utf8',
              flag: 'w',
            });
            break;
          }
          case EditorSectionType.Folder: {
            this._createScriptsFolder(uri);
            break;
          }
        }
      }
    }
  }

  /**
   * Reads the load order file to create editor sections.
   *
   * All valid lines will be inserted into the current root editor section if valid.
   *
   * If the load order file does not exists, it returns ``false``.
   * @returns Whether read operation was successful or not.
   */
  private _readLoadOrder() {
    // Checks for validness
    if (
      !this._root ||
      !this._loadOrderFilePath ||
      !fs.existsSync(this._loadOrderFilePath.fsPath)
    ) {
      return false;
    }

    // Gets all entries from the load order
    let lines = fs
      .readFileSync(this._loadOrderFilePath.fsPath, {
        flag: 'r',
        encoding: 'utf8',
      })
      .split('\n');

    for (let line of lines) {
      // Removes trailing and leading whitespaces.
      let entry = line.trim();

      // Skips empty lines.
      if (entry.length === 0) {
        continue;
      }

      // Gets whether section is skipped or not (checkbox is enabled/disabled)
      let sectionEnabled = !entry.startsWith(EDITOR_SECTION_SKIPPED_CHARACTER);

      // Gets the correct uri path based on the enable status.
      let sectionPath = sectionEnabled
        ? vscode.Uri.file(entry)
        : vscode.Uri.file(entry.slice(EDITOR_SECTION_SKIPPED_CHARACTER.length));
      if (!sectionPath.fsPath.includes(this._root.resourceUri.fsPath)) {
        // Entry needs to be joined to the root directory
        sectionPath = vscode.Uri.joinPath(
          this._root.resourceUri,
          sectionPath.fsPath
        );
      }

      // Gets the section type
      let sectionType = -1;
      if (filesys.isFolder(sectionPath.fsPath)) {
        // Path exists and it is a folder
        sectionType = EditorSectionType.Folder;
      } else if (filesys.isRubyFile(sectionPath.fsPath)) {
        // Path exists and it is a script
        sectionType = EditorSectionType.Script;
      } else if (sectionPath.fsPath.includes(EDITOR_SECTION_SEPARATOR_NAME)) {
        // Neither a file nor a folder, create a separator if valid.
        sectionType = EditorSectionType.Separator;
      }

      // Child creation
      if (sectionType !== -1) {
        let child = this._root.createChildren(sectionType, sectionPath);
        child?.setCheckboxState(sectionEnabled);
      }
    }
    return true;
  }

  /**
   * Saves all given sections into the load order file, overwriting it.
   *
   * This method creates the load order file if it does not exists.
   *
   * If no section is given it just creates an empty load order file.
   * @param sections List of editor sections.
   * @returns Whether the save operation was successful or not.
   */
  private _saveLoadOrder(sections?: EditorSectionBase[]): boolean {
    // Checks if the path to the load order is valid
    if (!this._root || !this._loadOrderFilePath) {
      return false;
    }
    // Creates the file if it does not exists
    let fd = fs.openSync(this._loadOrderFilePath.fsPath, 'w');
    // Write all of the given sections
    sections?.forEach((section) => {
      // Gets relative entry
      let entry = path.relative(
        this._root!.resourceUri.fsPath,
        section.resourceUri.fsPath
      );
      // Adds checkbox status
      entry = section.isLoaded()
        ? entry
        : EDITOR_SECTION_SKIPPED_CHARACTER + entry;
      // Writes entry to the load order
      fs.writeSync(fd, `${entry}\n`);
    });
    // Close file
    fs.closeSync(fd);
    return true;
  }

  /**
   * Creates the scripts folder on the given uri path.
   *
   * If the folder exists already it won't be created again.
   * @param scriptsFolder Uri path
   */
  private _createScriptsFolder(scriptsFolder: vscode.Uri) {
    if (!filesys.isFolder(scriptsFolder.fsPath)) {
      fs.mkdirSync(scriptsFolder.fsPath, { recursive: true });
    }
  }

  /**
   * Checks if the given script section corresponds to the extension's loader script.
   * @param scriptSection Script section
   * @returns Whether it is the script loader or not.
   */
  private _isExtensionLoader(scriptSection: number) {
    return scriptSection === LOADER_SCRIPT_SECTION;
  }

  /**
   * Checks the RPG Maker bundle file for any valid scripts left.
   *
   * This method ignores the script loader that this extension creates.
   *
   * Returns true if there are scripts in the bundle file that were not extracted previously.
   * @param bundle Bundle (marshalized)
   * @returns Whether extraction is valid or not.
   */
  private _checkValidExtraction(bundle: any[][]): boolean {
    return bundle.some((script) => {
      // Checks if it exists at least a valid script in the bundle array that is not the loader
      let section = script[0];
      if (this._isExtensionLoader(section)) {
        return false; // It is the loader
      } else if (typeof section === 'number') {
        return true; // At least a 'true' is needed
      }
      return false;
    });
  }

  /**
   * Reads the RPG Maker bundle file from the given path and marshalizes it.
   *
   * It returns the bundle data converted.
   *
   * This function may throw exceptions if the file does not exists.
   * @param bundleFile Bundle file absolute path
   * @returns The bundle data
   */
  private _readBundleFile(bundleFile: string): any[][] {
    let output: any[][] = [];
    // Read binary data
    let bundleContents = fs.readFileSync(bundleFile);
    // Marshalizes the bundle file contents
    let bundleMarshalized = marshal.load(bundleContents, {
      string: 'binary',
    }) as Array<Array<any>>;
    for (let i = 0; i < bundleMarshalized.length; i++) {
      output[i] = [];
      output[i][0] = bundleMarshalized[i][0];
      output[i][1] = this._textDecoder.decode(bundleMarshalized[i][1]);
      output[i][2] = zlib.inflateSync(bundleMarshalized[i][2]).toString('utf8');
    }
    return output;
  }

  /**
   * Gets the code of the script loader script.
   *
   * The script code body will be completed with the given ``config`` configuration instance.
   * @param config Script configuration.
   * @returns Loader script code
   */
  private _scriptLoaderCode(config: LoaderScriptConfig): string {
    return `#==============================================================================
# ** ${config.scriptName}
#------------------------------------------------------------------------------
# Version: 1.1.6
# Author: SnowSzn
# Github: https://github.com/SnowSzn/
# VSCode extension: https://github.com/SnowSzn/rgss-script-editor
#------------------------------------------------------------------------------
# This script is used to load all external script files from the scripts folder
# that was created using the VSCode extension.
#
# You don't have to modify anything here, the extension automatically creates
# this script after the extraction process is done successfully.
#
# Keep in mind that you shouldn't move or rename neither the scripts folder nor
# the load order TXT file used to load the scripts, since they are used to load
# all scripts files, otherwise this script won't know where to look for scripts.
#
# If for some reason, you want to move the scripts folder to another location
# and you have already extracted the scripts to the default path, you should
# follow these steps:
#   1. Go to the VSCode extension settings and modify the scripts folder path
#     - This option ID is: 'rgss-script-editor.external.scriptsFolder'
#   This is important, since if you don't do it properly, the extension will
#   be working with the same path as before.
#
#   2. Move the folder to the desired location.
#
#   3. Change this script's target folder location.
#   You must change the location where this script will look for script files.
#   You can do this in two ways:
#     - Changing the "SCRIPTS_PATH" value here in the ScriptLoaderConfiguration
#       module.
#     - Using the VSCode extension to re-create the script loader bundle file.
#       The command is: "Create Script Loader Bundle File"
#
# In case you accidentally deleted the scripts folder, you can recover use the
# backup file that was created before the extraction process was initialized
# though you will lose all the progress made that you may have done.
#==============================================================================

#
# VSCode Extension configuration.
#
# The values in this module are generated by the VSCode extension.
#
module ScriptLoaderConfiguration
  #
  # Path to the scripts folder inside the game project's folder.
  #
  # Note: The load order file is expected to exist inside this folder!
  #
  SCRIPTS_PATH = '${config.scriptsFolder.split(path.sep).join(path.posix.sep)}'
end

###############################################################################
#   DO NOT MODIFY ANYTHING BELOW THIS IF YOU DO NOT KNOW WHAT YOU ARE DOING   #
#   DO NOT MODIFY ANYTHING BELOW THIS IF YOU DO NOT KNOW WHAT YOU ARE DOING   #
#   DO NOT MODIFY ANYTHING BELOW THIS IF YOU DO NOT KNOW WHAT YOU ARE DOING   #
###############################################################################

#
# Script loader
#
module ScriptLoader
  include ScriptLoaderConfiguration
  
  # Script loader error message.
  LOAD_ERROR_MSG = "If you are reading this it's because something went "\\
  "horribly wrong when loading scripts.\\n\\nThe game couldn't load a single "\\
  "script file so that's why it will close after closing this message "\\
  "instantly.\\n\\nCheck the load order TXT file to make sure scripts written "\\
  "there exists!"
  
  #
  # Loader run logic
  #
  def self.run
    begin
      prepare
      @scripts = 0
      load_order_path = File.join(SCRIPTS_PATH, '${config.loadOrderFileName}')
      log("Running script loader...")
      log("Scripts folder path is: '#{SCRIPTS_PATH}'")
      log("Load order file path is: '#{load_order_path}'")
      log("Reading load order file...")
      load_order = File.read(load_order_path).split("\\n")
      # Start load order processing
      load_order.each do |script|
        load_script(script.strip)
      end
    rescue => e
      # Exception handling must work only in test/dev mode
      if test?
        # Notifies VSCode extension of the error
        File.open('${config.errorFileName}', 'w') do |file|
          file.write("#{e.to_s}\\n#{e.backtrace}")
        end
        # Raises again the exception to kill the process
        raise e
      end
    end
    # Post-load logic
    unless loaded_scripts > 0
      # Not a single script was loaded?
      raise StandardError.new(LOAD_ERROR_MSG)
    end
  end

  #
  # Loads the script.
  #
  # @param path [String] Script path
  #
  def self.load_script(path)
    # Handles the script
    if valid_entry?(path)
      log("Loading script: '#{path}'")
      @scripts = @scripts + 1
      Kernel.send(:require, path)
    else
      log("Skipping: '#{path}'")
    end
  end

  #
  # Prepares the module before attempting to run the loader.
  #
  def self.prepare
    scripts_path = File.directory?(SCRIPTS_PATH) ?
    SCRIPTS_PATH :
    File.join(Dir.pwd, SCRIPTS_PATH)
    # Pushes current working directory (XP and VX comp.)
    unless $:.include?('.')
      $:.push('.')
    end
    # Pushes external scripts directory
    unless $:.include?(scripts_path)
    $:.push(scripts_path)
    end
  end

  #
  # Checks if the given path is a valid entry to load.
  #
  # @param path [String] Path.
  #
  # @return [Boolean] Entry validness.
  #
  def self.valid_entry?(path)
    return false if path == nil
    return false if path[0] == '${config.skipCharacter}'
    return false unless File.extname(path).downcase == '.rb'
    return true
  end

  #
  # Gets the number of scripts that were loaded by this loader.
  #
  # @return [Integer] Number of scripts.
  #
  def self.loaded_scripts
    @scripts
  end

  #
  # Checks if the project's version is RGSS1.
  #
  # @return [Boolean] Project is RGSS1.
  #
  def self.rgss1?
    File.file?("Data/Scripts.rxdata")
  end

  #
  # Checks if the project's version is RGSS2.
  #
  # @return [Boolean] Project is RGSS2.
  #
  def self.rgss2?
    File.file?("Data/Scripts.rvdata")
  end
  
  #
  # Checks if the project's version is RGSS3.
  #
  # @return [Boolean] Project is RGSS3.
  #
  def self.rgss3?
    File.file?("Data/Scripts.rvdata2")
  end
  
  #
  # Checks if the game is currently running in test mode.
  #
  # @return [Boolean] Test mode.
  #
  def self.test?
    $DEBUG || $TEST || $BTEST
  end

  #
  # Logs the message.
  #
  # Logging is deactivated in RGSS1 and RGSS2 to avoid message box spam.
  #
  # @param message [String] Message.
  #
  def self.log(message)
    print "[RGSS Script Editor Loader] #{message}\\n" if rgss3?
  end
end

# Start loader processing
ScriptLoader.run
`;
  }

  /**
   * Generates a random number to be used as a script section ID for RPG Maker.
   *
   * This method makes sure to always generate a number below {@link RPG_MAKER_SECTION_MAX_VAL} value.
   *
   * The generated ID won't be any of the given list of sections IDs.
   * @param usedIds List of sections IDs
   * @returns A valid section
   */
  private _generateScriptId(usedIds: number[]): number {
    let section = 0;
    do {
      section = Math.floor(Math.random() * RPG_MAKER_SECTION_MAX_VAL);
    } while (usedIds.includes(section));
    return section;
  }

  /**
   * Formats the given script name to ensure compatibility with the extension.
   * @param scriptName Script name
   * @returns The script name processed.
   */
  private _formatScriptName(scriptName: string) {
    let script = this._removeInvalidCharacters(scriptName);
    // Appends extension if missing
    if (!script.toLowerCase().endsWith('.rb')) {
      script = script.concat('.rb');
    }
    return script;
  }

  /**
   * Deformats the given script name.
   *
   * If a path is passed it gets the name of the file and removes the extension.
   * @param scriptName Script name
   * @returns Deformatted script name.
   */
  private _deformatScriptName(scriptName: string) {
    let script = path.parse(scriptName).name;
    return script;
  }

  /**
   * Formats the script code body to ensure compatibility with the extension.
   * @param scriptCode Script code body
   * @returns The script code processed.
   */
  private _formatScriptCode(scriptCode: string): string {
    let script = '';
    if (!scriptCode.startsWith('# encoding: utf-8')) {
      // Ruby 1.9 (RGSS3) does not detects file encoding so it must be added inside to avoid crashes.
      script = `# encoding: utf-8\n${scriptCode}`;
    } else {
      // Code already contains encoding comment
      script = scriptCode;
    }
    return script;
  }

  /**
   * Removes any invalid characters from the given string and returns it.
   *
   * This function makes sure it does not have invalid characters for the OS and the extension.
   * @param item Item
   * @returns The processed item
   */
  private _removeInvalidCharacters(item: string): string {
    // Removes any invalid characters
    let processed = item.replace(INVALID_CHARACTERS, '');
    // Removes any trailing whitespaces left
    processed = processed.trim();
    return processed;
  }

  /**
   * Formats the current date and returns it as a string.
   * @returns Formatted date.
   */
  private _currentDate(): string {
    let date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    const hour = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}_${hour}.${minutes}.${seconds}`;
  }
}
