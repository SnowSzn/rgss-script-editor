
<p align="center">
    <img src='./icons/logo.png'>
</p>

<h1 align="center">RGSS Script Editor</h1>
<a href="https://marketplace.visualstudio.com/items?itemName=SnowSzn.rgss-script-editor"><h3 align="center">Download Link</h3></a>
<h3 align="center">This extension should be used for development purposes only!</h3>

This is an extension for Visual Studio Code that makes VSCode usable as the script editor for any RPG Maker editor based on the RGSS framework:
- RPG Maker XP
- RPG Maker VX
- RPG Maker VX Ace

In a nutshell, this extension extracts each script from the bundle file that RPG Maker uses into individual ruby files.
Once the extraction is done, it creates a backup of the original bundle file (``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``) as a security measure, subsequently it overwrites the original bundle file with a script loader bundle file that loads ruby scripts inside a relative folder based on a text file that dictates the loading order.

Since this extension uses a different approach for loading scripts, you can use the RPG Maker editor and edit scripts in Visual Studio Code at the same time without worrying about RPG Maker overwriting the bundled file with outdated data.

**Long explanation**

RPG Maker loads all data (database, maps, scripts...) at startup when the editor is launched, so you can modify anything of the project and save it into their appropiate data file (scripts are saved into: ``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``), this happens with every modification you do inside the editor.

The problem is that RPG Maker does not save these modifications individually, all files are saved at the same time, this means that even if you do not change anything in the game's scripts and modified something else (for example: the database) all scripts will be overwritten with the initial data that was loaded.

This produces an incompatibility with any external script editor or Visual Studio Code extension that works by overwriting the Scripts bundle data file since the editor will overwrite it everytime the project is saved, so the easy solution is not working with the RPG Maker editor and the external script editor at the same time. 

This extension tries to circumvent this limitation by overwriting the script bundle data file with a script loader that will load external scripts inside a relative path within the project's folder, this way you can work on your project inside the RPG Maker at the same time you are creating/modifying the game's scripts externally.

It also allows to specify a load order, skip specific scripts and load all Ruby files inside a folder recursively if you want to organize the scripts inside subfolders, the script loader will read the load_order.txt file and load each script/folder until end of line is reached.

As a security measure, the extension will not allow overwriting the script bundle file (``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``) with the script loader if there are still scripts inside of it that have not yet been extracted.

## Features

- **Workspace Support**
  - You can change the active folder easily in a workspace.
- **Run Game**
  - You can run the game within VSCode using a customizable key shortcut (F12 by default)
  - Both `test` (`debug`) and `console` (RPG Maker VX Ace) modes are supported.
  - Optionally, custom arguments can be used instead of the default ones.
  - You can also specify a custom path to the game, in case you want to run an MKXP-Z executable.
- **Backup Creation**
  - Everytime the scripts bundled file is overwritten by the extension, it created a security backup.
  - All back ups are saved into the specified folder in the extension's settings.
- **Scripts Extraction**
  - You can extract all scripts to a custom folder within the project's folder.
  - Each RPG Maker script entry will be converted into the appropiate equivalent for the extension's script editor in the process.
    - Every nameless entry with no code will be treated as a separator.
    - Any other entry, will be treated as a script file.
- **Bundle File Creation**
  - You can create an RPG Maker bundle file (``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``) using the current enabled scripts.
  - This process is **heavily recommended** when sharing a copy of your game.
  - Make sure **not to overwrite** the scripts bundle file this extension creates, a good way to distribute your game while you use this extension is having two separate folders, one folder to develop the game and the other one to distribute it, you can later use this function to create a bundle file and move it into the game folder you share publicly.
    - If you do overwrite it, you will lose all of the tree arranging (order and subfolders...) when extracting the scripts again. This is unavoidable since the RPG Maker bundle file does not save this kind of data.
- **Script Loader**
  - The game will load all scripts files individually based on a load order.
  - Any script can be ignored and not loaded when the game runs.
    - Instead of the old way of commenting the whole script code or deleting it, you can disable it and it won't be loaded.
