
<p align="center">
    <img src='./icons/logo.png'>
</p>

<h1 align="center">RGSS Script Editor</h1>

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

- **Run Game:** You can run the game within VSCode using a key shortcut (F12 by default)
  - Both `test` (`debug`) and `console` (RPG Maker VX Ace) modes are supported.
  - Optionally, custom arguments can be used instead of the default ones.
  - You can also specify a custom path to the game, in case you want to run a MKXP-Z executable.
- **Backup Creation:** Backs up the scripts bundled file when extraction is done.
- **Scripts Extraction:** You can extracts all scripts inside the data file to a custom directory within the project's folder.
- **Script Loader:** The game will load all scripts files individually based on a load order
  - Any script can be ignored and not loaded when the game runs.
  - Instead of commenting the whole script code or deleting it, you can disable it and it won't be loaded.
- **Workspace Support**: You can change the active folder easily in a workspace.
- **Script Editor**: This extension enables a view in VSCode where you can perform several operations on sections.
  - Create new sections.
    - You can create new sections: scripts, folders and separators.
  - Enable/Disable sections.
    - If a section is enabled, it will be loaded when the game runs.
  - Delete sections.
    - Any section can be deleted along with all of its children.
  - Rename sections.
    - You can rename a section with a key shortcut.
  - Move sections.
    - The tree can be arranged in any order desired.
  - Editor Mode: There are two editor modes available, you can switch freely between them.
    - Merge Mode: Merges any supported section with the section where they are dropped.
    - Move Mode: Moves the selected sections to the next position of the section where they are dropped inside the same parent section.
- **Game Exception Processing**: The extension can process the exception that killed the game in the last test game session.
  - The extension backtrace will be shown in a markdown file besides the active editor.
  - VSCode built-in peek menu will be used to show each backtrace location.
- **Bundle File Creation**: You can create an RPG Maker bundle file (rxdata, rvdata, rvdata2) using the current enabled scripts.
  - This is heavily recommended when sharing a copy of your game since this extension must be used for development purposes only.
  - Make sure not to overwrite the scripts bundle file this extension creates, otherwise, you will lose the editor tree order when extracting it again, this is unavoidable since the RPG Maker bundle file does not save this kind of data.

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
  - To take full advantage of the extension you should have wine available on your system, which will be used to run the Windows game executable.
  - You can check if Wine is installed in your system with: ``wine --version``
  - **IMPORTANT: If you use MKXP-Z for Linux and you have created a Linux executable for your game, you won't need to install Wine.** 
    - Wine is only required for RPG Maker base executables.
