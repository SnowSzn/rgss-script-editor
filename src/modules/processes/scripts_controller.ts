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
};

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
 * Editor section instance configuration type.
 */
type EditorSectionInfoOld = {
  /**
   * Editor section type.
   */
  type: number;

  /**
   * Editor section tree item label.
   */
  label: string;

  /**
   * Editor section priority.
   */
  priority: number;

  /**
   * Absolute path to the editor section.
   */
  // path?: string;
  path: string;

  /**
   * Whether editor section is loaded or not.
   *
   * Being loaded means that the tree item checkbox is ticked.
   */
  loaded?: boolean;
};

/**
 * Editor section instance info type.
 */
type EditorSectionInfo = {
  /**
   * Editor section tree item label.
   */
  label?: string;

  /**
   * Editor section priority.
   */
  priority?: number;

  /**
   * Absolute path to the editor section entry.
   */
  path?: vscode.Uri;

  /**
   * Whether editor section is loaded or not.
   *
   * Being loaded means that the tree item checkbox is ticked.
   */
  loaded?: boolean;
};

/**
 * Unique script section for this extension's external scripts loader script.
 */
const LOADER_SCRIPT_SECTION = 133_769_420;

/**
 * Name of the script loader inside the RPG Maker bundled file.
 */
const LOADER_SCRIPT_NAME = 'RGSS Script Editor Loader';

/**
 * Load order file name within the scripts folder.
 */
const LOAD_ORDER_FILE_NAME = 'load_order.txt';

/**
 * Regexp of invalid characters for Windows, Linux-based systems and the script loader.
 */
