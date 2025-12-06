// Polyfill entry point - must run before any other code including webpack-dev-server client
// This file is loaded first to ensure EventEmitter and other globals are available

console.log('[SysCat] Initializing polyfills...');

// Global polyfill
if (typeof (window as any).global === 'undefined') {
  (window as any).global = globalThis;
  console.log('[SysCat] Global polyfill loaded');
}

// Process polyfill for webpack-dev-server
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { 
    env: { NODE_ENV: process.env.NODE_ENV || 'development' },
    nextTick: (cb: () => void) => setTimeout(cb, 0),
    version: '',
    versions: {},
    platform: 'browser',
  };
  console.log('[SysCat] Process polyfill loaded');
}

// Use bundled events shim instead of external events package
// This ensures EventEmitter is available even if events is externalized
import { EventEmitter } from './events-shim';

// Make EventEmitter available globally and as a window property
(window as any).EventEmitter = EventEmitter;
(globalThis as any).EventEmitter = EventEmitter;

// Create events module - CRITICAL: require('events') must return the EventEmitter constructor directly
// But it also needs EventEmitter as a property for destructuring: const { EventEmitter } = require('events')
// This matches the real Node.js events package structure
const eventsModule = EventEmitter as any;
eventsModule.EventEmitter = EventEmitter;

// Set up require polyfill for events module
if (typeof (window as any).require === 'undefined') {
  (window as any).require = function (module: string) {
    if (module === 'events') {
      console.log('[SysCat] require("events") called - returning EventEmitter constructor');
      return eventsModule;
    }
    console.warn('[SysCat] require() called for unknown module:', module);
    throw new Error('Cannot find module: ' + module);
  };
} else {
  const originalRequire = (window as any).require;
  (window as any).require = function (module: string) {
    if (module === 'events') {
      console.log('[SysCat] require("events") called - returning EventEmitter constructor');
      return eventsModule;
    }
    try {
      return originalRequire(module);
    } catch (e) {
      console.warn('[SysCat] require() failed for module:', module, e);
      throw e;
    }
  };
}

console.log('[SysCat] EventEmitter polyfill loaded successfully');
console.log('[SysCat] EventEmitter available:', typeof EventEmitter !== 'undefined');
console.log('[SysCat] window.EventEmitter available:', typeof (window as any).EventEmitter !== 'undefined');

export { EventEmitter };

