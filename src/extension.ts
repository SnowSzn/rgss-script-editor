// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as manager from './modules/manager';

// TODO: Create extension
/*
      Crear una extension de VSCode que hara los siguientes comandos:

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
*/

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
          .then((value) => {
            if (value) {
              manager
                .setProjectFolder(value.uri)
                .then(() => {
                  vscode.window.showInformationMessage(
                    `Folder: '${value.name}' opened succesfully!`
                  );
                })
                .catch(() => {
                  vscode.window.showInformationMessage(
                    `Failed to open the folder: '${value.name}', it isn't a valid RPG Maker project!`
                  );
                });
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
  // Create load order txt file
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createLoadOrder',
      () => {
        manager.createLoadOrder();
      }
    )
  );
  // **********************************************************
  // Create script loader
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createScriptLoader',
      () => {
        manager.createScriptLoader();
      }
    )
  );
  // **********************************************************
  // Create bundle file from extracted scripts
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createBundleFile',
      () => {
        manager.createBundleFile();
      }
    )
  );
  // **********************************************************
  // Run game command
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.runGame', () => {
      manager.runGame();
    })
  );
  // **********************************************************
  // Falls to the quickstart
  manager.quickStart();
  // **********************************************************
}

// This method is called when your extension is deactivated
export function deactivate() {}
