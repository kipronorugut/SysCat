// Events shim for browser/Electron renderer context
// This provides EventEmitter functionality when the events package is externalized
// Must work with both CommonJS require() and ES modules
// CRITICAL: This must match the real events package structure where require('events') returns the EventEmitter constructor

class EventEmitter {
  private _events: { [key: string]: Function[] } = {};

  constructor() {
    // Ensure proper constructor behavior
    if (!(this instanceof EventEmitter)) {
      return new EventEmitter();
    }
    this._events = {};
  }

  on(event: string, listener: Function): this {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.removeListener(event, onceWrapper);
    };
    onceWrapper.listener = listener;
    return this.on(event, onceWrapper);
  }

  emit(event: string, ...args: any[]): this {
    if (this._events[event]) {
      const listeners = this._events[event].slice();
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (e) {
          console.error('[EventEmitter] Error in listener:', e);
        }
      }
    }
    return this;
  }

  removeListener(event: string, listener: Function): this {
    if (this._events[event]) {
      const index = this._events[event].findIndex(
        (l) => l === listener || (l as any).listener === listener
      );
      if (index >= 0) {
        this._events[event].splice(index, 1);
        if (this._events[event].length === 0) {
          delete this._events[event];
        }
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
}

// CommonJS export - CRITICAL: The real events package exports EventEmitter as the default
// So require('events') returns the EventEmitter constructor directly, not an object
// But it also has EventEmitter as a property for destructuring: const { EventEmitter } = require('events')
const EventEmitterConstructor = EventEmitter as any;

// Add EventEmitter as a property so destructuring works: const { EventEmitter } = require('events')
EventEmitterConstructor.EventEmitter = EventEmitter;

// For CommonJS (webpack's require system)
// This makes require('events') return the constructor directly, matching Node.js behavior
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = EventEmitterConstructor;
}

// For ES modules
export { EventEmitter };
export default EventEmitter;

