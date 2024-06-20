import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as marshal from '@hyrious/marshal';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as fileutils from '../utils/fileutils';
import { TextDecoder } from 'util';
import { Configuration } from '../utils/configuration';
import { logger } from '../utils/logger';

/**
 * Editor section instance type enumerator.
 */
export const enum EditorSectionType {
  /**
   * Represents a separator.
   */
  Separator = 1,

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
 * Script controller editor mode enumerator.
 */
export const enum ControllerEditorMode {
  MERGE = 1,
  MOVE,
}

/**
 * Controller create options type.
 */
type ControllerCreateOptions = {
  /**
   * Sets the checkbox state
   */
  checkboxState?: boolean;

  /**
   * Create contents.
   *
   * This is ignored for section that are not scripts.
   */
  contents?: string;

  /**
   * Whether to overwrite a editor section entry or not.
   */
  overwrite?: boolean;
};

/**
 * Controller editor section creation information type.
 */
type ControllerSectionInfo = {
  /**
   * Editor section type.
   */
  type: EditorSectionType;

  /**
   * Editor section uri path.
   */
  uri: vscode.Uri;

  /**
   * Editor section parent.
   */
  parent: EditorSectionBase;

  /**
   * Editor section priority value.
   *
   * If it is not given, child will have the maximum priority inside parent.
   */
  priority?: number;
};

/**
 * Script loader configuration type.
 *
 * This type is used to generate the script loader with the appropiate information.
 */
type LoaderScriptConfig = {
  /**
   * Scripts folder relative path.
   *
   * The path must be relative to the game's folder.
   */
  scriptsFolder: string;

  /**
   * Loader script name shown in the RPG Maker built-in editor.
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
   * The file that creates the loader with the error output of the game process.
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
const INVALID_CHARACTERS =
  /[\\/:\*\?"<>\|#▼■¬·ºª€¿¡¨´çñ☆“‘–ƒ„’…†‡ˆ‰Š‹ŒŽ•–—™š›œžŸ¢£¤¦§¨©®ª«¯°±²³µ¶¸¹»¼½¾ÆÅÄÃÐ×÷öøáéíóúÁÉÍÓÚ]|(\bCON\b|\bPRN\b|\bAUX\b|\bNUL\b|\bCOM[1-9]\b|\bLPT[1-9]\b)/g;

/**
 * Load order file name within the scripts folder.
 */
const LOAD_ORDER_FILE_NAME = 'load_order.txt';

/**
 * Name for the editor section separator instance.
 *
 * To avoid issues, it should include, at least, an invalid character from {@link INVALID_CHARACTERS} invalid character list.
 */
const EDITOR_SECTION_SEPARATOR_NAME = '*separator*';

/**
 * Contents to identify an RPG Maker script entry as a folder
 *
 * This will be used when extracting scripts to detect whether the entry is a folder or not.
 */
const EDITOR_SECTION_FOLDER_CONTENTS =
  '# RGSS Script Editor folder (PLEASE DO NOT MODIFY THIS SCRIPT AT ALL)';

/**
 * Character used to mark a editor section as skipped.
 *
 * To avoid issues, this character should be included inside the {@link INVALID_CHARACTERS} invalid character list.
 *
 * Also, make sure it is not present in other configuration constants (like {@link EDITOR_SECTION_SEPARATOR_NAME}).
 */
const EDITOR_SECTION_SKIPPED_CHARACTER = '#';

/**
 * Mininum priority value for all editor section instances.
 *
 * This minimum value is included in the range.
 *
 * The value ``0`` should not be used to avoid treating priorities as a falsy value.
 */
const EDITOR_SECTION_MIN_PRIORITY = 1;

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
  public static CheckState = vscode.TreeItemCheckboxState;

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
   * Editor section ID.
   */
  readonly id: crypto.UUID;

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
    this.id = crypto.randomUUID();
    this._priority = EDITOR_SECTION_MIN_PRIORITY;
    this._parent = undefined;
    this._children = [];
  }

  /**
   * Adds the given editor section instance as a new child of this one.
   *
   * @param section Editor section.
   */
  abstract addChild(section: EditorSectionBase): void;

  /**
   * Recursively creates a new child instance and automatically inserts it into the children list of this editor section.
   *
   * This method recursively creates all needed child instances to create the child with the given information.
   *
   * If the creation is not possible, it returns ``undefined``.
   *
   * For example:
   * If a child is created with the path ``./some/folder/file.rb`` but the child ``some`` and/or ``folder``
   * does not exists it will create it before the last child (in this case, ``file.rb``) is created.
   * @param type Editor section type.
   * @param uri Editor section Uri path.
   * @param priority Editor section priority.
   * @returns The last editor section child instance.
   */
  abstract createChild(
    type: EditorSectionType,
    uri: vscode.Uri,
    priority?: number
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
   * Gets the count of children instances of this editor section.
   * @returns Children list size.
   */
  getChildrenCount(): number {
    return this._children.length;
  }

  /**
   * Gets this editor section directory uri.
   * @returns Editor section directory
   */
  getDirectory(): vscode.Uri {
    return vscode.Uri.file(path.dirname(this.resourceUri.fsPath));
  }

  /**
   * Gets this editor section base name.
   * @returns Editor section name.
   */
  getBaseName(): string {
    return path.basename(this.resourceUri.fsPath);
  }

  /**
   * Gets this editor section file name without extension.
   * @returns Editor section file name.
   */
  getName(): string {
    return path.parse(this.resourceUri.fsPath).name;
  }

  /**
   * Sets this instance prioriry to the given ``priority`` value.
   *
   * The mininum priority value allowed is 1.
   * @param priority Editor section priority.
   */
  setPriority(priority: number) {
    this._priority =
      priority >= EDITOR_SECTION_MIN_PRIORITY
        ? priority
        : EDITOR_SECTION_MIN_PRIORITY;
  }

  /**
   * Sets this instance parent reference to the given ``section``.
   *
   * If no argument is given, it resets the parent reference to ``undefined``.
   * @param section Editor section instance.
   */
  setParent(section?: EditorSectionBase) {
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
        ? EditorSectionBase.CheckState.Checked
        : EditorSectionBase.CheckState.Unchecked;
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
    // When falsy, Folder Theme Icon is auto. assigned,
    // if item is collapsible, otherwise File Theme Icon.
    this.iconPath = icon ? icon : { light: '', dark: '' };
  }

  /**
   * Checks if this editor section is of the given ``type``.
   * @param type Editor section type.
   * @returns Whether it is the given type or not.
   */
  isType(type: EditorSectionType) {
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
   * Checks if this editor section path is the given ``uri`` path.
   *
   * This method performs a case insensitive comparison.
   * @param uri Uri path.
   * @returns Whether it is the given path or not.
   */
  isPathCaseCmp(uri: vscode.Uri) {
    return this.resourceUri.fsPath.toLowerCase() === uri.fsPath.toLowerCase();
  }

  /**
   * Checks if this editor section instance is currently loaded.
   * @returns Whether it is loaded or not.
   */
  isLoaded() {
    return this.checkboxState === EditorSectionBase.CheckState.Checked;
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
   * Checks if this editor section instance is currently expanded.
   *
   * If the instance cannot be expanded it will always return ``false``.
   * @returns Whether is is expanded or not.
   */
  isExpanded() {
    return this.collapsibleState === EditorSectionBase.Collapsible.Expanded;
  }

  /**
   * Checks if this editor section instance is the same as the given one.
   *
   * This method compares the attributes to check equality.
   * @param other Editor section instance.
   */
  isEqual(other: EditorSectionBase) {
    return (
      this.resourceUri === other.resourceUri &&
      this._type === other.type &&
      this._priority === other.priority &&
      this._parent === other.parent &&
      this._children === other.children
    );
  }

  /**
   * Checks if the given ``uri`` path is inmediate to this editor section uri path.
   * @param uri Uri path.
   * @returns Whether it is inmediate of the path or not.
   */
  isInmediate(uri: vscode.Uri) {
    let relative = this.relative(uri);
    let tokens = this._tokenize(relative);
    return tokens.length <= 1;
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
   * Checks if this editor section instance has children instances or not.
   * @returns Whether it has children or not.
   */
  hasChildren() {
    return this._children.length > 0;
  }

  /**
   * Gets the relative path from this editor section to the given ``uri`` path.
   * @param uri Uri Path.
   * @returns Relative uri path.
   */
  relative(uri: vscode.Uri) {
    return path.relative(this.resourceUri.fsPath, uri.fsPath);
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
   * Clears this instance children list.
   *
   * All children instances will be removed and their parent references nullified.
   *
   * This method does not remove each child entry from the filesystem.
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
   * Gets the max priority value between all children instances.
   *
   * If this editor section instance does not have children it returns ``undefined``.
   * @returns The max priority.
   */
  maxChildPriority() {
    return this.reduceChild((previous, current) => {
      return current.priority > previous.priority ? current : previous;
    })?.priority;
  }

  /**
   * Alternates this editor section load status checkbox.
   *
   * This method also updates the status of all child instances and the parent reference if it is valid.
   * @param state Checkbox state.
   */
  alternateLoad(state?: vscode.TreeItemCheckboxState | boolean) {
    // Updates this editor section checkbox
    this.setCheckboxState(state);
    // Performs the change on all children instances
    this._children.forEach((child) => {
      child.alternateLoad(state);
    });
  }

  /**
   * Renames this editor section instance uri path to ``uri``.
   *
   * The current tree item label will be updated using the new uri.
   *
   * This method updates all children to the new path in case this instance has children.
   * @param uri New uri path
   */
  rename(uri: vscode.Uri) {
    // Updates this instance information
    this.label = path.parse(uri.fsPath).name;
    this.resourceUri = uri;
    // Triggers reset
    this._reset();
    // Recursively updates children instances
    this._children.forEach((child) => {
      let childPath = vscode.Uri.joinPath(
        this.resourceUri,
        child.getBaseName()
      );
      child.rename(childPath);
    });
  }

  /**
   * Deletes the given editor section instance from the children list.
   *
   * If deletion was successful it returns the removed element.
   *
   * If the element is not found it returns ``undefined``.
   * @param section Editor section.
   * @returns Deleted element.
   */
  deleteChild(section: EditorSectionBase): EditorSectionBase | undefined {
    let index = this._children.indexOf(section);
    if (index !== -1) {
      let child = this._children.splice(index, 1)[0];
      child.setParent(undefined);
      return child;
    }
    return undefined;
  }

  /**
   * Deletes all of the given editor section instances from the children list.
   *
   * It returns an array with all removed instances.
   *
   * If no elements are found it returns an empty array.
   * @param sections List of editor sections.
   * @returns List of deleted elements.
   */
  deleteChildren(...sections: EditorSectionBase[]): EditorSectionBase[] {
    let deleted: EditorSectionBase[] = [];
    sections.forEach((section) => {
      let item = this.deleteChild(section);
      if (item) {
        deleted.push(item);
      }
    });
    return deleted;
  }

  /**
   * Returns the first child instance that evaluates the predicate as true, and undefined otherwise.
   *
   * This method calls the given ``predicate`` for each child instance until it finds one
   * where predicate returns ``true``. If such element is found it is returned inmediately.
   *
   * If the ``nested`` flag is set, it will search each child recursively until found.
   * @param predicate Predicate function
   * @param nested Nested flag
   * @returns Child instance
   */
  findChild(
    predicate: (
      value: EditorSectionBase,
      index: number,
      obj: EditorSectionBase[]
    ) => boolean,
    nested?: boolean
  ) {
    if (nested) {
      return this.nestedChildren().find(predicate);
    } else {
      return this._children.find(predicate);
    }
  }

  /**
   * Returns all children instances that meets the condition specified in the ``predicate`` function.
   *
   * If the ``nested`` flag is set, it will apply the filter for each child recursively.
   * @param predicate Predicate function
   * @param nested Nested flag.
   * @returns Children instances.
   */
  filterChildren(
    predicate: (
      value: EditorSectionBase,
      index: number,
      array: EditorSectionBase[]
    ) => boolean,
    nested?: boolean
  ) {
    if (nested) {
      return this.nestedChildren().filter(predicate);
    } else {
      return this._children.filter(predicate);
    }
  }

  /**
   * Calls the specified callback function for all the child instances.
   *
   * The return value of the callback function is the accumulated result.
   *
   * If this editor section instance does not have children, it returns ``undefined``.
   * @param callback Callback function
   * @param nested Nested flag.
   * @returns Child instance
   */
  reduceChild(
    callback: (
      previousValue: EditorSectionBase,
      currentValue: EditorSectionBase,
      currentIndex: number,
      array: EditorSectionBase[]
    ) => EditorSectionBase,
    nested?: boolean
  ) {
    let children = nested ? this.nestedChildren() : this._children;
    return children.length > 0 ? children.reduce(callback) : undefined;
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
    super.setCheckboxState(undefined);
  }

  isLoaded(): boolean {
    return true;
  }

  addChild(section: EditorSectionBase): void {
    this._children = [];
  }

  createChild(
    type: EditorSectionType,
    uri: vscode.Uri,
    priority?: number | undefined
  ): EditorSectionBase | undefined {
    return undefined;
  }

  rename(uri: vscode.Uri): void {
    super.rename(uri);
    this.label = '';
  }

  toString(): string {
    return 'Separator';
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
   * @param uri Editor section Uri path.
   */
  constructor(uri: vscode.Uri) {
    super(EditorSectionType.Script, path.parse(uri.fsPath).name, uri);
    this._reset();
  }

  addChild(section: EditorSectionBase): void {
    this._children = [];
  }

  createChild(
    type: EditorSectionType,
    uri: vscode.Uri,
    priority?: number | undefined
  ): EditorSectionBase | undefined {
    return undefined;
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
   * @param uri Editor section Uri path.
   */
  constructor(uri: vscode.Uri) {
    super(EditorSectionType.Folder, path.parse(uri.fsPath).name, uri);
    this._reset();
  }

  addChild(section: EditorSectionBase): void {
    // Do not add the same child instance twice.
    if (this.hasChild(section)) {
      return;
    }
    // Updates all children priority values
    this._children.forEach((child) => {
      if (child.priority >= section.priority) {
        child.setPriority(child.priority + 1);
      }
    });
    // Updates the parent reference.
    section.setParent(this);
    // Adds the new child instance.
    this._children.push(section);
    // Sort list by priority
    this._children = this._children.sort((a, b) => a.priority - b.priority);
  }

  createChild(
    type: EditorSectionType,
    uri: vscode.Uri,
    priority?: number
  ): EditorSectionBase | undefined {
    let child: EditorSectionBase | undefined = undefined;
    if (this.isInmediate(uri)) {
      switch (type) {
        case EditorSectionType.Separator: {
          child = new EditorSectionSeparator(uri);
          break;
        }
        case EditorSectionType.Folder: {
          // Folders and files are unique in the file system.
          child = this.findChild((value) => value.isPath(uri));
          child ||= new EditorSectionFolder(uri);
          break;
        }
        case EditorSectionType.Script: {
          // Folders and files are unique in the file system.
          child = this.findChild((value) => value.isPath(uri));
          child ||= new EditorSectionScript(uri);
          break;
        }
      }
      // Updates parent reference for later treatment.
      child.setParent(this);
    } else {
      // Create parent first if it does not exists
      let parent = this.createChild(
        EditorSectionType.Folder,
        vscode.Uri.file(path.dirname(uri.fsPath))
      );
      // Create child in parent (must be inmediate at this point)
      child = parent?.createChild(type, uri);
    }
    // Appends child with new priority if it does not exists already
    if (child && !child.parent?.hasChild(child)) {
      // Gets max priority so it gets appended at the end
      let maxPriority = child.parent?.maxChildPriority();
      // Determines child priority based on the argument
      let childPriority = priority
        ? priority
        : maxPriority
        ? maxPriority + 1
        : EDITOR_SECTION_MIN_PRIORITY;
      // Updates child
      child.setPriority(childPriority);
      child.parent?.addChild(child);
    }
    return child;
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
export class ScriptsController {
  /**
   * Determines that the RPG Maker scripts bundle file was not extracted.
   */
  public static readonly SCRIPTS_NOT_EXTRACTED = 100;

  /**
   * Determines that all scripts inside the project's bundle file were extracted.
   */
  public static readonly SCRIPTS_EXTRACTED = 150;

  /**
   * Determines that all scripts were imported successfully.
   */
  public static readonly SCRIPTS_IMPORTED = 180;

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
   * Script section root instance.
   */
  private _root: EditorSectionFolder;

  /**
   * Controller drop mode.
   */
  private _editorMode: ControllerEditorMode;

  /**
   * UTF-8 text decoder instance.
   */
  private _textDecoder: TextDecoder;

  /**
   * Constructor.
   */
  constructor() {
    this._root = new EditorSectionFolder(vscode.Uri.file('undefined'));
    this._editorMode = ControllerEditorMode.MERGE;
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
  get root() {
    return this._root;
  }

  /**
   * Controller drop mode.
   */
  get editorMode() {
    return this._editorMode;
  }

  /**
   * Gets the current drop mode as a string.
   * @returns Drop mode stringified
   */
  getEditorModeString() {
    switch (this._editorMode) {
      case ControllerEditorMode.MERGE:
        return 'Merge';
      case ControllerEditorMode.MOVE:
        return 'Move';
      default:
        return 'Unknown';
    }
  }

  /**
   * Gets the name of a separator.
   * @returns Separator name
   */
  getSeparatorName() {
    return EDITOR_SECTION_SEPARATOR_NAME;
  }

  /**
   * Sets the controller drop mode to the given value.
   * @param mode Drop mode
   */
  setEditorMode(mode: ControllerEditorMode) {
    this._editorMode = mode;
  }

  /**
   * Updates the scripts controller instance attributes.
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
   * @throws An error if checking is not possible
   */
  async checkScripts(): Promise<number> {
    logger.logInfo(`Checking project's bundle scripts file status...`);
    let bundleFilePath = this._config?.determineBundleFilePath();
    logger.logInfo(`Bundle file path is: "${bundleFilePath?.fsPath}"`);
    if (!bundleFilePath) {
      throw new Error('Cannot check bundle scripts due to invalid values!');
    }
    // Checks if there is scripts left
    let bundle = this._readBundleFile(bundleFilePath.fsPath);
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
   * @throws An error if extraction is not possible
   */
  async extractScripts(): Promise<number> {
    logger.logInfo('Extracting scripts from RPG Maker bundle file...');
    let bundleFilePath = this._config?.determineBundleFilePath();
    logger.logInfo(`Bundle file path is: "${bundleFilePath?.fsPath}"`);
    logger.logInfo(`Scripts root path is: "${this._root.resourceUri}"`);

    // Checks bundle file path validness
    if (!bundleFilePath) {
      throw new Error(`Cannot extract scripts due to invalid values!`);
    }

    // Reads bundle file (may throw an error if it does not exists)
    let bundle = this._readBundleFile(bundleFilePath.fsPath);
    // Checks whether extraction is valid or not
    if (!this._checkValidExtraction(bundle)) {
      // Extraction is not needed.
      return ScriptsController.SCRIPTS_NOT_EXTRACTED;
    }

    // Proceed with extraction creating the scripts folder if it does not exists.
    fileutils.createFolder(this._root.resourceUri.fsPath, {
      recursive: true,
      overwrite: false,
    });

    // Iterate through the bundle file extracting each script section
    for (let i = 0; i < bundle.length; i++) {
      // Ignores this extension loader script
      if (this._isExtensionLoader(bundle[i][0])) {
        continue;
      }
      // Determines the editor section info
      let sectionType = undefined;
      let sectionPath = undefined;
      let sectionCode = undefined;
      let baseScriptPath = path
        .dirname(bundle[i][1] as string)
        .split('/')
        .map((token) => {
          return this._removeInvalidCharacters(token);
        })
        .join(path.sep);
      let baseScriptName = path.basename(bundle[i][1] as string);
      let baseScriptCode = bundle[i][2] as string;
      if (baseScriptCode.trim().length === 0) {
        // Entry does not have code, could be either an script or a separator
        if (
          baseScriptName.trim().length === 0 ||
          baseScriptName.endsWith(this.getSeparatorName())
        ) {
          // Entry is a separator
          sectionType = EditorSectionType.Separator;
          sectionPath = vscode.Uri.joinPath(
            this._root.resourceUri,
            baseScriptPath,
            this.getSeparatorName()
          );
          sectionCode = undefined;
        } else {
          // Entry is an script with no code inside
          sectionType = EditorSectionType.Script;
          sectionPath = vscode.Uri.joinPath(
            this._root.resourceUri,
            baseScriptPath,
            baseScriptName.length > 0
              ? this._formatScriptName(baseScriptName)
              : `Untitled script at ${i}.rb`
          );
          sectionCode = undefined;
        }
      } else {
        if (baseScriptCode.trim() === EDITOR_SECTION_FOLDER_CONTENTS) {
          // Entry is a folder that was bundled previously
          sectionType = EditorSectionType.Folder;
          sectionPath = vscode.Uri.joinPath(
            this._root.resourceUri,
            baseScriptPath,
            baseScriptName.length > 0
              ? this._removeInvalidCharacters(baseScriptName)
              : `Untitled folder at ${i}`
          );
          sectionCode = undefined;
        } else {
          // Entry has code, it is an script
          sectionType = EditorSectionType.Script;
          sectionPath = vscode.Uri.joinPath(
            this._root.resourceUri,
            baseScriptPath,
            baseScriptName.length > 0
              ? this._formatScriptName(baseScriptName)
              : `Untitled script at ${i}.rb`
          );
          sectionCode = baseScriptCode;
        }
      }
      // Create the new section
      this.sectionCreate(
        {
          type: sectionType,
          uri: sectionPath,
          parent: this._root,
        },
        { contents: sectionCode, overwrite: true }
      );
    }
    return ScriptsController.SCRIPTS_EXTRACTED;
  }

  /**
   * Asynchronously imports all scripts inside the given RPG Maker bundle file.
   *
   * This method will read all scripts inside the bundle file and export it to the scripts directory.
   *
   * This method can overwrite existing scripts.
   * @param targetBundle Target bundle file
   * @returns A promise
   * @throws An error if import is not possible
   */
  async importScripts(targetBundle: vscode.Uri): Promise<number> {
    logger.logInfo(
      `Importing scripts from the bundle file: "${targetBundle.fsPath}"`
    );

    // Reads bundle file (may throw an error if it is not valid)
    let bundle = this._readBundleFile(targetBundle.fsPath);
    let basePath = this._root.resourceUri;
    if (!this._config?.configImportOverwrite()) {
      basePath = vscode.Uri.joinPath(
        this._root.resourceUri,
        `Import from ${path.parse(targetBundle.fsPath).name} bundle file`
      );
    }

    // Create the base path if it does not exists
    fileutils.createFolder(basePath.fsPath, {
      recursive: true,
      overwrite: false,
    });

    // Iterate through the bundle file extracting each script section
    for (let i = 0; i < bundle.length; i++) {
      // Ignores this extension loader script
      if (this._isExtensionLoader(bundle[i][0])) {
        continue;
      }
      // Determines the editor section info
      let sectionType = undefined;
      let sectionPath = undefined;
      let sectionCode = undefined;
      let baseScriptPath = path
        .dirname(bundle[i][1] as string)
        .split('/')
        .map((token) => {
          return this._removeInvalidCharacters(token);
        })
        .join(path.sep);
      let baseScriptName = path.basename(bundle[i][1] as string);
      let baseScriptCode = bundle[i][2] as string;
      if (baseScriptCode.trim().length === 0) {
        // Entry does not have code, could be either an script or a separator
        if (
          baseScriptName.trim().length === 0 ||
          baseScriptName.endsWith(this.getSeparatorName())
        ) {
          // Entry is a separator
          sectionType = EditorSectionType.Separator;
          sectionPath = vscode.Uri.joinPath(
            basePath,
            baseScriptPath,
            this.getSeparatorName()
          );
          sectionCode = undefined;
        } else {
          // Entry is an script with no code inside
          sectionType = EditorSectionType.Script;
          sectionPath = vscode.Uri.joinPath(
            basePath,
            baseScriptPath,
            baseScriptName.length > 0
              ? this._formatScriptName(baseScriptName)
              : `Untitled script at ${i}.rb`
          );
          sectionCode = undefined;
        }
      } else {
        if (baseScriptCode.trim() === EDITOR_SECTION_FOLDER_CONTENTS) {
          // Entry is a folder that was bundled previously
          sectionType = EditorSectionType.Folder;
          sectionPath = vscode.Uri.joinPath(
            basePath,
            baseScriptPath,
            baseScriptName.length > 0
              ? this._removeInvalidCharacters(baseScriptName)
              : `Untitled folder at ${i}`
          );
          sectionCode = undefined;
        } else {
          // Entry has code, it is an script
          sectionType = EditorSectionType.Script;
          sectionPath = vscode.Uri.joinPath(
            basePath,
            baseScriptPath,
            baseScriptName.length > 0
              ? this._formatScriptName(baseScriptName)
              : `Untitled script at ${i}.rb`
          );
          sectionCode = baseScriptCode;
        }
      }
      // Create the new section
      this.sectionCreate(
        {
          type: sectionType,
          uri: sectionPath,
          parent: this._root,
        },
        { checkboxState: false, contents: sectionCode, overwrite: true }
      );
    }
    return ScriptsController.SCRIPTS_IMPORTED;
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
   * @throws An error when creation is not possible
   */
  async createLoader(): Promise<number> {
    logger.logInfo('Creating script loader bundle file...');
    let bundleFilePath = this._config?.determineBundleFilePath();
    let scriptsFolderPath = this._config?.configScriptsFolder();
    let gameOutputFile = Configuration.GAME_OUTPUT_FILE;
    logger.logInfo(`RPG Maker bundle file path: "${bundleFilePath?.fsPath}"`);
    logger.logInfo(`Scripts folder relative path: "${scriptsFolderPath}"`);
    logger.logInfo(`Game output file: "${gameOutputFile}"`);
    if (!bundleFilePath || !scriptsFolderPath || !gameOutputFile) {
      throw new Error(
        'Cannot create script loader bundle due to invalid values!'
      );
    }
    // Checks if the backup is needed
    let oldBundle = this._readBundleFile(bundleFilePath.fsPath);
    if (this._checkValidExtraction(oldBundle)) {
      const backUpFilePath = this.formatBackUpPath(
        path.basename(bundleFilePath.fsPath)
      );
      logger.logInfo(`Resolved back up file: "${backUpFilePath?.fsPath}"`);
      if (!backUpFilePath) {
        throw new Error(
          `It was not possible to create a back up because the path: "${backUpFilePath}" is invalid!`
        );
      }
      logger.logInfo('Backing up original RPG Maker bundle file...');
      // Create backup of the bundle file
      fileutils.copyFile(bundleFilePath.fsPath, backUpFilePath.fsPath, {
        recursive: true,
        overwrite: true,
      });
      logger.logInfo('Back up completed!');
    } else {
      logger.logInfo(`A backup of the RPG Maker bundle file is not necessary!`);
    }
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
   * @throws An error when updating load order is not possible.
   */
  async updateLoadOrderFile(): Promise<number> {
    logger.logInfo(`Updating load order file...`);
    logger.logInfo(
      `Load order file path: "${this._loadOrderFilePath?.fsPath}"`
    );
    if (!this._loadOrderFilePath) {
      throw new Error('Cannot create load order file due to invalid values!');
    }
    let loadOrder = this._root.nestedChildren() || [];
    this._saveLoadOrder(loadOrder);
    return loadOrder.length;
  }

  /**
   * Asynchronously creates a RPG Maker bundle file.
   *
   * This method will create a packaged RPG Maker bundle file with all of the given editor sections
   *
   * This method creates all nested folders needed to create the bundle file.
   *
   * As a general rule, all script names will be standarized to use the ``/`` separator for compatibility.
   *
   * **The promise is resolved when the creation is done with a code number.**
   *
   * **If the creation was impossible it rejects the promise with an error.**
   * @param sections List of editor sections
   * @param destination Destination path
   * @returns A promise
   * @throws An error if creation fails.
   */
  async createBundle(
    sections: readonly EditorSectionBase[],
    destination: vscode.Uri
  ): Promise<number> {
    logger.logInfo('Creating bundle file...');
    logger.logInfo(`Destination path: "${destination.fsPath}"`);
    // Formats RPG Maker bundle
    let usedIds: number[] = [];
    let bundle: any[][] = [];
    sections.forEach((section, index) => {
      // Initializes the ID for a new section
      let id = this._generateScriptId(usedIds);
      // Standardises the name to use the same path separator for both Linux and Windows
      let name = this._root
        .relative(section.resourceUri)
        .split(path.sep)
        .join('/');
      // Formats the code based on the editor section
      let code = section.isType(EditorSectionType.Script)
        ? fs.readFileSync(section.resourceUri.fsPath, { encoding: 'utf8' })
        : section.isType(EditorSectionType.Folder)
        ? EDITOR_SECTION_FOLDER_CONTENTS
        : '';
      // Creates a new bundle section
      bundle[index] = [];
      bundle[index][0] = id;
      bundle[index][1] = name;
      bundle[index][2] = zlib.deflateSync(code, {
        level: zlib.constants.Z_BEST_COMPRESSION,
        finishFlush: zlib.constants.Z_FINISH,
      });
      // Remembers the recently-used unique ID
      usedIds.push(id);
    });
    // Marshalizes the bundle file contents
    let bundleMarshalized = marshal.dump(bundle, {
      hashStringKeysToSymbol: true,
    });
    // Creates the folder if it does not exists already
    fileutils.createFolder(path.dirname(destination.fsPath), {
      recursive: true,
      overwrite: false,
    });
    // Creates bundle file
    fs.writeFileSync(destination.fsPath, bundleMarshalized, {
      flag: 'w',
    });
    return ScriptsController.BUNDLE_CREATED;
  }

  /**
   * Creates a new editor section with the given information.
   *
   * This method makes sure that a file system entry exists for each editor section created.
   *
   * Due to Windows limitations, section names must be unique (case insensitive)
   * @param info New editor section information
   * @param options Options
   * @returns The new editor section
   * @throws An error when creation fails.
   */
  sectionCreate(
    info: ControllerSectionInfo,
    options?: ControllerCreateOptions
  ) {
    // Create child instance.
    let child = info.parent.createChild(info.type, info.uri, info.priority);
    // Process child instance is creation was successful
    if (child) {
      child.setCheckboxState(options?.checkboxState ?? true);
      // Creates file system entry
      if (options?.overwrite || !fs.existsSync(child.resourceUri.fsPath)) {
        switch (child.type) {
          case EditorSectionType.Separator: {
            // Separators are not real files.
            break;
          }
          case EditorSectionType.Script: {
            // Make sure folder exists if nested
            fileutils.createFolder(child.getDirectory().fsPath, {
              recursive: true,
              overwrite: false,
            });
            // Create file
            fs.writeFileSync(
              child.resourceUri.fsPath,
              this._formatScriptCode(options?.contents || ''),
              {
                encoding: 'utf8',
                flag: 'w',
              }
            );
            break;
          }
          case EditorSectionType.Folder: {
            fileutils.createFolder(child.resourceUri.fsPath, {
              recursive: true,
            });
            break;
          }
        }
      }
    }
    return child;
  }

  /**
   * Deletes the given ``target`` editor section instance.
   *
   * This method supports deleting folders recursively.
   * @param target Editor section
   * @returns Deleted section
   * @throws An error when deletion fails.
   */
  sectionDelete(target: EditorSectionBase) {
    let child = target.parent?.deleteChild(target);
    if (child) {
      // Deletes file system entry if it exists
      if (fs.existsSync(child.resourceUri.fsPath)) {
        switch (child.type) {
          case EditorSectionType.Separator: {
            // Separators are not real files.
            break;
          }
          case EditorSectionType.Script: {
            fs.unlinkSync(child.resourceUri.fsPath);
            break;
          }
          case EditorSectionType.Folder: {
            fs.rmSync(child.resourceUri.fsPath, { recursive: true });
            break;
          }
        }
      }
    }
    return child;
  }

  /**
   * Renames the given editor section instance to the specified uri.
   * @param target Editor section target
   * @param uri New uri path
   * @throws An error when renaming is not possible.
   */
  sectionRename(target: EditorSectionBase, uri: vscode.Uri) {
    switch (target.type) {
      case EditorSectionType.Separator: {
        // Separators are not real files.
        break;
      }
      case EditorSectionType.Folder:
      case EditorSectionType.Script: {
        let oldUri = target.resourceUri;
        // Renames section to the new uri path
        target.rename(uri);
        // Updates file system reference
        fs.renameSync(oldUri.fsPath, uri.fsPath);
        break;
      }
    }
  }

  /**
   * Moves all editor sections in ``source`` to the specified ``target`` editor section.
   * @param source List of editor sections
   * @param target Target editor section
   */
  sectionMove(source: EditorSectionBase[], target: EditorSectionBase) {
    // Verify source won't overwrite anything at target
    if (
      !source.every((section) => {
        const moveData = this.determineSectionInfo(
          section.type,
          section.getName(),
          target
        );
        const children =
          moveData?.parent.filterChildren((value) => {
            return (
              !value.isType(EditorSectionType.Separator) &&
              value.id !== section.id &&
              value.isPathCaseCmp(moveData.uri)
            );
          }) || [];
        return children.length === 0 && section.id !== target.id;
      })
    ) {
      throw new Error(
        `Cannot move sections because an editor section already exists at target!`
      );
    }

    // Valid move operation
    for (let section of source) {
      const info = this.determineSectionInfo(
        section.type,
        section.getName(),
        target
      );
      if (info) {
        // Determine priority
        let maxPriority = info.parent.maxChildPriority();
        let priority = info.priority
          ? info.priority
          : maxPriority
          ? maxPriority + 1
          : EDITOR_SECTION_MIN_PRIORITY;
        // Rename contents if not a separator (not real files)
        if (!section.isType(EditorSectionType.Separator)) {
          fs.renameSync(section.resourceUri.fsPath, info.uri.fsPath);
        }
        // Perform move operation
        section.parent?.deleteChild(section);
        section.setPriority(priority);
        section.rename(info.uri);
        info.parent.addChild(section);
      }
    }
  }

  /**
   * Alternates the current load status of the given editor section to the specified ``state``.
   * @param section Editor section
   * @param state New state
   */
  sectionAlternateLoad(
    section: EditorSectionBase,
    state: vscode.TreeItemCheckboxState | boolean
  ) {
    // Alternate based on type
    switch (section.type) {
      case EditorSectionType.Folder:
      case EditorSectionType.Script: {
        section.alternateLoad(state);
        break;
      }
    }
  }

  /**
   * Determines the information for a new editor section using the given arguments.
   *
   * This method will use the current editor mode to determine the appropiate information.
   * @param type Editor section type
   * @param name Editor section name
   * @param target Target section
   * @returns Editor section information.
   */
  determineSectionInfo(
    type: EditorSectionType,
    name: string,
    target: EditorSectionBase
  ): ControllerSectionInfo | undefined {
    // Editor section information
    let sectionUri: vscode.Uri | undefined = undefined;
    let sectionParent: EditorSectionBase | undefined = undefined;
    let sectionPriority: number | undefined = undefined;

    // Determines parent section
    if (target === this._root) {
      // In case target is root, always treat it as a merge operation
      // to avoid files being created outside the tracked root folder
      sectionParent = target;
    } else {
      // Target is inside the root folder.
      // Determines the parent reference based on the editor mode
      if (this._editorMode === ControllerEditorMode.MERGE) {
        if (target.isType(EditorSectionType.Folder)) {
          // Merge inside folder
          sectionParent = target;
        } else {
          // Merge is not available for types that are not folders
          sectionParent = target.parent;
          sectionPriority = target.priority + 1;
        }
      } else if (this._editorMode === ControllerEditorMode.MOVE) {
        // Always avoid merge operations
        sectionParent = target.parent;
        sectionPriority = target.priority + 1;
      } else {
        // Unsupported editor mode
        sectionParent = undefined;
      }
    }

    // Checks parent validness
    if (!sectionParent) {
      return undefined;
    }

    // Determines new section uri using the parent reference
    sectionUri = this.determineSectionUri(
      sectionParent.resourceUri,
      type,
      name
    );

    return {
      type: type,
      uri: sectionUri,
      parent: sectionParent,
      priority: sectionPriority,
    };
  }

  /**
   * Determines the uri path based on the parent instance and the given type and name.
   * @param parent Parent uri path
   * @param type Editor section type
   * @param name Editor section name
   * @returns The formatted uri path
   */
  determineSectionUri(
    parent: vscode.Uri,
    type: EditorSectionType,
    name: string
  ) {
    let sectionName = name;
    // Processes the name based on the type
    switch (type) {
      case EditorSectionType.Separator: {
        sectionName = this.getSeparatorName();
        break;
      }
      case EditorSectionType.Folder: {
        sectionName = this._removeInvalidCharacters(name);
        break;
      }
      case EditorSectionType.Script: {
        sectionName = this._formatScriptName(name);
        break;
      }
    }
    // Formats uri path
    return vscode.Uri.joinPath(parent, sectionName);
  }

  /**
   * Determines the appropiate editor section type based on the given uri path.
   *
   * This method won't check if the section exists.
   *
   * If the type cannot be determined it returns ``null``.
   * @param uri Uri section path.
   * @returns The appropiate editor section type
   */
  determineSectionType(uri: vscode.Uri) {
    if (uri.fsPath.endsWith(this.getSeparatorName())) {
      // Uri path references a separator
      return EditorSectionType.Separator;
    } else if (fileutils.isRubyFileLike(uri.fsPath)) {
      // Uri path references a Ruby file
      return EditorSectionType.Script;
    } else if (fileutils.isFolderLike(uri.fsPath)) {
      // Uri path references a folder
      return EditorSectionType.Folder;
    } else {
      return null;
    }
  }

  /**
   * Validates the given uri.
   *
   * It returns ``true`` if the given uri is valid, otherwise ``false``.
   *
   * The parent is used to validate the uri inside the specified editor section.
   *
   * Being valid means that parent does not have a child with the same uri path.
   *
   * Due to Windows limitations, the validation is case insensitive.
   * @param parent Parent editor section
   * @param uri Editor section uri
   * @returns Uri validness
   */
  validateUri(parent: EditorSectionBase, uri: vscode.Uri) {
    let child = parent.findChild((value) => {
      return value.isPathCaseCmp(uri);
    });
    // Checks existence
    return !child;
  }

  /**
   * Validates the given name.
   *
   * It returns ``true`` if the given name is valid, otherwise ``false``.
   * @param name Item name
   * @returns Whether name is valid or not.
   */
  validateName(name: string) {
    return !name.match(INVALID_CHARACTERS);
  }

  /**
   * Matches extension's invalid characters on the given string.
   * @param str String
   * @returns The match
   */
  matchInvalidCharacters(str: string) {
    return str.match(INVALID_CHARACTERS);
  }

  /**
   * Creates a back up uri path with the given filename.
   *
   * If the back up path cannot be determined, it returns ``undefined``.
   * @param filename File name
   * @returns The formatted back up uri path
   */
  formatBackUpPath(filename: string) {
    const backUpsFolderPath = this._config?.determineBackupsPath();
    // Checks back up path validness
    if (!backUpsFolderPath) {
      return undefined;
    }
    // Formats and returns the back up URI path
    return vscode.Uri.joinPath(
      backUpsFolderPath,
      `${filename} - ${this._currentDate()}.bak`
    );
  }

  /**
   * Restarts this instance based on the current attributes.
   */
  private _restart() {
    let scriptsFolderPath = this._config?.determineScriptsPath();
    // Checks scripts folder path validness
    if (!scriptsFolderPath) {
      return;
    }

    // Clears previous editor section root instance
    this._root.clear();
    this._root.rename(scriptsFolderPath);

    // Updates load order file path
    this._loadOrderFilePath = vscode.Uri.joinPath(
      scriptsFolderPath,
      LOAD_ORDER_FILE_NAME
    );

    // Create scripts folder path if it does not exists
    fileutils.createFolder(scriptsFolderPath.fsPath, { recursive: true });

    // Reads the load order file
    this._readLoadOrder();

    // Scans the scripts directory for new files
    this._scan();

    // Saves load order after reading and scanning
    this._saveLoadOrder(this._root.nestedChildren());
  }

  /**
   * Scans the root directory recursively for new editor sections.
   *
   * This method scans the scripts folder for new entries that were not on the load order.
   *
   * This can happen if the extension is disabled and a new Ruby file (or a folder) was created.
   *
   * This method is not needed to be called again after the first scan, since the file watcher will be handling this on runtime.
   */
  private _scan() {
    // Scans root directory for ruby files or folders.
    let entries = fileutils
      .readDirectory(
        this._root.resourceUri.fsPath,
        {
          recursive: true,
        },
        (entries) => {
          return entries.filter(
            (entry) => fileutils.isFolder(entry) || fileutils.isRubyFile(entry)
          );
        }
      )
      .map((entry) => vscode.Uri.file(entry));

    for (let entry of entries) {
      // Checks if entry is already created
      const section = this._root.findChild((value) => {
        return value.isPath(entry);
      }, true);
      if (section) {
        continue;
      }

      // Determines the type
      const type = this.determineSectionType(entry);
      if (type) {
        let child = this.sectionCreate({
          type: type,
          uri: entry,
          parent: this._root,
        });
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

      // Determine type
      let type = this.determineSectionType(sectionPath);

      // Child creation
      if (type) {
        let child = this.sectionCreate({
          type: type,
          uri: sectionPath,
          parent: this._root,
        });
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
    if (!this._loadOrderFilePath) {
      return false;
    }
    // Creates the file if it does not exists
    let fd = fs.openSync(this._loadOrderFilePath.fsPath, 'w');
    // Write all of the given sections
    for (const section of sections || []) {
      // Gets relative entry
      let entry = this._root.relative(section.resourceUri);
      // Adds checkbox status
      entry = section.isLoaded()
        ? entry
        : EDITOR_SECTION_SKIPPED_CHARACTER.concat(entry);
      // Writes entry to the load order
      fs.writeSync(fd, `${entry}\n`);
    }
    // Close file
    fs.closeSync(fd);
    return true;
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
   * @throws An error if ``bundleFile`` cannot be read/processed.
   */
  private _readBundleFile(bundleFile: string): any[][] {
    let output: any[][] = [];
    // Read binary data (may throw an error)
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
# Version: 1.3.2
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
#   1. Move the scripts folder to the desired location.
#
#   2. Go to the VSCode extension settings and modify the scripts folder path
#     - This option ID is: 'rgss-script-editor.external.scriptsFolder'
#   This is important, since if you don't do it properly, the extension will
#   be working with the same path as before.
#   The extension will automatically open the folder again with the new path.
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

###############################################################################
#   BACK UP YOUR CHANGES, THIS SCRIPT IS SUBJECT TO CHANGE BETWEEN UPDATES    #
#   BACK UP YOUR CHANGES, THIS SCRIPT IS SUBJECT TO CHANGE BETWEEN UPDATES    #
#   BACK UP YOUR CHANGES, THIS SCRIPT IS SUBJECT TO CHANGE BETWEEN UPDATES    #
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
  
  # Standard null output on Unix-like systems
  NULL_OUTPUT_UNIX = "/dev/null"

  # Standard null output on Windows system
  NULL_OUTPUT_WIN = "NUL"

  #
  # Reset script loader
  #
  class ResetLoader < StandardError; end

  #
  # Loader run logic
  #
  def self.run
    begin
      @scripts = 0
      ensure_file_descriptor_validness
      load_order_path = File.join(SCRIPTS_PATH, '${config.loadOrderFileName}')
      log("Running script loader...")
      log("Scripts folder path is: '#{SCRIPTS_PATH}'")
      log("Load order file path is: '#{load_order_path}'")
      log("Reading load order file...")
      load_order = File.read(load_order_path).split("\\n")
      # Start load order processing
      load_order.each do |script|
        load_script(script)
      end
    rescue ResetLoader
      log("Restarting script loader...")
      retry
    rescue => e
      # Notifies VSCode extension of the error
      File.open('${config.errorFileName}', 'wb') do |file|
        file.write(process_exception(e))
      end
      # Raises again the exception to kill the process
      raise e
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
    # Handles the script if valid
    if valid_entry?(path)
      log("Loading script: '#{path}'")
      @scripts = @scripts + 1
      script_file = process_path(path)
      loaded = Kernel.send(:require, script_file)
      # Forces a reload if it was loaded previously (ResetLoader exception)
      Kernel.send(:load, script_file) unless loaded
    else
      log("Skipping: '#{path}'")
    end
  end

  #
  # Processes the given path into an absolute path.
  # 
  # @param path [String] Script path.
  #
  # @return [String] Processed path.
  #
  def self.process_path(path)
    return File.expand_path(path, SCRIPTS_PATH)
  end

  #
  # Parses the given exception into a string.
  #
  # VSCode extension can interpret a hash with the following information:
  #   - type: Exception type.
  #   - mesg: Exception message.
  #   - back: Exception backtrace array.
  #
  # @param exception [Exception] Exception instance.
  #
  # @return [String] Exception stringified.
  #
  def self.process_exception(exception)
    return Marshal.dump({
      :type => "#{exception.class.name}",
      :mesg => "#{exception.message}",
      :back => exception.backtrace
    })
  end

  #
  # Gets the number of scripts that were loaded.
  #
  # @return [Integer] Number of scripts.
  #
  def self.loaded_scripts
    @scripts
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
    return false if starts_with?(path.strip, '${config.skipCharacter}')
    return false unless File.extname(path).downcase == '.rb'
    return true
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
  # Checks if the given string (str) starts with the specified substring
  #
  # @param str [String] String.
  # @param substr [String] Substring.
  #
  # @return [Boolean] String starts with substring.
  #
  def self.starts_with?(str, substr)
    return !(str =~ /^#{Regexp.escape(substr)}/).nil?
  end

  #
  # Ensures file descriptor validness to avoid Errno::EBADF errors
  #
  # Sometimes when the process is spawned it raises the following error:
  # Errno::EBADF - Bad file descriptor - <STDOUT> error.
  # This error happens when trying to write to the standard output
  # when running a game made in RPG Maker VX Ace (RGSS3) based on my tests.
  #
  # The only solution that I have found is to force reopening
  # the IO object to the windows console output
  #
  # I have not found a way to detect whether the game has allocated
  # a console or not, so the reopening is always executed.
  #
  # In case reopening fails, it is redirected to the null output
  # so it avoids crashes when using $stdout or $stderr.
  #
  def self.ensure_file_descriptor_validness
    begin
      # This only happens on RPG Maker VX Ace (RGSS3)
      if rgss3?
        $stdout.reopen("CONOUT$")
        $stderr.reopen("CONOUT$")
      end
    rescue Errno::EBADF
      if File.exist?(NULL_OUTPUT_UNIX)
        $stdout.reopen(NULL_OUTPUT_UNIX, 'a')
        $stderr.reopen(NULL_OUTPUT_UNIX, 'a')
      elsif File.exist?(NULL_OUTPUT_WIN)
        $stdout.reopen(NULL_OUTPUT_WIN, 'a')
        $stderr.reopen(NULL_OUTPUT_WIN, 'a')
      end
    end
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
   *
   * If a path is passed it gets the name before formatting it.
   * @param scriptName Script name
   * @returns The script name processed.
   */
  private _formatScriptName(scriptName: string) {
    let script = path.parse(scriptName).name;
    // Removes invalid characters
    script = this._removeInvalidCharacters(script);
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
      // Ruby 1.9 (RGSS3) does not detect file encoding so it must be added inside to avoid crashes.
      let eol = this._config?.determineFileEOL() || '\n';
      script = `# encoding: utf-8${eol}${scriptCode}`;
    } else {
      // Code already contains encoding comment
      script = scriptCode;
    }
    return script;
  }

  /**
   * Removes any invalid characters from the given string and returns it.
   *
   * It also removes any leading and trailing white space and line terminator characters.
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
    return `${year}.${month}.${day} - ${hour}.${minutes}.${seconds}`;
  }
}
