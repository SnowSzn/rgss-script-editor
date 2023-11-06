// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as manager from './modules/manager';

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
*/
// TODO: INFO: https://stackoverflow.com/questions/39569993/vs-code-extension-get-full-path

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Set project folder command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.setProjectFolder',
      () => {
        vscode.window
          .showWorkspaceFolderPick({
            placeHolder: 'Select the RPG Maker project folder',
            ignoreFocusOut: true,
          })
          .then((value) => {
            if (value) {
              manager.setProjectFolder(value.uri);
            }
          });
      }
    )
  );
  // Extract scripts
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.extractScripts', () => {
      manager.extractScripts();
    })
  );
  // Run game command
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.runGame', () => {
      manager.runGame();
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