const INVALID_CHARACTERS = /[\\/:\*\?"<>\|▼■]/g;

/**
 * Regexp to deformat a external script section name.
 *
 * Case insensitive.
 */
const DEFORMAT_SCRIPT_NAME = /(?:\d+\s*-\s*)?(.*)/i;

/**
 * Maximum value to generate a script section
 *
 * Sets as the maximum of the script loader to avoid a double section ID
 */
const SECTION_MAX_VAL = 133_769_419;

/**
 * Editor section tree item class.
 */
export class EditorSection extends vscode.TreeItem {
  /**
   * None collapsible state.
   */
  public static SectionNone = vscode.TreeItemCollapsibleState.None;

  /**
   * Collapsed collapsible state.
   */
  public static SectionCollapsed = vscode.TreeItemCollapsibleState.Collapsed;

  /**
   * Expanded collapsible state.
   */
  public static SectionExpanded = vscode.TreeItemCollapsibleState.Expanded;

  /**
   * Script section type.
   */
  readonly type: number;

  /**
   * Script section priority.
   */
  private _priority: number;

  /**
   * Script section children.
   */
  private _children: Array<EditorSection>;

  /**
   * Script section absolute path.
   */
  private _path: string;

  /**
   * Parent script section.
   */
  private _parent: EditorSection | undefined;

  /**
   * Constructor.
   * @param config Script section configuration.
   */
  constructor(config: EditorSectionInfoOld) {
    super(config.label);
    this.type = config.type;
    this._path = config.path;
    this._priority = config.priority;
    this.setCheckboxState(config.loaded);
    this._children = [];
    this._parent = undefined;
    this._restart();
  }

  /**
   * Script section absolute path.
   */
  get path() {
    return this._path;
  }

  /**
   * Script section priority value.
   */
  get priority() {
    return this._priority;
  }

  /**
   * Script section children.
   */
  get children() {
    return this._children;
  }

  /**
   * Script section parent.
   *
   * If this script section has no parent it returns ``undefined``.
   */
  get parent() {
    return this._parent;
  }

  /**
   * Gets this script section directory name
   * @returns Script section directory
   */
  getDirectory(): string {
    return pathing.dirname(this._path);
  }

  /**
   * Gets this script section item
   * @returns Script section item
   */
  getItem(): string {
    return pathing.basename(this._path);
  }

  /**
   * Gets the script section that matches the given ``path``.
   *
   * If no script section is found, it returns ``undefined``.
   * @param path Scrip section path.
   * @returns Script section.
   */
  getChild(path: string): EditorSection | undefined {
    if (!this.isFolder()) {
      return undefined;
    }
    return this._children.find((value) => {
      return value.matches(path);
    });
  }

  /**
   * Gets the nested script section that matches the given ``path``.
   *
   * If no script section is found, it returns ``undefined``.
   * @param path Scrip section path.
   * @returns Script section.
   */
  getNestedChild(path: string): EditorSection | undefined {
    if (!this.isFolder()) {
      return undefined;
    }
    // Search logic
    let child: EditorSection | undefined = undefined;
    if (this.isRelative(path)) {
      // Inmediate child
      child = this.getChild(path);
    } else {
      // Nested child
      for (let section of this._children) {
        child = section.getNestedChild(path);
        // Checks if found
        if (child) {
          break;
        }
      }
    }
    return child;
  }

  /**
   * Recursively gets a list of all nested child instances of this script section.
   * @returns List of child script sections.
   */
  getNestedChildren(): EditorSection[] {
    if (!this.isFolder()) {
      return [];
    }
    let nested: EditorSection[] = [];
    this._children.forEach((section) => {
      if (section.hasChildren()) {
        nested.push(section, ...section.getNestedChildren());
      } else {
        nested.push(section);
      }
    });
    return nested;
  }

  /**
   * Sets the parent of this script section to the given ``section``.
   *
   * The given script section ``section`` must be relative to this script section folder, otherwise it throws an error.
   * @param section Script section
   */
  setParent(section: EditorSection) {
    if (this.isRelative(section.path)) {
      this._parent = section;
    } else {
      throw new Error(
        `Cannot set script section: '${section.path}' to this script section because it is not relative!`
      );
    }
  }

  /**
   * Sets this script section description text on the tree view.
   * @param description Description.
   */
  setDescription(description: string | boolean) {
    this.description = description;
  }

  /**
   * Sets this script section tooltip text on the tree view.
   * @param tooltip Tooltip.
   */
  setTooltip(tooltip: string | undefined) {
    this.tooltip = tooltip;
  }

  /**
   * Sets this script section collapsible state.
   * @param state Collapsible state.
   */
  setCollapsibleState(state: vscode.TreeItemCollapsibleState) {
    this.collapsibleState = state;
  }

  /**
   * Sets this script section checkbox state.
   *
   * The checkbox is used to determine whether this script section should be loaded or not.
   * @param state Checkbox state.
   */
  setCheckboxState(state: vscode.TreeItemCheckboxState | boolean | undefined) {
    let check;
    if (typeof state === 'boolean' || typeof state === 'undefined') {
      check = state
        ? vscode.TreeItemCheckboxState.Checked
        : vscode.TreeItemCheckboxState.Unchecked;
    } else {
      check = state;
    }
    this.checkboxState = check;
  }

  /**
   * Checks if this script section instance checkbox is ticked or not.
   * @returns Whether script is loaded or not.
   */
  isLoaded(): boolean {
    return this.checkboxState === vscode.TreeItemCheckboxState.Checked;
  }

  /**
   * Checks if this script section instance is a Ruby folder.
   * @returns Whether this section is a folder.
   */
  isFolder(): boolean {
    return this.type === EditorSectionType.Folder;
  }

  /**
   * Checks if this script section instance is a Ruby script file.
   * @returns Whether this section is a script.
   */
  isFile(): boolean {
    return this.type === EditorSectionType.Script;
  }

  /**
   * Checks if this script section instance is a separator.
   * @returns Whether this section is a separator.
   */
  isSeparator(): boolean {
    return this.type === EditorSectionType.Separator;
  }

  /**
   * Checks if this script section instance is relative to the given ``path``.
   *
   * Being relative means that ``path`` could be an inmediate child of this section.
   * @param path Path.
   * @returns Whether this section is relative of the path.
   */
  isRelative(path: string): boolean {
    return this._tokenize(this.relative(path)).length === 1;
  }

  /**
   * Checks if this script section has children instances or not.
   * @returns Whether script section has children or not.
   */
  hasChildren(): boolean {
    return this._children.length > 0;
  }

  /**
   * Gets the relative path from this script section to the given path.
   * @param path Path.
   * @returns Relative path to the given path.
   */
  relative(path: string): string {
    return pathing.relative(this._path, path);
  }

  /**
   * Checks if this script section instance matches the given ``path``.
   * @param path Path.
   * @returns Whether this section matches the path.
   */
  matches(path: string): boolean {
    return this._path === path;
  }

  /**
   * Creates a new script section instance as a child of this one based on the given configuration ``config``.
   *
   * The given configuration must be valid for this method to create a new script section instance.
   *
   * If the creation fails it returns ``undefined``.
   *
   * **Note: Child instance is added automatically to this script section children list if valid.**
   *
   * @param config Script section configuration.
   * @returns Child instance.
   */
  createChild(config: EditorSectionInfoOld): EditorSection | undefined {
    // Ensures validness
    if (!this.isFolder() || !this.isRelative(config.path)) {
      return undefined;
    }
    // Child creation
    let child = this.getChild(config.path);
    if (!child) {
      child = new EditorSection(config);
      this.addChild(child);
    }
    return child;
  }

  /**
   * Creates a new script section instance as a child of this one based on the given configuration ``config``.
   *
   * This method will append all necessary child instances to the created script section as necessary.
   *
   * The path inside ``config`` must be reachable from this script section, otherwise it will return ``undefined``.
   *
   * **Child instance is added automatically to this script section if valid.**
   *
   * @param config Script section configuration.
   * @returns The new child
   */
  createChildren(config: EditorSectionInfoOld): EditorSection | undefined {
    // End reached, children creation must have been done by now.
    if (config.path === '.') {
      return undefined;
    }
    // Child creation
    let child = this.createChild(config);
    if (!child) {
      let parent = this.createChildren({
        path: pathing.dirname(config.path),
        label: config.label,
        type: config.type,
        priority: config.priority, // TODO: Determine priority correctly
        loaded: config.loaded,
      });
      if (parent) {
        child = parent.createChildren(config);
      }
    }
    return child;
  }

  /**
   * Adds the given script section as a child of this script section instance.
   *
   * To add a child, this instance must be a Ruby folder, otherwise it throws an error.
   *
   * This script section instance will be set as the parent of the given section automatically.
   * @param section Script section child
   */
  addChild(section: EditorSection) {
    // Avoids non-folders having children
    if (!this.isFolder()) {
      throw new Error(`Cannot add a child section to a file!`);
    }
    // Ensures validness
    if (!this.isRelative(section.path)) {
      throw new Error(
        `Cannot add child section: ${section} to this script section instance, because path is not relative!`
      );
    }
    // Updates parent reference
    section.setParent(this);
    // Appends the new child
    this._children.push(section);
    // Sort by priority
    this._children.sort((a, b) => {
      return a.priority - b.priority;
    });
  }

  /**
   * Gets all elements of this script section instance that meets the condition specified in the given callback function.
   *
   * This method can get nested child instances in this script section.
   * @param callback Predicate function.
   * @returns List of children.
   */
  filter(
    callback: (
      value: EditorSection,
      index: number,
      array: EditorSection[]
    ) => boolean
  ): EditorSection[] {
    return this.getNestedChildren().filter(callback);
  }

  /**
   * Removes the given Script section instance from the children list.
   *
   * The Script section instance must have been added previously with the same reference.
   *
   * It returns the script sections that were deleted.
   *
   * Use ``removeChildForce()`` to forcely remove a child instance that matches a given path.
   * @param section Script section
   * @returns Whether deletion was succesful or not.
   */
  deleteChild(section: EditorSection) {
    let index = this._children.indexOf(section);
    if (index !== -1) {
      return this._children.splice(index, 1);
    }
    return undefined;
  }

  /**
   * Removes all children instances that matches the given path.
   * @param path Path
   */
  deleteChildForced(path: string) {
    let deleted: EditorSection[] = [];
    this._children = this._children.filter((section) => {
      if (section.matches(path)) {
        deleted.push(section);
        return false;
      } else {
        return true;
      }
    });
    return deleted;
  }
  // TODO: Move child

  moveChild(path: string, priority: number) {}

  moveChildren() {}

  /**
   * Creates a string of this script section instance.
   * @returns Script section stringified
   */
  toString(): string {
    return `${this.getItem()}`;
  }

  /**
   * Restarts this script section instance.
   *
   * This method must be called every time this script section path is changed.
   */
  private _restart() {
    // Updates the tooltip to show the current path.
    this.setTooltip(this._path);
    // Restart logic type-based
    switch (this.type) {
      case EditorSectionType.Separator: {
        this.setDescription('Separator');
        this.setTooltip('Separator');
        this.setCollapsibleState(EditorSection.SectionNone);
        this.setCheckboxState(undefined);
        this.iconPath = undefined;
        this.command = undefined;
        break;
      }
      case EditorSectionType.Folder: {
        this.setCollapsibleState(EditorSection.SectionCollapsed);
        this.iconPath = vscode.ThemeIcon.Folder;
        this.command = undefined;
        break;
      }
      case EditorSectionType.Script: {
        this.setCollapsibleState(EditorSection.SectionNone);
        this.iconPath = vscode.ThemeIcon.File;
        this.command = {
          title: 'Open Script File',
          command: 'vscode.open',
          arguments: [vscode.Uri.file(this._path)],
        };
        break;
      }
      default: {
        this.setDescription('Invalid script section!');
        this.setTooltip('Invalid script section!');
        this.setCollapsibleState(EditorSection.SectionNone);
        this.setCheckboxState(undefined);
        this.iconPath = undefined;
        this.command = undefined;
        break;
      }
    }
  }

  /**
   * Creates a list of items by the given path.
   *
   * This method splits ``path`` by the current OS path separator.
   * @param path Path
   * @returns List of tokenize
   */
  private _tokenize(path: string) {
    return path.split(pathing.separator());
  }
}

// /**
//  * Editor section base class.
//  */
// export abstract class EditorSectionBase extends vscode.TreeItem {
//   /**
//    * Editor section collapsible states enum.
//    */
//   public static Collapsible = vscode.TreeItemCollapsibleState;

//   /**
//    * Editor section type.
//    */
//   protected _type: number;

//   /**
//    * Editor section children.
//    */
//   protected _children: EditorSectionBase[];

//   /**
//    * Editor section priority.
//    */
//   protected _priority: number;

//   /**
//    * Editor section parent.
//    */
//   protected _parent?: EditorSectionBase;

//   /**
//    * Constructor.
//    * @param type Editor section type.
//    * @param label Editor section label.
//    */
//   constructor(type: number, label: string) {
//     super(label);
//     this._type = type;
//     this._children = [];
//     this._priority = 0;
//     this._parent = undefined;
//   }

//   /**
//    * Editor section type.
//    */
//   get type() {
//     return this._type;
//   }

//   /**
//    * Editor section priority.
//    */
//   get priority() {
//     return this._priority;
//   }

//   /**
//    * Editor section children.
//    */
//   get children() {
//     return this._children;
//   }

//   /**
//    * Editor section parent.
//    */
//   get parent() {
//     return this._parent;
//   }

//   /**
//    * Returns all nested child instances.
//    * @returns Nested editor section instances.
//    */
//   getNestedChildren(): EditorSectionBase[] {
//     let children: EditorSectionBase[] = [];
//     this._children.forEach((section) => {
//       if (section.hasChildren()) {
//         children.push(section, ...section.getNestedChildren());
//       } else {
//         children.push(section);
//       }
//     });
//     return children;
//   }

//   /**
//    * Sets this instance parent reference to the given ``section``.
//    *
//    * If the given ``section`` is invalid or ``undefined`` the parent reference is set to ``undefined``.
//    *
//    * If this instance parent was set previously and the given ``section`` is valid:
//    *  - This instance is removed from the parent children list.
//    *  - The given section parent children list is updated with this instance.
//    * @param section Editor section instance.
//    */
//   setParent(section: EditorSectionBase | undefined) {
//     // Updates the parent only if this instance is relative to the parent.
//     if (section?.isInmediate(this.resourceUri)) {
//       // Removes this instance from the previous parent (if it exists)
//       this._parent?.deleteChild(this);
//       // Updates the parent.
//       this._parent = section;
//     } else {
//       this._parent = undefined;
//     }
//   }

//   /**
//    * Sets this editor section description text on the tree view.
//    *
//    * When true, it is derived from resourceUri and when falsy, it is not shown.
//    * @param description Description.
//    */
//   setDescription(description: string | boolean | undefined) {
//     this.description = description;
//   }

//   /**
//    * Sets this editor section tooltip text on the tree view.
//    *
//    * The tooltip text when you hover over this item.
//    * @param tooltip Tooltip.
//    */
//   setTooltip(tooltip: string | undefined) {
//     this.tooltip = tooltip;
//   }

//   /**
//    * Sets this editor section checkbox state.
//    *
//    * The checkbox is used to determine whether this editor section is loaded or not.
//    * @param state Checkbox state.
//    */
//   setCheckboxState(
//     state: vscode.TreeItemCheckboxState | boolean | undefined | null
//   ) {
//     this.checkboxState = state
//       ? vscode.TreeItemCheckboxState.Checked
//       : vscode.TreeItemCheckboxState.Unchecked;
//   }

//   /**
//    * Sets this script section collapsible state.
//    * @param state Collapsible state.
//    */
//   setCollapsibleState(state: vscode.TreeItemCollapsibleState | undefined) {
//     this.collapsibleState = state;
//   }

//   /**
//    * Sets this editor section tree item icon.
//    * @param icon Tree item icon.
//    */
//   setIcon(icon: vscode.ThemeIcon | undefined) {
//     this.iconPath = icon;
//   }

//   /**
//    * Checks if this editor section is of the given ``type``.
//    * @param type Editor section type.
//    * @returns Whether it is the given type or not.
//    */
//   isType(type: number) {
//     return this._type === type;
//   }

//   /**
//    * Checks if this editor section path is the given ``uri`` path.
//    * @param uri Uri path.
//    * @returns Whether it is the given path or not.
//    */
//   isPath(uri: vscode.Uri) {
//     return this.resourceUri === uri;
//   }

//   /**
//    * Checks if this editor section instance is currently loaded.
//    * @returns Whether it is loaded or not.
//    */
//   isLoaded() {
//     return this.checkboxState === vscode.TreeItemCheckboxState.Checked;
//   }

//   /**
//    * Checks if the given ``uri`` path is inmediate to this editor section uri path.
//    *
//    * Being inmediate means that ``uri`` could be a child of this section.
//    *
//    * If this instance does not have a path or the given path is ``undefined`` it returns ``false``.
//    * @param uri Uri path.
//    * @returns Whether it is relative of the path or not.
//    */
//   isInmediate(uri: vscode.Uri | undefined) {
//     // Evaluates Uri path validness.
//     if (!uri) {
//       return false;
//     }
//     // Gets the relative path and check it.
//     let relative = this.relative(uri);
//     if (relative) {
//       return this._tokenize(relative).length === 1;
//     }
//     return false;
//   }

//   /**
//    * Checks if this editor section instance is the same as the given one.
//    *
//    * This method compares the attributes to check equality.
//    * @param other Editor section instance.
//    */
//   isEqual(other: EditorSectionBase) {
//     return (
//       this._type === other.type &&
//       this._priority === other.priority &&
//       this._parent === other.parent &&
//       this._children === other.children
//     );
//   }

//   /**
//    * Checks if this instance has ``section`` as a child instance.
//    * @param section Editor section instance.
//    * @returns Whether it is a child or not.
//    */
//   has(section: EditorSectionBase) {
//     return this._children.some((child) => {
//       return child === section;
//     });
//   }

//   /**
//    * Checks if this instance has a child equal to the given ``section``.
//    * @param section Editor section instance.
//    * @returns Whether it has an equal child instance or not.
//    */
//   hasEqual(section: EditorSectionBase) {
//     return this._children.some((child) => {
//       return child.isEqual(section);
//     });
//   }

//   /**
//    * Checks if this editor section instance has children instances or not.
//    * @returns Whether it has children or not.
//    */
//   hasChildren() {
//     return this._children.length > 0;
//   }

//   /**
//    * Updates this section instance with the given information.
//    *
//    * It forces a reset on the instance.
//    * @param info Editor section path.
//    */
//   update(info: EditorSectionInfoOld) {
//     this._type = info.type;
//     this._priority = info.priority;
//     this._reset();
//   }

//   /**
//    * Gets the relative path from this editor section to the given ``uri`` path.
//    *
//    * If this editor section does not have a path it returns ``undefined``.
//    * @param uri Uri Path.
//    * @returns Relative path.
//    */
//   relative(uri: vscode.Uri): string | undefined {
//     if (!this.resourceUri) {
//       return undefined;
//     }
//     return pathing.relative(this.resourceUri, uri);
//   }

//   /**
//    * Returns the child instance that matches the given ``uri`` path.
//    *
//    * If the ``nested`` flag is set, it will search each child recursively until found.
//    *
//    * If no script section is found, it returns ``undefined``.
//    * @param uri Uri path.
//    * @param nested Nested flag.
//    * @returns Child instance.
//    */
//   findChild(uri: vscode.Uri, nested?: boolean) {
//     let child: EditorSectionBase | undefined = undefined;
//     if (this.isInmediate(uri)) {
//       // Child should be an inmediate child
//       child = this._children.find((section) => {
//         return section.isPath(uri);
//       });
//     } else if (nested) {
//       // Child instance can be nested.
//       child = this.getNestedChildren().find((section) => {
//         return section.isPath(uri);
//       });
//     }
//     return child;
//   }

//   /**
//    * Returns all children instances that meets the condition specified in the ``callback`` function.
//    *
//    * If the ``nested`` flag is set, it will apply the filter for each child recursively.
//    * @param callback Callback function.
//    * @param nested Nested flag.
//    * @returns Children instances.
//    */
//   filterChildren(
//     callback: (
//       value: EditorSectionBase,
//       index: number,
//       array: EditorSectionBase[]
//     ) => boolean,
//     nested?: boolean
//   ) {
//     let children: EditorSectionBase[] = [];
//     if (nested) {
//       children = this.getNestedChildren().filter(callback);
//     } else {
//       children = this._children.filter(callback);
//     }
//     return children;
//   }

//   /**
//    * Deletes the given instance from the children.
//    *
//    * It returns all elements that were deleted.
//    * @param section Editor section
//    * @returns List of deleted elements.
//    */
//   deleteChild(section: EditorSectionBase) {
//     let index = this._children.indexOf(section);
//     if (index !== -1) {
//       return this._children.splice(index, 1).forEach((child) => {
//         child.setParent(undefined);
//       });
//     }
//   }

//   /**
//    * Adds the given editor section instance as a child of this one.
//    *
//    * Note: For the sake of consistency, the section given must be relative to this instance.
//    *
//    * For example:
//    *  - This instance: *'Folder/Subfolder/'*
//    *  - Child instance: *'Folder/Subfolder/file.txt'*
//    *
//    * Otherwise, this method will throw an error.
//    * @param section Editor section.
//    * @throws An error when the section is not valid.
//    */
//   addChild(section: EditorSectionBase) {
//     // Checks for path validness.
//     if (!this.isInmediate(section.resourceUri)) {
//       throw new Error(`Cannot add child instance because it is not inmediate!`);
//     }
//     // Adds the new child instance.
//     this._children.push(section);
//     this._children.sort((a, b) => a.priority - b.priority);
//     // Updates the parent reference.
//     section.setParent(this);
//   }

//   /**
//    * Creates a string of this editor section instance.
//    * @returns Editor section stringified.
//    */
//   toString(): string {
//     return `${this.label}`;
//   }

//   /**
//    * Creates a list of path elements by the given ``path``.
//    *
//    * This method splits ``path`` with the current OS path separator.
//    * @param path Path
//    * @returns List of elements
//    */
//   private _tokenize(path: string) {
//     return path.split(pathing.separator());
//   }

//   /**
//    * Resets the editor section information.
//    */
//   protected _reset() {}
// }

// /**
//  * Editor section separator class.
//  */
// class EditorSectionSeparator extends EditorSectionBase {
//   /**
//    * Constructor.
//    * @param priority Separator priority.
//    */
//   constructor(priority: number) {
//     super(EditorSectionType.Separator, priority, '');
//   }

//   /**
//    * Separator cannot have a checkbox state.
//    *
//    * The checkbox will be set to ``undefined``.
//    * @param state Checkbox state.
//    */
//   setCheckboxState(
//     state: vscode.TreeItemCheckboxState | boolean | undefined | null
//   ) {
//     this.checkboxState = undefined;
//   }

//   /**
//    * Separator cannot have a collapsible state.
//    *
//    * The collapsible state will be set to ``undefined``.
//    * @param state Collapsible state.
//    */
//   setCollapsibleState(state: vscode.TreeItemCollapsibleState | undefined) {
//     this.collapsibleState = undefined;
//   }

//   /**
//    * Separator cannot have an icon.
//    *
//    * The icon will be set to ``undefined``.
//    * @param icon Icon.
//    */
//   setIcon(icon: vscode.ThemeIcon | undefined) {
//     this.iconPath = undefined;
//   }

//   /**
//    * Separator cannot have children.
//    *
//    * The children list will be set to ``undefined``.
//    * @param section Editor section instance.
//    */
//   addChild(section: EditorSectionBase) {
//     this._children = [];
//   }

//   /**
//    * Resets the editor section information.
//    */
//   protected _reset() {
//     super._reset();
//     this.setDescription('Separator');
//     this.setTooltip('Separator');
//     this.setCollapsibleState(EditorSectionBase.Collapsible.None);
//     this.setCheckboxState(undefined);
//     this.setIcon(undefined);
//     this.command = undefined;
//   }
// }

// /**
//  * Editor section script class.
//  */
// class EditorSectionScript extends EditorSectionBase {
//   /**
//    * Constructor.
//    * @param priority Script priority.
//    * @param uri Script resource Uri.
//    */
//   constructor(priority: number, uri: vscode.Uri) {
//     super(EditorSectionType.Script, priority, pathing.basename(uri));
//     this.resourceUri = uri;
//     this._reset();
//   }

//   /**
//    * Sets this script section collapsible state.
//    * @param state Collapsible state.
//    */
//   setCollapsibleState(state: vscode.TreeItemCollapsibleState | undefined) {
//     this.collapsibleState = undefined;
//   }

//   /**
//    * Resets the editor section information.
//    */
//   protected _reset() {
//     super._reset();
//     this.setDescription('Script file');
//     this.setTooltip(this.resourceUri?.fsPath);
//     this.setCollapsibleState(EditorSectionBase.Collapsible.None);
//     this.command = {
//       title: 'Open Script File',
//       command: 'vscode.open',
//       arguments: [this.resourceUri],
//     };
//   }
// }

// /**
//  * Editor section folder class.
//  */
// class EditorSectionFolder extends EditorSectionBase {
//   /**
//    * Constructor.
//    * @param priority Folder priority.
//    * @param uri Folder resource Uri.
//    */
//   constructor(priority: number, uri: vscode.Uri) {
//     super(EditorSectionType.Folder, priority, uri.fragment);
//     this.resourceUri = uri;
//   }

//   /**
//    * Resets the editor section information.
//    */
//   protected _reset() {
//     super._reset();
//     this.setDescription('Folder');
//     this.setTooltip(this.resourceUri?.fsPath);
//     this.setCollapsibleState(EditorSectionBase.Collapsible.Collapsed);
//     this.command = undefined;
//   }
// }

/**
 * Scripts controller class.
 */
export class ScriptsController
  implements vscode.TreeDragAndDropController<EditorSection>
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

  private _config: Configuration | undefined;

  /**
   * Script section root instance.
   */
  private _root: EditorSection | undefined;

  /**
   * UTF-8 text decoder instance.
   */
  private _textDecoder: TextDecoder;

  /**
   * Scripts folder watcher.
   */
  private _watcher: vscode.FileSystemWatcher | undefined;

  /**
   * Drop accepted MIME types
   */
  dropMimeTypes: readonly string[] = ['application/rgss.script.editor'];

  /**
   * Drag accepted MIME types
   */
  dragMimeTypes: readonly string[] = ['application/rgss.script.editor'];

  /**
   * Constructor.
   */
  constructor() {
    this._textDecoder = new TextDecoder('utf8');
  }

  /**
   * Root script section instance.
   */
  public get root(): EditorSection | undefined {
    return this._root;
  }

  /**
   * Gets the load order TXT file absolute path.
   *
   * It returns ``undefined`` in case path to the load order file cannot be determined.
   * @returns Absolute path to the load oder file.
   */
  getLoadOrderFilePath(): string | undefined {
    let scriptsFolderPath = this._config?.scriptsFolderPath?.fsPath;
    if (scriptsFolderPath) {
      return pathing.join(scriptsFolderPath, LOAD_ORDER_FILE_NAME);
    }
    return undefined;
  }

  /**
   * Updates the scripts controller instance attributes.
   * @param config Configuration.
   */
  update(config: Configuration) {
    if (config.isValid()) {
      this._config = config;
      this._restart();
    } else {
      this._config = undefined;
    }
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
    // Checks configuration validness
    if (!this._config) {
      throw new Error(
        `Script controller has an invalid configuration instance!`
      );
    }
    let bundleFilePath = this._config.bundleFilePath?.fsPath;
    logger.logInfo(`Bundle file path is: '${bundleFilePath}'`);
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
   * **The promise is resolved when the extraction is done with a code number.**
   *
   * **If the extraction was impossible it rejects the promise with an error.**
   * @returns A promise
   */
  async extractScripts(): Promise<number> {
    logger.logInfo('Extracting scripts from bundle file...');
    // Checks configuration validness
    if (!this._config) {
      throw new Error(
        `Script controller has an invalid configuration instance!`
      );
    }
    let bundleFilePath = this._config.bundleFilePath?.fsPath;
    let scriptsFolderPath = this._config.scriptsFolderPath?.fsPath;
    logger.logInfo(`Bundle file path is: '${bundleFilePath}'`);
    logger.logInfo(`Scripts folder path is: '${scriptsFolderPath}'`);
    // Checks bundle file path validness
    if (!bundleFilePath || !scriptsFolderPath) {
      throw new Error(`Cannot extract scripts due to invalid values!`);
    }
    // Extraction logic
    let bundle = this._readBundleFile(bundleFilePath);
    if (this._checkValidExtraction(bundle)) {
      // Create scripts folder if it does not exists
      filesys.createFolder(scriptsFolderPath, {
        recursive: true,
        overwrite: false,
      });
      // Perform extraction loop
      for (let i = 0; i < bundle.length; i++) {
        // Ignores the loader script
        if (this._isLoaderScript(bundle[i][0])) {
          continue;
        }
        // Create scripts contents
        let name = this._formatScriptName(
          this._deformatScriptName(bundle[i][1]),
          i
        );
        let code = this._processScriptCode(bundle[i][2]);
        let scriptPath = pathing.join(scriptsFolderPath, name);
        fs.writeFileSync(scriptPath, code, { encoding: 'utf8' });
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
   * @param gameOutputFile Game error output file name.
   * @returns A promise
   */
  async createLoader(gameOutputFile: string): Promise<number> {
    logger.logInfo('Creating script loader bundle file...');
    // Checks configuration validness
    if (!this._config) {
      throw new Error(
        `Script controller has an invalid configuration instance!`
      );
    }
    let bundleFilePath = this._config.bundleFilePath?.fsPath;
    let backUpsFolderPath = this._config.backUpsFolderPath?.fsPath;
    let scriptsFolderPath = this._config.configScriptsFolder();
    logger.logInfo(`RPG Maker bundle file path: '${bundleFilePath}'`);
    logger.logInfo(`Back ups folder path: '${backUpsFolderPath}'`);
    logger.logInfo(`Scripts folder relative path: '${scriptsFolderPath}'`);
    if (!bundleFilePath || !backUpsFolderPath || !scriptsFolderPath) {
      throw new Error(
        'Cannot create script loader bundle due to invalid values!'
      );
    }
    // Formats backup destination path.
    let backUpFilePath = pathing.join(
      backUpsFolderPath,
      `${pathing.basename(bundleFilePath)} - ${this._currentDate()}.bak`
    );
    logger.logInfo(`Resolved back up file: ${backUpFilePath}`);
    logger.logInfo('Backing up original RPG Maker bundle file...');
    // Create backup of the bundle file
    filesys.copyFile(bundleFilePath, backUpFilePath, {
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
      this._loaderScriptCode({
        scriptsFolder: scriptsFolderPath,
        scriptName: LOADER_SCRIPT_NAME,
        loadOrderFileName: LOAD_ORDER_FILE_NAME,
        errorFileName: gameOutputFile,
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
    fs.writeFileSync(bundleFilePath, bundleMarshalized, {
      flag: 'w',
    });
    return ScriptsController.LOADER_BUNDLE_CREATED;
  }

  /**
   * Asynchronously creates a load order file within the scripts folder.
   *
   * This method will overwrite the load order file if it already exists.
   *
   * It will look for each script section in the tree and include it on the file if it is loaded.
   *
   * If the load order file creation was successful it resolves the promise with the number of scripts written.
   *
   * If the load order file couldn't be created it rejects the promise with an error.
   * @returns A promise.
   */
  async createLoadOrderFile(): Promise<number> {
    // TODO: Hacer que este metodo se llama por cada 'refresh' que ocurra en la extension:
    //  - Cualquier modificacion del tree view
    //    -> Se cambia de nombre un fichero.
    //    -> Se activa/desactiva el checkbox de un fichero.
    //    -> Se elimina un fichero (que estaba activado)
    //    -> TBD...
    logger.logInfo(`Creating load order TXT file...`);
    // Checks configuration validness
    if (!this._config) {
      throw new Error(
        `Script controller has an invalid configuration instance!`
      );
    }
    let scriptsFolderPath = this._config.scriptsFolderPath?.fsPath;
    logger.logInfo(`Scripts folder path: '${scriptsFolderPath}'`);
    if (!scriptsFolderPath) {
      throw new Error('Cannot create load order file due to invalid values!');
    }
    // Gets all script section files enabled
    let checked = this._root!.filter((value) => {
      return value.isLoaded();
    });
    // Deletes old load order file and re-creates it.
    let loadOrderFile = fs.openSync(this.getLoadOrderFilePath()!, 'w');
    checked.forEach((section) => {
      let relativePath = `${pathing.relative(
        this._root!.path,
        section.path
      )}\n`;
      fs.writeSync(loadOrderFile, relativePath);
    });
    fs.closeSync(loadOrderFile);
    // Returns the response
    return checked.length;
  }

  /**
   * Asynchronously creates a RPG Maker bundle file based on the RGSS version from all of the extracted scripts files.
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
   */
  async createBundle(destination: vscode.Uri): Promise<number> {
    logger.logInfo('Creating bundle file...');
    // Checks configuration validness
    if (!this._config) {
      throw new Error(
        `Script controller has an invalid configuration instance!`
      );
    }
    let scriptsFolderPath = this._config.scriptsFolderPath?.fsPath;
    logger.logInfo(`Scripts folder path: '${scriptsFolderPath}'`);
    logger.logInfo(`Destination path: ${destination.fsPath}`);
    if (!scriptsFolderPath) {
      throw new Error('Cannot create load order file due to invalid values!');
    }
    // Gets all script section files enabled
    let checked = this._root!.filter((value) => {
      return value.isLoaded() && value.isFile();
    });
    // Formats RPG Maker bundle
    let usedIds = [LOADER_SCRIPT_SECTION];
    let bundle: any[][] = [];
    checked.forEach((section, index) => {
      let id = this._generateScriptId(usedIds);
      let code = fs.readFileSync(section.path, { encoding: 'utf8' });
      // Create new bundle section
      bundle[index] = [];
      bundle[index][0] = id;
      bundle[index][1] = this._deformatScriptName(section.path);
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
   * Disposes this scripts controller.
   */
  dispose() {
    this._watcher?.dispose();
    this._watcher = undefined;
  }

  /**
   * Checks if this scripts controller instance is currently disposed or not.
   * @returns Whether the controller is disposed.
   */
  isDisposed(): boolean {
    return this._watcher === undefined;
  }

  /**
   * Handles a drag operation in the tree.
   * @param source List of tree items
   * @param dataTransfer Data transfer
   * @param token Token
   */
  handleDrag(
    source: readonly EditorSection[],
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
    target: EditorSection | undefined,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    logger.logInfo('Dropping handler called!');
  }

  /**
   * Restarts the controller based on the current path.
   */
  private _restart() {
    if (!this._config) {
      return;
    }

    // Disposes the instance first
    if (!this.isDisposed()) {
      this.dispose();
    }

    // Recreates the root script section
    let scriptsFolderPath = this._config.scriptsFolderPath!.fsPath;
    this._root = new EditorSection({
      path: scriptsFolderPath,
      label: 'Root',
      type: EditorSectionType.Folder,
      priority: 0,
      loaded: false,
    });
    this._scan();

    // Restarts the watcher instance.
    this._watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(scriptsFolderPath, '**')
    );

    // Sets the watcher callbacks.
    this._watcher.onDidCreate((uri) => this._onDidCreate(uri));
    this._watcher.onDidChange((uri) => this._onDidChange(uri));
    this._watcher.onDidDelete((uri) => this._onDidDelete(uri));
  }

  /**
   * Event callback when something is created within the scripts folder.
   * @param uri Entry uri
   */
  private _onDidCreate(uri: vscode.Uri) {
    // TODO: Process entry change, possible valid cases:
    //  -> ``uri`` is the scripts folder.
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
    //  -> ``uri`` is a script section inside the scripts folder.
    logger.logInfo(`Entry changed: ${uri.fsPath}`);
  }

  /**
   * Event callback when something is deleted within the scripts folder.
   * @param uri Entry uri
   */
  private _onDidDelete(uri: vscode.Uri) {
    // TODO: Process entry change, possible valid cases:
    //  -> ``uri`` is the scripts folder.
    //  -> ``uri`` is a script section inside the scripts folder.
    logger.logInfo(`Entry deleted: ${uri.fsPath}`);
  }

  /**
   * Scans and re-creates the script folder reading all entries from the system
   */
  private _scan() {
    // TODO: Properly scan the directory
    if (this._root && this._config) {
      let scriptsFolderPath = this._config.scriptsFolderPath!.fsPath;
      filesys
        .readDirectory(scriptsFolderPath, {
          relative: false,
          recursive: true,
        })
        .forEach((entry) => {
          if (filesys.isRubyFile(entry)) {
            this._root?.createChildren({
              path: entry,
              label: this._deformatScriptName(entry),
              type: EditorSectionType.Script,
              priority: 1, // TODO: Determine priority correctly
              loaded: this._determineLoadStatus(entry),
            });
          } else if (filesys.isFolder(entry)) {
            this._root?.createChildren({
              path: pathing.resolve(entry),
              label: this._deformatScriptName(entry),
              type: EditorSectionType.Folder,
              priority: 1, // TODO: Determine priority correctly
              loaded: this._determineLoadStatus(entry),
            });
          }
        });
    }
  }

  /**
   * Checks if the given script section corresponds to the extension's loader script.
   * @param scriptSection Section of the script
   * @returns Whether it is the script loader or not
   */
  private _isLoaderScript(scriptSection: number) {
    return scriptSection === LOADER_SCRIPT_SECTION;
  }

  /**
   * Checks the RPG Maker bundle file for any valid scripts left.
   *
   * This method ignores the script loader that this extension creates.
   *
   * Returns true if there are scripts in the bundle file that were not extracted previously.
   * @param bundle Bundle (marshalized)
   * @returns Whether extraction is valid or not
   */
  private _checkValidExtraction(bundle: any[][]): boolean {
    return bundle.some((script) => {
      // Checks if it exists at least a valid script in the bundle array that is not the loader
      let scriptSection = script[0];
      if (this._isLoaderScript(scriptSection)) {
        return false; // It is the loader
      } else if (typeof scriptSection === 'number') {
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
  private _loaderScriptCode(config: LoaderScriptConfig): string {
    return `#==============================================================================
# ** ${config.scriptName}
#------------------------------------------------------------------------------
# Version: 1.1.5
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
  # Relative path to the scripts folder inside the game project's folder.
  #
  # Note: The load order file is expected to exist inside this folder!
  #
  SCRIPTS_PATH = '${config.scriptsFolder}'
end

###############################################################################
#   DO NOT MODIFY ANYTHING BELOW THIS LINE IF YOU DO NOT WHAT YOU ARE DOING   #
#   DO NOT MODIFY ANYTHING BELOW THIS LINE IF YOU DO NOT WHAT YOU ARE DOING   #
#   DO NOT MODIFY ANYTHING BELOW THIS LINE IF YOU DO NOT WHAT YOU ARE DOING   #
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
    scripts_path = File.join(Dir.pwd, SCRIPTS_PATH)
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
    return false if path[0] == '#'
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
   * Determines the load status of the given entry checking the load order TXT file.
   * @param entry Entry
   * @returns Whether entry is activated or not.
   */
  private _determineLoadStatus(entry: string): boolean {
    if (this._config) {
      let scriptsFolderPath = this._config.scriptsFolderPath!.fsPath;
      let relativePath = pathing.relative(scriptsFolderPath, entry);
      return fs
        .readFileSync(this.getLoadOrderFilePath()!, { encoding: 'utf8' })
        .split('\n')
        .some((value) => {
          return pathing.resolve(value) === relativePath;
        });
    }
    return false;
  }

  /**
   * Deformats the given script name.
   *
   * If a path is given, it will get the basename first before deformatting it.
   *
   * It will return the untouched script name if deformatting cannot be done.
   * @param script Script
   * @returns Deformatted script name
   */
  private _deformatScriptName(script: string): string {
    // Gets file and removes extension (if it exists)
    let baseName = pathing.parse(script).name;
    // Removes priority number (if it exists)
    let match = baseName.match(DEFORMAT_SCRIPT_NAME);
    return match ? match[1] : baseName;
  }

  /**
   * Processes the external script name and returns it.
   *
   * This function makes sure it does not have invalid characters for the OS.
   * @param name Script name
   * @param priority Script priority number
   * @returns The processed script name
   */
  private _formatScriptName(name: string, priority: number | string): string {
    let scriptPriority = priority.toString();
    // Removes any OS invalid characters
    let scriptName = name.replace(INVALID_CHARACTERS, '');
    // Removes any whitespace left
    scriptName = scriptName.trim();
    // Adds script index
    scriptName = `${scriptPriority.padStart(4, '0')} - ${scriptName}`;
    // Concatenates the ruby extension if it isn't already
    if (!scriptName.endsWith('.rb')) {
      return scriptName.concat('.rb');
    }
    return scriptName;
  }

  /**
   * Generates a number for a script's ID.
   *
   * The generated ID won't be any of the given list of sections IDs.
   * @param sections List of sections IDs
   * @returns A valid section
   */
  private _generateScriptId(sections: number[]): number {
    let section = 0;
    do {
      section = Math.floor(Math.random() * SECTION_MAX_VAL);
    } while (sections.includes(section));
    return section;
  }

  /**
   * Processes the script code body to ensure compatibility with RPG Maker.
   *
   * Ruby 1.9 does not automatically detects file encoding so it must be added in the script to avoid encoding crashes.
   * @param scriptCode Code of the script
   * @returns The script code processed
   */
  private _processScriptCode(scriptCode: string): string {
    let script = '';
    if (!scriptCode.startsWith('# encoding: utf-8')) {
      script = `# encoding: utf-8\n${scriptCode}`;
    } else {
      // Code already contains encoding comment
      script = scriptCode;
    }
    return script;
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
