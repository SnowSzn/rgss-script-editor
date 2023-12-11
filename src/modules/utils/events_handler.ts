import * as events from 'events';
import { logger } from './logger';

/**
 * Context events emitter instance.
 */
const contextEvents = new events.EventEmitter();

/**
 * Event that refresh the extension.
 */
export const EVENT_REFRESH = 'refresh-extension';

/**
 * Emits an event with the given name and arguments.
 * @param eventName Event name.
 * @param args List of arguments.
 */
export function sendEvent(eventName: string, ...args: any[]) {
  logger.logInfo(`Sending event: ${eventName}`);
  contextEvents.emit(eventName, ...args);
}

/**
 * Registers a callback for the given event name.
 * @param eventName Event name.
 * @param listener Listener callback.
 */
export function registerEvent(
  eventName: string,
  listener: (...args: any[]) => void
) {
  contextEvents.addListener(eventName, listener);
}

/**
 * Unregisters a specific callback from the given event name.
 * @param eventName Event name.
 * @param listener Listener callback.
 */
export function unregisterEvent(
  eventName: string,
  listener: (...args: any[]) => void
) {
  contextEvents.removeListener(eventName, listener);
}
