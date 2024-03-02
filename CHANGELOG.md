# Change Log

All notable changes to the "rgss-script-editor" extension will be documented in this file.

## [1.2.1] - 02/03/2024

### Changed

+ Renamed some commands to make them clearer
+ Improved the README file

### Fixed

+ Fixed toggle section command not toggling the tree item with right click
  + Toggling a section with the context menu (right click) did not work if a section was selected on the tree

## [1.2.0] - 29/02/2024

### Added

+ A new command to create a bundle file from the current selected editor sections on the tree view
  + You can select any group of sections on the tree view and create a bundle including only those sections
  + Sections will be included whether they are enabled or disabled

### Changed

+ Modified create bundle file and create backup bundle file commands to adapt it to the new feature
+ Renamed Create Script Loader command

## [1.1.0] - 01/02/2024

### Added

+ Extension is now able to create a script tree and load order from a bundled scripts data file
  + Only bundled scripts data files created by this extension are supported
  + You will be able to restore the tree easily in case it was overwritten
+ Allows the user to quickly create a back up file of the current enabled scripts in the tree
  + This process is the same as creating a bundle file but does it automatically
  + All backups are stored with a time stamp

### Changed

+ Avoid creating empty backup files of the bundled scripts data if invalid
  + 'Invalid' means that only the script loader was inside of the bundled data file
+ Bundle creation now allows to overwrite an existing file
+ Modified some logging information to make it clearer

### Fixed

+ Fixed folder recognition to avoid empty filesystem entries to be recognized as valid folders

## [1.0.11] - 27/01/2024

### Changed

+ Reworded the description of the extension settings
+ Removed an unnecessary load order refresh call
+ Added a warning when deleting sections
+ Bundle file created file extension is now automatically appended based on the RGSS version

## [1.0.10] - 25/01/2024

### Changed

+ Changed save dialog default uri to the project's folder when creating a bundle file for convenience

## [1.0.9] - 25/01/2024

### Added

+ Added the possibility of modifying the Wine command for Linux users
  + Turned Wine setting from a checkbox into an inputbox

### Fixed

+ Cleaned the extension's output folder to ensure compatibility with case sensitive file systems

## [1.0.8] - 17/01/2024

### Added

+ Added an information window when a workspace with more than one valid folder is opened.
+ Game exceptions are now displayed with a timestamp of when they occurred.

### Fixed

+ Game exceptions are now correctly written to the output file.
  + Script loader was writing serialized data in non-binary mode

## [1.0.7] - 13/01/2024

### Added

+ Added a submenu in the script editor view with some useful commands
  + You can create sections now with an empty script editor tree

### Changed

+ Logger output channel language id was changed to 'log' to support highlighting

### Fixed

+ Logger is now properly disposed when extension is deactivated

## [1.0.6] - 12/01/2024

### Added

+ Extension now provides a output channel to write log messages

### Changed

+ Avoid the extension to restart when a configuration value changes.
  + When changing the relative path to the extracted scripts folder, a restart will still trigger to refresh the tree view

## [1.0.5] - 07/01/2024

### Fixed

+ Avoids extension restarting when an unknown configuration changes

## [1.0.4] - 06/01/2024

### Added

+ More invalid characters that crashes the game

## [1.0.3] - 06/01/2024

### Added

+ Avoid unnecesary refresh calls when file system watcher creates an existing editor section

## [1.0.2] - 05/01/2024

### Fixed

+ RPG Maker XP not skipping ignored script files

## [1.0.1] - 05/01/2024

### Changed

+ Invalid characters shown on user input window

## [1.0.0] - 05/01/2024

### Added

- Initial release