- **Script Editor**
  - This extension enables a view in VSCode where you can perform several operations on sections:
    - Create new sections.
      - You can create new sections of an specific type, the current types available are:
        - Script: Self-explanatory.
        - Folder: You can use it to organize scripts inside folders, all folders are collapsable.
        - Separator: An empty section (no name, no icon...) used to separate sections.
    - Enable/Disable sections.
      - You can enable or disable any section or group of sections.
        - If a section is enabled, it will be loaded when the game runs.
        - If a section is disabled, it will be ignored.
    - Delete sections.
      - Any section can be deleted along with all of its children.
      - **Keep in mind that this action is irreversible!**
    - Rename sections.
      - You can rename sections.
      - All changes will be reflected in its children sections.
    - Move sections.
      - The tree can be arranged in any order desired.
      - The load order is defined by the order of the editor, before running the game.
    - Editor Mode.
      - There are two editor modes available, you can switch freely between them:
        - Merge Mode: Merges any supported section with the section in which they are dropped.
        - Move Mode: Moves the selected sections to the next position of the section where they are dropped inside the same parent section.
- **Game Exception Processing**
  - This extension can process the exception that killed the game in the last test game session.
  - The extension backtrace will be shown in a markdown file besides the active editor.
  - VSCode built-in peek menu will be used to show each backtrace location.

## Screenshots

### Extension Editor View
![Editor View](./images/feature-editor.gif)

![Editor View 2](./images/feature-editor-2.gif)

![Editor View Collapsed](./images/feature-editor-collapsed.jpg)

### Run Game Process
![Run Game](./images/feature-run-game.gif)

### Game Exception Processing
![Game Exception](./images/feature-game-exception.gif)

## Requirements

