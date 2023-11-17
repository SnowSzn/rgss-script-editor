import * as vscode from 'vscode';
import * as scripts from '../../processes/scripts_controller';

/**
 * Script section tree item class.
 */
export class ScriptSection extends vscode.TreeItem {
  /**
   * Script file absolute path.
   */
  public readonly path: string;

  /**
   * Script file skipped status.
   */
  public skipped: boolean;

  /**
   * Constructor.
   * @param path Script path.
   */
  constructor(path: string) {
    let label = scripts.deformatScriptName(path);
    let collapse = scripts.isRubyScript(path)
      ? vscode.TreeItemCollapsibleState.None
      : vscode.TreeItemCollapsibleState.Collapsed;
    super(label, collapse);
    this.path = path;
    this.skipped = false;
    this.tooltip = `${this.label}`;
    this.description = false;
  }
}

/**
 * UI view provider class.
 */
export class EditorViewProvider
  implements vscode.TreeDataProvider<ScriptSection>
{
  /**
   * Scripts folder
   */
  private scriptsFolder: string;

  /**
   * Constructor.
   */
  constructor(scriptsFolder: string) {
    this.scriptsFolder = scriptsFolder;
  }

  /**
   * Returns the UI representation (TreeItem) of the element that gets displayed in the view.
   * @param element Element
   * @returns Tree item
   */
  getTreeItem(element: ScriptSection): vscode.TreeItem {
    return element;
  }

  /**
   * Gets a list of tree items by the given base section.
   *
   * If no base section is given, it returns all items from the base directory.
   *
   * If a base section is given, it returns all children items by the given section.
   * @param baseSection Base section (recursiveness)
   * @returns Returns the data
   */
  getChildren(baseSection?: ScriptSection): Thenable<ScriptSection[]> {
    try {
      // Gets files by the given base section
      let files = scripts.readScriptsFolder(
        baseSection ? baseSection.path : this.scriptsFolder,
        { recursive: false, absolute: true },
        (entries) => {
          return entries.filter(
            (entry) =>
              scripts.isRubyScript(entry) || scripts.isRubyFolder(entry)
          );
        }
      );

      // Process files
      return Promise.resolve(
        files.map<ScriptSection>((path) => {
          return new ScriptSection(path);
        })
      );
    } catch (error) {
      return Promise.resolve([]);
    }
  }
}
