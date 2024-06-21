# Change Log

All notable changes to the "rgss-script-editor" extension will be documented in this file.

## [1.3.1] - 21/06/2024

### Fixed

- Fixed an issue reveal script on the tree view
  - Due to VS Code limitations, the reveal depth allows up to three levels
    - The reveal operation failed when the script is more deep than three levels
- Fixed a problem when collapsing and expanding folders
  - The extension did not update the collapsible status of the folder
    - When the tree was refreshed, the collapsible status was reset to the default state

### Changed

- Changed debug to file option default value to false
  - Avoids unnecesary file write calls
  - Users can enable it manually when reporting bugs

## [1.3.0] - 20/06/2024

### Added

- The extension now automatically re-creates the script loader every time the user opens a folder if the scripts are already extracted
  - It is recommended to leave it active, so the extension can update the script loader between updates.
  - Optionally, it can be disabled, but the user will have to update the script loader manually with the corresponding command.
- Added run game behavior option
  - The user can choose how the extension behaves when trying to launch the game again.
  - You can choose between the following behaviors:
    - Nothing: Does nothing, this how RPG Maker behaves (default)
    - Kill and Run: Kills the current game process and runs it again
    - Allow Multiple: Allows the user to start more than one game process at the same time
- Added files EOL (End-of-File) option
  - Scripts are now created with the appropriate EOL characters
  - You can force the extension to use a specific EOL type (LF, CRLF)
  - You can also let the extension determine the appropriate EOL automatically
    - This is based on the operating system
- Import scripts from bundle files
  - You can import all scripts inside an RPG Maker scripts bundle file
  - Optionally, you can allow whether to overwrite existing scripts or not
- Added a file system watcher to detect the output file the game creates when an exception kills the game
  - In previous versions, the extension processes the game exception only it the game was launched from VS Code
  - If the extension is running. you can launch the game out of VS Code, and it will process the game output file
- Added a new command to reveal a script or folder on the operating system file explorer
  - Available in the context menu when selecting a script or a folder in the script editor view
- Added the possibility for developers to reload scripts on runtime **(EXPERIMENTAL)**
  - The script loader will load scripts again if a ResetLoader exception is raised
  - You can raise this exception anywhere on your code

### Fixed

- The extension now gets the appropriate game process PID instead of the shell process PID
  - The game processes are now properly killed when closing VS Code or switching between projects
- Fixed game process Errno::EBADF exceptions
  - Errno::EBADF was raised sometimes on RPG Maker VX Ace projects
    - The game fails to redirect output to the console output
  - Output is redirected to the null device if this happens to avoid crashes

### Changed

- Changed extension's auto process game error option
  - If enabled, the extension will automatically show the exception without asking the user to peek the backtrace
  - If disabled, it will ask the user before showing the exception information.

## [1.2.1] - 02/03/2024

### Changed

- Renamed some commands to make them clearer
- Improved the README file

### Fixed

- Fixed toggle section command not toggling the tree item with right click
  - Toggling a section with the context menu (right click) did not work if a section was selected on the tree

## [1.2.0] - 29/02/2024

### Added

- A new command to create a bundle file from the current selected editor sections on the tree view
  - You can select any group of sections on the tree view and create a bundle including only those sections
  - Sections will be included whether they are enabled or disabled

### Changed

- Modified create bundle file and create backup bundle file commands to adapt it to the new feature
- Renamed Create Script Loader command

## [1.1.0] - 01/02/2024

### Added

- Extension is now able to create a script tree and load order from a bundled scripts data file
  - Only bundled scripts data files created by this extension are supported
  - You will be able to restore the tree easily in case it was overwritten
- Allows the user to quickly create a back up file of the current enabled scripts in the tree
  - This process is the same as creating a bundle file but does it automatically
  - All backups are stored with a time stamp

### Changed

- Avoid creating empty backup files of the bundled scripts data if invalid
  - 'Invalid' means that only the script loader was inside of the bundled data file
- Bundle creation now allows to overwrite an existing file
- Modified some logging information to make it clearer

### Fixed

- Fixed folder recognition to avoid empty filesystem entries to be recognized as valid folders

## [1.0.11] - 27/01/2024

### Changed

- Reworded the description of the extension settings
- Removed an unnecessary load order refresh call
- Added a warning when deleting sections
- Bundle file created file extension is now automatically appended based on the RGSS version

## [1.0.10] - 25/01/2024

### Changed

- Changed save dialog default uri to the project's folder when creating a bundle file for convenience

## [1.0.9] - 25/01/2024

### Added

- Added the possibility of modifying the Wine command for Linux users
  - Turned Wine setting from a checkbox into an inputbox

### Fixed

- Cleaned the extension's output folder to ensure compatibility with case sensitive file systems

## [1.0.8] - 17/01/2024

### Added

- Added an information window when a workspace with more than one valid folder is opened.
- Game exceptions are now displayed with a timestamp of when they occurred.

### Fixed

- Game exceptions are now correctly written to the output file.
  - Script loader was writing serialized data in non-binary mode

## [1.0.7] - 13/01/2024

### Added

- Added a submenu in the script editor view with some useful commands
  - You can create sections now with an empty script editor tree

### Changed

- Logger output channel language id was changed to 'log' to support highlighting

### Fixed

- Logger is now properly disposed when extension is deactivated

## [1.0.6] - 12/01/2024

### Added

- Extension now provides a output channel to write log messages

### Changed

- Avoid the extension to restart when a configuration value changes.
  - When changing the relative path to the extracted scripts folder, a restart will still trigger to refresh the tree view

## [1.0.5] - 07/01/2024

### Fixed

- Avoids extension restarting when an unknown configuration changes

## [1.0.4] - 06/01/2024

### Added

- More invalid characters that crashes the game

## [1.0.3] - 06/01/2024

### Added

- Avoid unnecesary refresh calls when file system watcher creates an existing editor section

## [1.0.2] - 05/01/2024

### Fixed

- RPG Maker XP not skipping ignored script files

## [1.0.1] - 05/01/2024

### Changed

- Invalid characters shown on user input window

## [1.0.0] - 05/01/2024

### Added

- Initial release
