import * as events from 'events';

/**
 * Event emitter instance
 */
export const handler = new events.EventEmitter();

/**
 * This event is emitted with the old folder and the new folder, in that order
 */
export const ON_PROJECT_FOLDER_CHANGE = 'OnProjectFolderChange';