### Windows
- [Visual Studio Code](https://code.visualstudio.com/)
### Linux
- [Visual Studio Code](https://code.visualstudio.com/)
- [Wine](https://www.winehq.org/) (preferably the latest version)
  - Wine should available on your system, which will be used to run the Windows game executable.
  - You can check if Wine is installed in your system with: ``wine --version``
  - **IMPORTANT: If you use MKXP-Z for Linux you won't need to install Wine.** 
    - Wine is only required for RPG Maker Windows executables.
  - You can also use any other Wine fork with this extension.

### macOS
- [Visual Studio Code](https://code.visualstudio.com/)
- **Not tested in macOS**

## Extension Settings

This extension contributes the following settings:

* `rgssScriptEditor.debug.logToConsole`
  * Enables this extension to log information to a VSCode output channel.
* `rgssScriptEditor.debug.logToFile`
  * Enables this extension to log information to a file inside the project's folder.
* `rgssScriptEditor.extension.quickStart`
  * This setting enables/disables the extension's quick start mode.
  * Quick start will set the extension's active project folder automatically based on the current context:
    * If only one folder is opened and it is a valid RPG Maker project it will be activated.
    * If a workspace is opened (several folders) you will be able to choose the appropiate folder to activate with a button in the status bar.
    * If no folder is opened or the opened folders are not valid RPG Maker projects the extension will deactivate its UI elements.
* `rgssScriptEditor.extension.autoReveal`
  * Allows the extension to reveal the active script file on the extension's script editor view.
* `rgssScriptEditor.external.backUpsFolder`
  * The relative path within the project's folder where all back ups will be saved.
* `rgssScriptEditor.external.scriptsFolder`
  * The relative path within the project's folder where all scripts will be extracted.
* `rgssScriptEditor.gameplay.gameExecutablePath`
  * The relative path to the game executable inside the project folder.
    * You can change this option to allow MKXP-Z executable to be launched.
* `rgssScriptEditor.gameplay.useWine`
  * Sets the command to invoke Wine to run the game executable. **(Linux Only!)**
  * If a Linux-specific executable is used to run the game, you won't need to use this setting.
* `rgssScriptEditor.gameplay.automaticArgumentsDetection`
  * Enables/disables automatic arguments detection mode.
  * If enabled, the extension will automatically choose the appropiate arguments based on the RPG Maker version detected.
  * **IMPORTANT:**
    * If you want to use custom arguments **you must disable this mode.**
* `rgssScriptEditor.gameplay.editorTestMode`
  * Enables/disables test (debug) mode.
  * If enabled, the extension will run the game on debug mode.
  * **If custom arguments are used, this option is ignored.**
* `rgssScriptEditor.gameplay.nativeConsole`
  * Enables/disables RPG Maker native console. **(RPG Maker VX Ace only!)**
  * If enabled, the extension will run the game allocating a console window.
  * **If custom arguments are used, this option is ignored.**
* `rgssScriptEditor.gameplay.customArguments`
  * Set your own custom arguments to run the game with.
  * Arguments must be separated by a whitespace.
  * **IMPORTANT:**
    * You must disable `rgssScriptEditor.gameplay.automaticArgumentsDetection` to use this
* `rgssScriptEditor.gameplay.gameExceptionAutoProcess`
  * Enables/Disables game exception automatic process mode.
  * The extension will show you an information window about the last detected exception.
* `rgssScriptEditor.gameplay.gameExceptionShowInEditor`
  * Allows the extension to show a markdown file besides the active editor with the backtrace information.
    * This is pretty much required since VSCode peek menu does not support [ordering the files](https://github.com/microsoft/vscode/issues/202664).

## Known Issues

I have listed here all errors I have encountered while testing the extension along with their respective solution. If you find an issue not listed here, feel free to report it back.

---

> [SyntaxError] Invalid Multibyte char (US-ASCII) Exception

RPG Maker VX Ace is the only RPG Maker editor running RGSS3 which it is based on Ruby 1.9+.

The other versions of the engine (XP and VX) runs with older versions of Ruby in which ``$KCODE`` is supported, this global variable is used to determine the encoding of a script file when Ruby is trying to load it.

So basically, when using RPG Maker VX Ace, errors may occur because Ruby 1.9+ does not *"detect"* the script file encoding, so it fails when trying to load it using ``Kernel.load`` or ``Kernel.require``.

This error is easily fixed by adding ``# encoding: utf-8`` in the first line of the script contents like:

```ruby
# encoding: utf-8

module MyModule
  ...
end
```

**It is very important that the encoding is specified at the very first line of the script!**

Like I said before, this workaround is not needed for older versions of RPG Maker that still uses ``$KCODE``, but to avoid problems, I have made the extension add this line in *every script* that it is extracted from the bundle file or created using the extension's editor view automatically so you won't have to.

---

> [LoadError] no such file to load -- Exception

This exception may happen for a number of reasons:

- **The file trying to load simply does not exists**

Make sure that **all files** within the text file that defines the load order **exists** in the specified path.

If you don't want to load a script file you can simply remove the script or ignore it disabling it using the script editor view (or with a `#` character at the start of the line)
```txt
script.rb
another script.rb
Subfolder/
#skipped script.rb
#another skipped script.rb
#Skipped Subfolder/
```

- **The file exists, but it still crashes**

If the file exists and the game still crashes you should make sure the path to the script file does not have special characters, specially in the script's name.

I made sure to remove all of them that I know from all scripts when extraction is done, but to be fully sure try not to use special characters to name your scripts.

For example, these characters are invalid:
  - '▼': Character that RPG Maker uses to define sections.
    - ./Scripts/▼ Modules.rb
  - '■': Some community plugins may have this character too.
    - ./Scripts/■ My Ruby Script.rb

The extension uses a regular expression to remove invalid characters from the script's name, I tried to include as many invalid combinations as possible but I may have missed some.

---

## Latest Release Notes

## [1.0.10] - 25/01/2024

### Changed

+ Changed save dialog default uri to the project's folder when creating a bundle file for convenience

## Contributors
- [marshal](https://github.com/hyrious/marshal)
