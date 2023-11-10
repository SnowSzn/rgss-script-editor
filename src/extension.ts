// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as manager from './modules/Manager';

// TODO: Create extension
/*
      Crear una extension de VSCode que hara los siguientes comandos:

      - 1. Extract scripts
        1.1 Extrae todos los scripts del fichero 'bundle' de scripts a ficheros separados en una carpeta
          -> Esto dependerá de la version de RGSS de la carpeta del proyecto
        1.2 Se creará una copia de seguridad del fichero 'bundle' de scripts
        1.3 Se creará un fichero 'bundle' de scripts 'dummy' que servirá como cargador de ficheros
          -> Kernel.send(:require, SCRIPT_PATH_HERE)
          -> Source: https://forums.rpgmakerweb.com/index.php?threads/scripts-externalizer-scripts-loader-scripts-compiler.91198/
      - 2. Create a bundled script file
        Guarda todos los scripts separados de una carpeta en un fichero 'bundle' de scripts en el directorio del proeycto
          -> Este metodo NO SOBREESCRIBIRÁ el fichero 'bundle' dummy que se creó
            -> Se usará para crear un fichero para la distribución del juego.
      - 3. Overwrite bundle script file
        Guarda todos los scripts separados de una carpeta en un fichero 'bundle'.
          -> Este comando SI SOBREESCRIBIRÁ el fichero 'bundle' dummy con un fichero nuevo creado a partir de los ficheros sueltos
      - 4. Set Project Path
        Actualiza la carpeta activa del proyecto.
          -> Se resetearan todas las configuraciones para este nuevo path

      Crear una forma de ordenar la carga de ficheros cuando se cree el dummy 'bundle' file, dos formas:
        - 1. Crear una vista dentro del editor de vscode para ordenar ficheros (dificil)
          -> Un editor que haga mas facil crear el orden de carga de los scripts
        - 2. Crear un fichero txt (load.txt) dentro de la carpeta donde estaran todos los nombres de los scripts a cargar en orden
          -> Permitirá subcarpetas
          -> Ejemplo: 'load.txt'
            - prueba.rb
            - Modules/module1.rb
            - Modules/module2.rb
            - Modules/module3.rb
            - Addons/Actors/actor.rb
            - etc ...
        Info: https://code.visualstudio.com/api/references/contribution-points (contributes.customEditors)
      
      Hacer que la extension pueda leer opciones de un fichero JSON en la carpeta del proyecto
      por ejemplo: un fichero 'rgss-script-editor.json' que sobreescribirá al configuracion
      de VSCode (en configuration.ts), si gameName en VSCode es 'Game.exe'
      en el fichero local se podria cambiar el gameName a 'Juego.exe' y la extension
      seria capaz devolver la opcion de VSCode o la opcion del JSON

      Añadir un check para no permitir que se vuelva a extraer los ficheros de fichero bundle
      si ya se ha hecho, esto es una medida de seguridad para evitar que se sobreescriba el contenido
      de la carpeta de Scripts si ya se hizo, ya que una vez que los scripts se extraen, se sobreescribira
      el fichero bundle con un fichero preparado para cargar los scripts de la carpeta, en el caso de que
      se cambie de nombre la carpeta, deberia existir un comando para re-crear el fichero bundle con el nuevo path

      Otras ideas:
      Cambiar las opciones de la extension sobre los argumentos:
        - A) Allow auto. arguments detection (boolean)
          -> Allows the extension to determine the appropiate RPG Maker game arguments based on the RGSS version
          -> When 'auto. detection' mode is ON custom arguments are ignored
        - B) Enable Native Console (boolean)
          -> Whether to allow a console to appear on game execution or not (only RPG Maker VX Ace)
          -> This flag only works for 'auto. arguments detection' mode
        - C) Enable test mode (boolean)
          -> Whether to run the game on test mode or not
          -> This flag only works for 'auto. arguments detection' mode
        - D) Custom Arguments (string)
          -> Set your own custom arguments here that will be used when auto. detection is turned off
          -> This option ignores the state of the B and C flags since they are custom arguments
*/
// TODO: INFO: https://stackoverflow.com/questions/39569993/vs-code-extension-get-full-path

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // **********************************************************
  // Set project folder command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.setProjectFolder',
      () => {
        vscode.window
          .showWorkspaceFolderPick({
            placeHolder: 'Choose the RPG Maker active project folder',
            ignoreFocusOut: true,
          })
          .then(async (value) => {
            if (value) {
              await manager.setProjectFolder(value.uri);
            }
          });
      }
    )
  );
  // **********************************************************
  // Open project folder command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.openProjectFolder',
      () => {
        manager.openProjectFolder();
      }
    )
  );
  // **********************************************************
  // Extract scripts
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.extractScripts', () => {
      manager.extractScripts();
    })
  );
  // **********************************************************
  // Run game command
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.runGame', () => {
      manager.runGame();
    })
  );
  // **********************************************************
  // Checks if current opened folder is valid to auto. open it
  let folders = vscode.workspace.workspaceFolders;
  if (folders) {
    manager.quickStart(folders);
  }
  // **********************************************************
}

// This method is called when your extension is deactivated
export function deactivate() {}
