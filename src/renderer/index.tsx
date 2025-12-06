// Polyfills are now loaded via webpack entry point (polyfills-entry.ts)
// This ensures they run before webpack-dev-server client code

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Error boundary for better debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
    if (window.syscatApi) {
      window.syscatApi.logError('React render error', { error: error.message, stack: error.stack });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#fff', fontFamily: 'monospace' }}>
          <h1>Error loading SysCat</h1>
          <p>{this.state.error?.message}</p>
          <pre style={{ background: '#1e293b', padding: '10px', borderRadius: '4px' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Function to proceed with React initialization
function proceedWithInitialization() {
  // Check if root element exists
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[Renderer] Root element not found!');
    document.body.innerHTML = '<div style="padding: 20px; color: #fff;">Error: Root element not found</div>';
    return;
  }
  
  console.log('[Renderer] Root element found, creating React root...');
  try {
    const root = ReactDOM.createRoot(rootElement);
    console.log('[Renderer] React root created, rendering App...');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('[Renderer] SysCat renderer loaded successfully');
  } catch (error) {
    console.error('[Renderer] Failed to render React app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #fff; font-family: monospace; background: #0F172A; min-height: 100vh;">
        <h1 style="color: #ea580c;">Failed to load SysCat</h1>
        <p style="color: #fca5a5;">${error instanceof Error ? error.message : String(error)}</p>
        <pre style="background: #1e293b; padding: 10px; border-radius: 4px; overflow: auto;">
          ${error instanceof Error ? error.stack : ''}
        </pre>
      </div>
    `;
  }
}

// Function to check if syscatApi is ready and valid
function isApiReady(): boolean {
  // Use (window as any) to bypass TypeScript checks and access the actual window object
  const api = (window as any).syscatApi;
  
  // Detailed logging for debugging
  if (!api) {
    console.log('[Renderer] syscatApi check: api is', typeof api, api);
    return false;
  }
  
  console.log('[Renderer] syscatApi found! Type:', typeof api, 'Keys:', Object.keys(api));
  
  // Check if preload script had an error
  if (api.error) {
    console.error('[Renderer] Preload script error:', api.error);
    console.error('[Renderer] Error details:', api.details);
    return false;
  }
  
  // Check if it has the expected methods
  if (typeof api.getAuthStatus === 'function') {
    console.log('[Renderer] syscatApi.getAuthStatus is a function - API is ready!');
    return true;
  }
  
  console.warn('[Renderer] syscatApi exists but getAuthStatus is not a function. Type:', typeof api.getAuthStatus);
  return false;
}

// Function to initialize renderer once syscatApi is ready
function initializeRenderer() {
  if (isApiReady()) {
    const api = (window as any).syscatApi;
    console.log('[Renderer] syscatApi is available! Methods:', Object.keys(api).join(', '));
    return true;
  }
  return false;
}

function checkApiAndProceed() {
  console.log('[Renderer] DOM ready, checking for syscatApi...');
  console.log('[Renderer] window object:', typeof window);
  console.log('[Renderer] window.syscatApi direct check:', typeof (window as any).syscatApi);
  console.log('[Renderer] document.readyState:', document.readyState);
  
  // Try immediate check
  if (initializeRenderer()) {
    proceedWithInitialization();
    return;
  }
  
  // Poll for API with exponential backoff
  let checkCount = 0;
  let delay = 50; // Start with 50ms
  const maxChecks = 100; // Maximum 100 checks (~5 seconds total)
  
  const checkInterval = () => {
    checkCount++;
    
    // Log every 10th check for debugging
    if (checkCount % 10 === 0) {
      console.log(`[Renderer] Checking syscatApi (attempt ${checkCount}/${maxChecks})...`);
      console.log(`[Renderer] window.syscatApi:`, typeof (window as any).syscatApi, (window as any).syscatApi);
    }
    
    if (initializeRenderer()) {
      console.log(`[Renderer] syscatApi found after ${checkCount} checks (${(checkCount * delay / 1000).toFixed(2)}s)`);
      proceedWithInitialization();
      return;
    }
    
    if (checkCount >= maxChecks) {
      console.error('[Renderer] syscatApi still not available after maximum checks.');
      console.error('[Renderer] Final check - window.syscatApi:', typeof (window as any).syscatApi);
      console.error('[Renderer] window object keys:', Object.keys(window).filter(k => k.includes('syscat') || k.includes('electron')));
      console.error('[Renderer] Possible causes:');
      console.error('[Renderer] 1. Preload script failed to load (check main process logs)');
      console.error('[Renderer] 2. Preload script path is incorrect');
      console.error('[Renderer] 3. contextBridge.exposeInMainWorld failed');
      console.error('[Renderer] 4. Context isolation issue');
      console.error('[Renderer] 5. Timing issue - preload script may not have finished');
      
      // Show error UI
      const rootElement = document.getElementById('root');
      if (rootElement) {
        rootElement.innerHTML = `
          <div style="padding: 40px; color: #fff; font-family: system-ui, sans-serif; background: #0F172A; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
            <div style="max-width: 600px; text-align: center;">
              <h1 style="color: #ea580c; margin-bottom: 16px;">SysCat Failed to Initialize</h1>
              <p style="color: #fca5a5; margin-bottom: 24px;">The preload script API is not available. Please check the console (F12) and main process logs for details.</p>
              <button onclick="window.location.reload()" style="padding: 12px 24px; background: #ea580c; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                Reload Application
              </button>
            </div>
          </div>
        `;
      }
      return;
    }
    
    // Exponential backoff: increase delay gradually, but cap at 200ms
    setTimeout(checkInterval, delay);
    delay = Math.min(delay * 1.1, 200);
  };
  
  // Start checking
  setTimeout(checkInterval, delay);
}

// Wait for DOM to be ready, then check for API
function waitForApiAndInitialize() {
  // If DOM is already ready, check immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    checkApiAndProceed();
  } else {
    // Wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', checkApiAndProceed, { once: true });
  }
}

// Debug: Check if syscatApi is available
console.log('[Renderer] Starting renderer process...');
console.log('[Renderer] EventEmitter available:', typeof (window as any).EventEmitter !== 'undefined');
console.log('[Renderer] window.syscatApi available:', typeof (window as any).syscatApi !== 'undefined');
console.log('[Renderer] document.readyState:', document.readyState);

// Global error handlers for better debugging
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('[Renderer] Unhandled promise rejection:', event.reason);
  if (window.syscatApi) {
    window.syscatApi.logError('Unhandled promise rejection', {
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  }
  // Don't prevent default - let React error boundaries handle it if possible
  // But log it for debugging
});

window.addEventListener('error', (event: ErrorEvent) => {
  console.error('[Renderer] Global error:', event.error);
  if (window.syscatApi) {
    window.syscatApi.logError('Global error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    });
  }
});

// Start the initialization process
waitForApiAndInitialize();

