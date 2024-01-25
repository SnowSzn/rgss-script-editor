# Change Log

All notable changes to the "rgss-script-editor" extension will be documented in this file.

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
