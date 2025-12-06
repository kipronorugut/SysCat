// Polyfills for renderer process - must load before any other code
// This file is imported at the top of index.tsx to ensure it runs first

console.log('[SysCat] Loading polyfills...');

// Global polyfill
if (typeof (window as any).global === 'undefined') {
  (window as any).global = globalThis;
}

// Process polyfill for webpack-dev-server
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: { NODE_ENV: process.env.NODE_ENV || 'development' } };
}

// EventEmitter polyfill - ensure it's available before webpack-dev-server client loads
if (typeof (window as any).EventEmitter === 'undefined') {
  class EventEmitter {
    private _events: { [key: string]: Function[] } = {};

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
      return this.on(event, onceWrapper);
    }

    emit(event: string, ...args: any[]): this {
      if (this._events[event]) {
        this._events[event].forEach((listener) => {
          try {
            listener(...args);
          } catch (e) {
            console.error('[EventEmitter] Error in listener:', e);
          }
        });
      }
      return this;
    }

    removeListener(event: string, listener: Function): this {
      if (this._events[event]) {
        this._events[event] = this._events[event].filter((l) => l !== listener);
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

  (window as any).EventEmitter = EventEmitter;

  // Make events module available for require()
  const eventsModule = {
    EventEmitter,
    default: EventEmitter,
  };

  if (typeof (window as any).require === 'undefined') {
    (window as any).require = function (module: string) {
      if (module === 'events') {
        return eventsModule;
      }
      throw new Error('Cannot find module: ' + module);
    };
  } else {
    const originalRequire = (window as any).require;
    (window as any).require = function (module: string) {
      if (module === 'events') {
        return eventsModule;
      }
      return originalRequire(module);
    };
  }

  console.log('[SysCat] EventEmitter polyfill loaded');
}

export {};

