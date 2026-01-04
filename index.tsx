import React, { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Service Worker Registration
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(err => console.log('SW failed', err));
  });
}

// Basic Environment Check
if (window.location.protocol === 'file:') {
  const warning = document.createElement('div');
  warning.id = 'file-warning';
  warning.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: #f59e0b; color: white; text-align: center; padding: 12px; z-index: 9999; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);";
  warning.innerHTML = '<i class="fas fa-exclamation-triangle ml-2"></i> Warning: Local file protocol detected. Map and AI features may be limited. Please use a local server.';
  document.body.prepend(warning);
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Simple Error Boundary to prevent white screens
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-bug text-2xl"></i>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 font-bold mb-4">The application encountered an unexpected error.</p>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-left text-xs font-mono overflow-auto max-h-40 mb-6">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-colors w-full"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Ensure the root container exists
let rootContainer = document.getElementById('root');
if (!rootContainer) {
  rootContainer = document.createElement('div');
  rootContainer.id = 'root';
  document.body.appendChild(rootContainer);
}

// Mount the React application
const root = createRoot(rootContainer!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);