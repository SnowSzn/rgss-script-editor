import * as vscode from 'vscode';
import * as manager from './modules/manager';

// TODO: Create extension
/*
      1. Hacer que la extension sea capaz de recargarse si se cambia algunos de los valores criticos
      de la configuracion de la extension (por ejemplo, Scripts Folder Path)
        -> Que pasaria si se mueve la carpeta de scripts mientras se esta ejecutando la extension?
      
      2. Vista de arbol:
        2.1 La vista de arbol esta formada por instancias de EditorSection (hereda de vscode.TreeItem).
          2.1.1 Cada EditorSection tiene una prioridad, que marcara la posicion dentro del arbol, ademas
          del orden de carga cuando se ejecute el juego.
          2.1.2 Cada EditorSection puede ser de un tipo diferente:
            -> Separador
            -> Carpeta
            -> Script
          2.1.3 Se usara el checkbox built-in de VSCode para determinar si un item sera cargado o no.
            2.1.3.1 Cuando un item no este cargado, se escribira en el load_order.txt con "#" al comienzo.
            NOTA: Se deberá incluir "#" en el regexp de caracteres invalidos para evitar que se creen ficheros
            con este caracter y genere conflictos con esta caracteristica de la extension.

        2.2 El arbol se guardara en el fichero load_order.txt, dentro de la carpeta de Scripts extraidos
          2.2.1 Todas las instancias de EditorSection deben de ser escritas en el fichero, esto se debe a que
          se usara este fichero para guardar el estado del arbol en todo momento y, cuando se vuelva a abrir el editor.
          no se tenga que volver a ordenar los items del arbol.
          Las instancias de EditorSection que no esten cargadas, se pueden escribir con un caracter especial para identificarlas.
          2.2.1 Para evitar inconsistencias entre el fichero load_order.txt y el orden actual dentro de VSCode, cada vez que
          se haga una modificacion dentro del arbol, ya sea borrado/creacion/movimiento... se debera actualizar el fichero load_order.txt

        2.3 La extension, a la hora de mover tree items del arbol, debe de procesar este movimiento de la siguiente forma:
          - Si lo que se arrastra (source) acaba dropeado en algo que no es una carpeta (target):
            -> La prioridad del source sera la prioridad SIGUIENTE del target, y a partir de ahi se actualiaran todas las prioridades
          - Si lo que se arrastra (source) acaba en una carpeta (target):
            -> Se insertara el source como hijo del script section que es una carpeta y se actualizará todas las prioridades

        2.4 El arbol, cada vez que se cambie de carpeta, se reconstruira leyendo el fichero load_order.txt.
          - Por cada entrada que exista, se creara una EditorSection apropiada.
          - Si la entrada no existe, se ignora.

      3. Quitar la necesidad de insertar un prefijo a los ficheros cuando se extraen.
        3.1 En lugar de prefijar todos los ficheros con un indice (0001 - ) se podria crear las instancias de EditorSection
        mientras se extrae, de tal forma que cuando termine la extraccion, todos los ficheros estarian ordenados.

      4. Implementar un comando ``scan()`` para leer recursivamente la carpeta de scripts buscando ficheros Ruby que hayan
      sido creados mientras VSCode estaba cerrado.

      5. Opcional: Hacer que la extension pueda leer opciones de un fichero JSON en la carpeta del proyecto
      por ejemplo: un fichero 'rgss-script-editor.json' que sobreescribirá al configuracion
      de VSCode (en configuration.ts), si gameName en VSCode es 'Game.exe'
      en el fichero local se podria cambiar el gameName a 'Juego.exe' y la extension
      seria capaz devolver la opcion de VSCode o la opcion del JSON
*/

/**
 * Entry point.
 *
 * This method is called when your extension is activated.
 *
 * Your extension is activated the very first time the command is executed.
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // **********************************************************
  // VSCode Configuration change event.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('rgssScriptEditor.external.scriptsFolder')
      ) {
        vscode.window.showInformationMessage(
          'External scripts folder path change detected!'
        );
        manager.restart();
      }
    })
  );
  // **********************************************************
  // VSCode Tree view update active file
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      manager.updateActiveFile(editor);
    })
  );
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
              manager.setProjectFolder(value.uri);
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
  // Reveal script section
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.revealScriptSection',
      (what) => {
        manager.revealScriptSection(what);
      }
    )
  );
  // Create script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.createScriptSection',
      (what) => {
        vscode.window
          .showQuickPick(
            ['Create Script', 'Create Folder', 'Create Separator'],
            {
              placeHolder: 'Choose the type of section to create',
              canPickMany: false,
              ignoreFocusOut: false,
              title: 'RGSS Script Editor',
            }
          )
          .then((option) => {
            if (option) {
              manager.createScriptSection(what, option);
            } else {
              // vscode.window.showInformationMessage(
              //   'You must select a valid option to create a script section!'
              // );
            }
          });
      }
    )
  );
  // Delete script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.deleteScriptSection',
      (what) => {
        manager.deleteScriptSection(what);
      }
    )
  );
  // Rename script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.renameScriptSection',
      (what) => {
        manager.renameScriptSection(what);
      }
    )
  );
  // Alternate load status script command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.alternateLoadScriptSection',
      (what) => {
        manager.alternateLoadScriptSection(what);
      }
    )
  );
  // TODO: Refresh controllers?
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.refresh', () => {
      manager.refresh();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.alternateDropMode',
      () => {
        manager.alternateDropMode();
      }
    )
  );
  // Process game exception
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.processGameException',
      () => {
        manager.processGameException();
      }
    )
  );
  // **********************************************************
  // Open load order txt file.
  context.subscriptions.push(
    vscode.commands.registerCommand('rgss-script-editor.openLoadOrder', () => {
      manager.openLoadOrderFile();
    })
  );
  // **********************************************************
  // Create load order txt file
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'rgss-script-editor.updateLoadOrder',
      () => {
        manager.createLoadOrderFile();
      }
    )
  );
  // **********************************************************
  // Start extension
  manager.restart();
  // **********************************************************
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate() {
  manager.dispose();
}