- **Not tested in Linux**
### macOS
- [Visual Studio Code](https://code.visualstudio.com/)
- **Not tested in macOS**

## Extension Settings

This extension contributes the following settings:

* `rgssScriptEditor.debug.logToConsole`: Enables this extension to log information to the Visual Studio Code debug console.
* `rgssScriptEditor.debug.logToFile`: Enables this extension to log information to a file.
* `rgssScriptEditor.extension.quickStart`: Enable/disable quick start mode.
  * Quick start will set the extension's project folder based on the current context:
    * If only one folder is opened and it is a valid RPG Maker project it will be activated.
    * If a workspace is opened (several folders) you will be able to choose the appropiate folder to activate with a button in the status bar.
    * If no folder is opened or the opened folders are not valid RPG Maker projects the extension will deactivate its UI elements automatically.
* `rgssScriptEditor.extension.autoReveal`: Allows the extension to reveal the active file on the script editor view.
* `rgssScriptEditor.external.backUpsFolder`: The relative path within the project's folder where all back ups will be saved.
* `rgssScriptEditor.external.scriptsFolder`: The relative path within the project's folder where all scripts will be extracted.
* `rgssScriptEditor.gameplay.gameExecutablePath`: The relative path to the game executable inside the project folder.
  * You can change this option to allow MKXP-Z executable to be launched.
* `rgssScriptEditor.gameplay.useWine`: Whether to use Wine to execute the game executable in Linux or not. (**Linux Only**)
  * Since you can also build MKXP-Z for Linux, you should uncheck this box when running MKXP-Z in Linux if you have built a Linux-specific executable.
* `rgssScriptEditor.gameplay.automaticArgumentsDetection`: Enable/disable automatic arguments detection.
  * If enabled, the extension will automatically choose the appropiate arguments based on the RPG Maker version.
  * **IMPORTANT: This mode must be disabled to use custom arguments.**
* `rgssScriptEditor.gameplay.editorTestMode`: Enable/disable test (debug) mode.
  * If enabled, the extension will run the game on debug mode.
  * If custom arguments are used, this option is ignored.
* `rgssScriptEditor.gameplay.nativeConsole`: Enable/disable RPG Maker console.
  * **IMPORTANT: This is only available for RPG Maker VX Ace**
  * If enabled, the extension will run the game with a console window.
  * If custom arguments are used, this option is ignored.
* `rgssScriptEditor.gameplay.customArguments`: Set your own custom arguments to run the game with.
  * **IMPORTANT: Auto. Arguments Detection mode must be disabled**
  * Launchs the game with the arguments specified here.
  * Arguments must be separated by a whitespace.
* `rgssScriptEditor.gameplay.gameExceptionAutoProcess`: Enables/Disables game exception auto process mode.
  * The extension is able to read the exception that killed the process and show the backtrace on VSCode.
* `rgssScriptEditor.gameplay.gameExceptionShowInEditor`: Allows the extension to show a new text document besides the active editor with the last exception information.
  * Shows a markdown file besides the active editor with the backtrace information.
    * This is pretty much required since VSCode peek menu does not support sorting the files.

## Known Issues

There are some issues that may happen when running this extension, you may encounter them depending on the RPG Maker version you are using.

**All problems listed here have been found while using ``RPG Maker VX Ace``.**

RPG Maker VX Ace is the only RPG Maker editor running RGSS3 which it is based on Ruby 1.9+.

The other versions of the engine (XP and VX) runs with older versions of Ruby in which ``$KCODE`` is supported, this global variable is used to determine the encoding of a script file when Ruby is trying to load it.

So basically, when using RPG Maker VX Ace, errors may occur because Ruby 1.9+ does not *"detect"* the script file encoding, so it fails when trying to load it using ``Kernel.load`` or ``Kernel.require``.

**The other RPG Maker editors (``RPG Maker XP`` and ``RPG Maker VX``) seems to work fine on my end.**


I have listed here all errors I have encountered while testing the extension along with their respective solution.

If you find an issue not listed here, feel free to report it back.

* > [SyntaxError] Invalid Multibyte char (US-ASCII) Exception

It is more likely to occur in RPG Maker VX Ace.

This exception is easily fixed by adding ``# encoding: utf-8`` in the first line of the script contents.

Like I said before, this workaround is not needed for older versions of RPG Maker that still uses ``$KCODE``, but to avoid problems, I have made the extension add this line in *every script* that it is extracted from the bundle file or created using the extension's editor view automatically so you won't have to.

* > [LoadError] no such file to load -- Exception

This exception may happen for a number of reasons:

**The file trying to load simply does not exists:**

Make sure that **all files** within the text file that defines the load order **exists** in the specified path.

If you don't want to load a script file you can simply remove it from the load order TXT file or ignore it with a `#` character at the start of the line, like:
```txt
script.rb
another script.rb
Subfolder/
#skipped script.rb
#another skipped script.rb
#Skipped Subfolder/
```

**The file exists, but it still crashes:**

If the file exists and the game still crashes you should make sure the path to the script file does not have special characters, specially in the script's name.

I made sure to remove all of them that I know from all scripts when extraction is done, but to be fully sure try not to use special characters to name your scripts.

These characters, that RPG Maker uses in their built-in editor are invalid:
  - '▼': Character used to define sections.
  - '■': Some plugins may have this character too.

For example:
  - "./Scripts/ 0000 - ▼ Modules.rb"
  - "./Scripts/ 0010 - ■ My Ruby Script ■.rb"

The extension uses a regular expression to remove invalid characters from the script's name, I tried to include as many invalid combinations as possible but I may have missed some.

## Latest Release Notes

## [1.0.6] - 12/01/2024

### Added

+ Extension now provides an output channel to write log messages

### Changed

+ Avoid the extension to restart when a configuration value changes.
  + When changing the relative path to the extracted scripts folder, a restart will still trigger to refresh the tree view

## Contributors
- [marshal](https://github.com/hyrious/marshal)
