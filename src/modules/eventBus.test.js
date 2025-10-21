// src/modules/eventBus.test.js

import { EventBus, bus } from './eventBus.js';

describe('EventBus', () => {
  let eventBus;
  let mockHandler;

  beforeEach(() => {
    // Create a new EventBus instance for each test
    // Note: In a real browser environment, window[KEY] would be used.
    // For testing, we instantiate directly to isolate.
    eventBus = new EventBus();
    mockHandler = jest.fn(); // Using jest.fn() for mock functions
  });

  test('should register and emit an event', () => {
    eventBus.on('testEvent', mockHandler);
    eventBus.emit('testEvent');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  test('should remove an event handler', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const unregister = eventBus.on('removeTest', handler1);
    eventBus.on('removeTest', handler2);

    eventBus.off('removeTest', handler1);
    eventBus.emit('removeTest');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);

    // Test the returned unregister function
    eventBus.off('removeTest', handler2);
    eventBus.emit('removeTest');
    expect(handler2).toHaveBeenCalledTimes(1); // Should not be called again
  });

  test('should deliver payload to handlers', () => {
    const payload = { data: 'test payload' };
    eventBus.on('payloadTest', mockHandler);
    eventBus.emit('payloadTest', payload);
    expect(mockHandler).toHaveBeenCalledWith(payload);
  });

  test('should handle multiple handlers for the same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    eventBus.on('multiHandler', handler1);
    eventBus.on('multiHandler', handler2);
    eventBus.emit('multiHandler');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  test('should not throw an error if emitting an event with no listeners', () => {
    // No listeners registered for 'noListenerEvent'
    expect(() => eventBus.emit('noListenerEvent')).not.toThrow();
  });

  test('should catch and log errors during emit', () => {
    const errorHandler = jest.spyOn(console, 'error').mockImplementation(() => {}); // Mock console.error
    const errorThrowingHandler = jest.fn(() => {
      throw new Error('Simulated error');
    });

    eventBus.on('errorTest', errorThrowingHandler);
    eventBus.emit('errorTest', 'some payload');

    expect(errorThrowingHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith('[bus]', 'errorTest', expect.any(Error));

    errorHandler.mockRestore(); // Restore console.error
  });

  // Note: Testing cross-tab communication (window[KEY]) is complex and
  // typically requires a browser environment with multiple tabs open or
  // specialized testing tools. This test suite focuses on the core EventBus logic.
  // The 'bus' export uses window[KEY] in the browser, which would be tested
  // in a browser context.
});
