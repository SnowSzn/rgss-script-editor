# RGSS Script Editor

This is an extension for Visual Studio Code that makes VSCode usable as a script editor for RPG Maker XP, RPG Maker VX and RPG Maker VX Ace.

This extension extracts all the scripts from the bundle file that RPG Maker uses, and overwrites the bundle file with a 'script loader' script that loads individual scripts based on a text file that dictates the loading order.

## Features

- **Run the Game:** Run the game in VSCode using a custom keybind (F12 by default)
  - Test mode: You can enable/disable test mode when running the game.
  - Console Window: You can enable/disable console allocation when running the game. **(only available for RPG Maker VX Ace)**
  - Custom Arguments: If you want to run the game with your custom arguments you can set them in the extension's settings.
- TBD.

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

### Windows
- [Visual Studio Code](https://code.visualstudio.com/)
### Linux
- [Visual Studio Code](https://code.visualstudio.com/)
- [Wine](https://www.winehq.org/) (preferably the latest version)
  - To take full advantage of the extension you should have wine available on your system, which will be used to run the Windows game executable.
  - You check if Wine is installed in your system with: ``wine --version``
### macOS
- [Visual Studio Code](https://code.visualstudio.com/)
- **Not tested in macOS**

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

``Exception``

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
# RGSS Script Editor

This is an extension for Visual Studio Code that makes VSCode usable as a script editor for RPG Maker XP, RPG Maker VX and RPG Maker VX Ace.

This extension extracts all the scripts from the bundle file that RPG Maker uses, and overwrites the bundle file with a 'script loader' script that loads individual scripts based on a text file that dictates the loading order.

## Features

- **Run the Game:** Run the game in VSCode using a custom keybind (F12 by default)
  - Test mode: You can enable/disable test mode when running the game.
  - Console Window: You can enable/disable console allocation when running the game. **(only available for RPG Maker VX Ace)**
  - Custom Arguments: If you want to run the game with your custom arguments you can set them in the extension's settings.
- TBD.

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

### Windows
- [Visual Studio Code](https://code.visualstudio.com/)
### Linux
- [Visual Studio Code](https://code.visualstudio.com/)
- [Wine](https://www.winehq.org/) (preferably the latest version)
  - To take full advantage of the extension you should have wine available on your system, which will be used to run the Windows game executable.
  - You check if Wine is installed in your system with: ``wine --version``
### macOS
- [Visual Studio Code](https://code.visualstudio.com/)
- **Not tested in macOS**

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

> [SyntaxError] Invalid Multibyte char (US-ASCII) Exception

This may happen in some scripts that are loaded because Ruby 1.9 does not automatically detect the file's encoding
so it fails when trying to load a script file that has special characters.

This is easily fixed by adding ``# encoding: utf-8`` in the script.

I've added this line in every script that it is extracted from the bundle file, but for new scripts you may have to add it yourself if it crashes.

> [LoadError] no such file to load -- {SCRIPT_FILE} Exception

This may happen for a number of reasons:
- **The file trying to load does not exists**

Make sure that ALL files within the text file that defines the load order exists in the specified path.

If you don't want to load a script file you can simply ignore it and remove it from the load order.

- **The file exists, but it still crashes**

If the file exists and RPG Maker still crashes you should make sure the path to the script file does not have special characters.

I believe there some weirdness going on with ``Kernel.require`` when it comes to load a script file that contains special characters.

I made sure to remove all of them that I know from all scripts when extraction is done, but to be 100 % try not to use special characters to name your scripts.

For example, these characters, that RPG Maker uses in their built-in editor are invalid:
  - '▼': Character used to define sections.
  - '■': Some plugins may have this character too.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Credits
- [marshal](https://github.com/hyrious/marshal)

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
