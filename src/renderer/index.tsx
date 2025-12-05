// Ensure global exists (backup in case HTML script didn't run)
if (typeof (window as any).global === 'undefined') {
  (window as any).global = globalThis;
}

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

// Debug: Check if syscatApi is available
console.log('[Renderer] Starting renderer process...');
console.log('[Renderer] window.syscatApi available:', typeof window.syscatApi !== 'undefined');
if (window.syscatApi) {
  console.log('[Renderer] syscatApi methods:', Object.keys(window.syscatApi));
} else {
  console.warn('[Renderer] WARNING: syscatApi is not available. Preload script may not have loaded.');
}

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[Renderer] Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: #fff;">Error: Root element not found</div>';
} else {
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

