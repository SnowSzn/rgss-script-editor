import * as vscode from 'vscode';
import { UUID } from 'crypto';
import {
  EditorSectionBase,
  EditorSectionType,
} from '../../processes/scripts_controller';

/**
 * Drag and drop MIME type.
 */
const MIME_TYPE = 'application/rgss.script.editor';

/**
 * VScode editor MIME type.
 */
const MIME_TYPE_VSCODE = 'text/uri-list';

/**
 * A data provider that provides tree data.
 */
export class EditorViewProvider
  implements
    vscode.TreeDataProvider<EditorSectionBase>,
    vscode.TreeDragAndDropController<EditorSectionBase>
{
  /**
   * Scripts folder data.
   */
  private _root?: EditorSectionBase;

  /**
   * On did change tree data event emitter.
   */
  private _onDidChangeTreeData: vscode.EventEmitter<
    EditorSectionBase | undefined | null | void
  > = new vscode.EventEmitter<EditorSectionBase | undefined | null | void>();

  /**
   * On did change tree data event.
   */
  readonly onDidChangeTreeData: vscode.Event<
    EditorSectionBase | undefined | null | void
  > = this._onDidChangeTreeData.event;

  /**
   * Drop accepted MIME types.
   */
  dropMimeTypes: readonly string[] = [MIME_TYPE];

  /**
   * Drag accepted MIME types.
   */
  dragMimeTypes: readonly string[] = [MIME_TYPE];

  /**
   * Constructor.
   */
  constructor() {
    this._root = undefined;
  }

  /**
   * Checks if ``section`` is the root section
   * @param section Editor section
   * @returns Whether it is root or not
   */
  isRoot(section: EditorSectionBase): boolean {
    return this._root === section;
  }

  /**
   * Checks if URI of ``section`` is the root section URI
   * @param section Editor section
   * @returns Whether it is root or not
   */
  isRootPath(section: EditorSectionBase): boolean {
    if (!this._root) {
      return false;
    }
    return this._root?.isPath(section.resourceUri);
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
    // Prepares data (must be stringified)
    let extensionData: UUID[] = [];
    let vscodeData: string[] = [];
    source.forEach((section) => {
      extensionData.push(section.id);

      // Checks editor section validness for VSCode editor
      // URIs needs to be strings separated by "\r\n" EOL for VSCode editor (hardcoded)
      // https://code.visualstudio.com/api/references/vscode-api#TreeDragAndDropController
      if (section.isType(EditorSectionType.Script)) {
        vscodeData.push(section.resourceUri.toString());
      } else if (section.isType(EditorSectionType.Folder)) {
        section.nestedChildren().forEach((child) => {
          if (child.isType(EditorSectionType.Script)) {
            vscodeData.push(child.resourceUri.toString());
          }
        });
      }
    });

    // Sets data transfer package with the data
    dataTransfer.set(MIME_TYPE, new vscode.DataTransferItem(extensionData));
    if (vscodeData.length > 0) {
      dataTransfer.set(
        MIME_TYPE_VSCODE,
        new vscode.DataTransferItem(vscodeData.join('\r\n'))
      );
    }
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
    // Checks target validness
    if (!target) {
      return;
    }

    // Gets data from the transfer package
    const ids = dataTransfer.get(MIME_TYPE)?.value as UUID[];
    let sections: EditorSectionBase[] = [];
    if (!ids) {
      return;
    }

    // Fetchs the appropiate editor section instances by UUID.
    ids.forEach((id) => {
      const child = this._root?.findChild((value) => {
        return value.id === id;
      }, true);
      if (child) {
        sections.push(child);
      }
    });

    // Calls drap and drop command
    vscode.commands.executeCommand(
      'rgss-script-editor.sectionMove',
      sections,
      target
    );
  }

  /**
   * This method signals that an element or root has changed in the tree.
   *
   * This will trigger the view to update the changed element/root and its children recursively (if shown).
   *
   * To signal that root has changed, do not pass any argument or pass undefined or null.
   * @param element Script Section
   */
  refresh(element?: EditorSectionBase): void {
    this._onDidChangeTreeData.fire(element);
  }

  /**
   * Updates the provider script section root instance.
   *
   * This method triggers a refresh on the tree since data has been updated.
   * @param root Script section root
   */
  update(root: EditorSectionBase) {
    this._root = root;
    this.refresh();
  }

  /**
   * Resets the provider.
   *
   * This method undefines the tree view root instance.
   *
   * This method triggers a refresh on the tree since data has been updated.
   */
  reset() {
    this._root = undefined;
    this.refresh();
  }

  /**
   * Reveals the appropiate script section on the tree view based on the given ``uri``.
   * @param uri Script section uri path
   */
  findTreeItem(uri: vscode.Uri) {
    return this._root?.findChild((value) => {
      return value.isPath(uri);
    }, true);
  }

  /**
   * Returns the UI representation (TreeItem) of the element that gets displayed in the view.
   * @param element Element
   * @returns Tree item
   */
  getTreeItem(element: EditorSectionBase): vscode.TreeItem {
    return element;
  }

  /**
   * Gets a list of tree items by the given base script section.
   *
   * If ``element`` is nullish, it returns all children from the root.
   *
   * If ``element`` is a valid script section, it returns all of their children items.
   * @param element Base script section
   * @returns Returns the data
   */
  getChildren(element?: EditorSectionBase): Thenable<EditorSectionBase[]> {
    try {
      if (this._root) {
        let children = element ? element.children : this._root.children;
        return Promise.resolve(children);
      } else {
        return Promise.resolve([]);
      }
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  /**
   * Gets the parent tree item (script section) of the given element.
   * @param element Script section
   * @returns Returns the element's parent
   */
  getParent(
    element: EditorSectionBase
  ): vscode.ProviderResult<EditorSectionBase> {
    return element.parent;
  }
}
