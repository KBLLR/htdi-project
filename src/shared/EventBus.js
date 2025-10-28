/**
 * A simple Event Bus implementation for managing and dispatching events.
 * Allows components to communicate without direct dependencies.
 */
export class EventBus {
  constructor() {
    /**
     * @private
     * @type {Object.<string, Function[]>}
     */
    this.listeners = {};
  }

  /**
   * Subscribes a callback function to a specific event.
   * @param {string} event - The name of the event to listen for.
   * @param {Function} callback - The function to call when the event is emitted.
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      console.warn(`EventBus: Listener for event '${event}' is not a function.`, callback);
      return;
    }
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Subscribes a callback function to a specific event, to be called only once.
   * After the event is emitted and the callback is invoked, the listener is automatically removed.
   * @param {string} event - The name of the event to listen for.
   * @param {Function} callback - The function to call when the event is emitted.
   */
  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }

  /**
   * Unsubscribes a callback function from a specific event.
   * @param {string} event - The name of the event to stop listening for.
   * @param {Function} callback - The function to remove.
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(listener => listener !== callback);
    }
  }

  /**
   * Emits an event, invoking all registered callback functions for that event.
   * Each listener is called within a try-catch block to prevent one error from stopping others.
   * @param {string} event - The name of the event to emit.
   * @param {*} [data] - Optional data to pass to the event listeners.
   */
  emit(event, data) {
    if (this.listeners[event]) {
      // Create a shallow copy to prevent issues if listeners modify the array during iteration
      [...this.listeners[event]].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`EventBus: Error in listener for event '${event}':`, error);
        }
      });
    }
  }

  /**
   * Clears all listeners for a specific event, or all listeners for all events if no event is specified.
   * @param {string} [event] - The optional name of the event for which to clear all listeners.
   */
  clear(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}