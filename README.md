# RGSS Script Editor

This is an extension for Visual Studio Code that makes VSCode usable as the script editor for RPG Maker series based on RGSS framework:
- RPG Maker XP
- RPG Maker VX
- RPG Maker VX Ace

In a nutshell, this extension extracts each script in the bundle file that RPG Maker uses into individual ruby files.
Once the extraction is done, it creates a backup of the original bundle file (``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``) as a security measure and overwrites it with a script loader bundle file that loads ruby scripts inside a relative folder based on a text file that dictates the loading order.

Since this extension uses a different approach for loading scripts, you can use the RPG Maker editor and edit scripts in Visual Studio Code at the same time without worrying about RPG Maker overwriting the bundled file with outdated data.

**Long explanation**

RPG Maker loads all data (including the game's scripts) at startup when the editor is launched, that's why you can modify the scripts inside their built-in script editor and the modification will be saved into the bundled data file (``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``), this happens with every modification you do inside their editor, from maps to the whole database, they are saved into the appropiate data file.

The problem is that RPG Maker does not save these modifications individually, all files are saved at the same time, this means that even if you do not change anything in the game's scripts and modified something else (for example: the database) all scripts will be overwritten with the initial data that was loaded.

This produces an incompatibility with any external script editor or Visual Studio Code extension that works by overwriting the Scripts bundle data file since the editor will overwrite it everytime the project is saved, so basically the easy solution is not having the editor and the external script editor opened and working at the same time. 

This extension tries to circumvent this limitation by overwriting the script bundle data file with a script loader that will load external scripts inside a relative path within the project's folder.

It also allows to specify a load order, skip specific scripts and load all Ruby files inside a folder recursively if you want to organize the scripts inside subfolders, the script loader will read the load_order.txt file and load each script/folder until end of line is reached.

As a security measure, the extension will not allow overwriting the script bundle file (``Scripts.rxdata``, ``Scripts.rvdata`` or ``Scripts.rvdata2``) with the script loader if there are still scripts inside of it that have not yet been extracted.

## Features

- **Run Game:** You can run the game within VSCode using a keybind (F12 by default)
  - Both `test` (`debug`) and `console` modes are supported.
- **Backup Creation:** Backs up the scripts bundled file when extraction is done.
- **Scripts Extraction:** You can extracts all scripts inside the data file to a custom directory within the project's folder.
- **Script Loader:** The game will load all scripts files individually based on a load order
  - You can ignore to load any script by adding a `#` character before the script path.
- **Workspace Support**: You can change the active folder easily in a workspace.

TODO: Add some GIFs or screenshots

For example if there is an image subfolder under your extension project workspace:

using: \!\[feature X\]\(images/feature-x.png\)

## Requirements

### Windows
- [Visual Studio Code](https://code.visualstudio.com/)
### Linux
- [Visual Studio Code](https://code.visualstudio.com/)
- [Wine](https://www.winehq.org/) (preferably the latest version)
  - To take full advantage of the extension you should have wine available on your system, which will be used to run the Windows game executable.
  - You check if Wine is installed in your system with: ``wine --version``
  - **IMPORTANT: If you use MKXP-Z for Linux and you have created a Linux executable for your game, you won't need to install Wine.** 
    - Wine is only required for RPG Maker base executables.
### macOS
- [Visual Studio Code](https://code.visualstudio.com/)
- **Not tested in macOS**

## Extension Settings

This extension contributes the following settings:

* `rgssScriptEditor.extension.quickStart`: Enable/disable quick start mode.
  * Quick start will set the extension's project folder based on the current context:
    * If only one folder is opened and it is a valid RPG Maker project it will be activated.
    * If a workspace is opened (several folders) you will be able to choose the appropiate folder to activate with a button in the status bar.
    * If no folder is opened or the opened folders are not valid RPG Maker projects the extension will deactivate its UI elements automatically.
* `rgssScriptEditor.debug.logToConsole`: Enable/disable logging to VSCode console.
* `rgssScriptEditor.debug.logToFile`: Enable/disable logging to a log file.
* `rgssScriptEditor.external.backUpsFolder`: Sets the relative path within the active RPG Maker project where all backups will be stored.
* `rgssScriptEditor.external.scriptsFolder`: Sets the relative path within the active RPG Maker project where all scripts will be extracted.
* `rgssScriptEditor.gameplay.gameExecutablePath`: Sets the relative path within the active RPG Maker project where the game executable is.
  * You can change this option to allow MKXP-Z executable to be launched.
* `rgssScriptEditor.gameplay.useWine`: Whether to use Wine to execute the game executable or not. (**Linux Only**)
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

## Known Issues

There are some issues that may happen when running this extension, I suspect that they happen due to way ``Kernel.load`` loads files in Ruby 1.9.

If you don't use special characters on scripts files in their names or inside the script's contents nothing will happen, but if it does these are the issues that I've encountered:

* > [SyntaxError] Invalid Multibyte char (US-ASCII) Exception

This may happen in some scripts that are loaded because Ruby 1.9 does not automatically "detect" the file's encoding
so it fails when trying to load a script file that has special characters.

This is easily fixed by adding ``# encoding: utf-8`` in the script.

The extension will add this line in *every script* that it is extracted from the bundle file automatically so you won't have to, but for new scripts you may have to add it yourself if it crashes.

* > [LoadError] no such file to load -- Exception

This exception may happen for a number of reasons:

**The file trying to load does not exists**

Make sure that **all files** within the text file that defines the load order **exists** in the specified path.

If you don't want to load a script file you can simply remove it from the load order TXT file or ignore it with a `#` character at the start of the line, like:
```txt
./Scripts/script.rb
./Scripts/another script.rb
#./Scripts/skipped script.rb
#./Scripts/another skipped script.rb
```

**The file exists, but it still crashes**

If the file exists and RPG Maker still crashes you should make sure the path to the script file does not have special characters, specially in the script's name.

I made sure to remove all of them that I know from all scripts when extraction is done, but to be 100 % try not to use special characters to name your scripts.

For example, these characters, that RPG Maker uses in their built-in editor are invalid:
  - '▼': Character used to define sections.
  - '■': Some plugins may have this character too.

## Release Notes

### 1.0.0

Initial release.

---

## Contributors
- [marshal](https://github.com/hyrious/marshal)
