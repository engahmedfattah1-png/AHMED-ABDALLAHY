import React, { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// --- Error Boundary to prevent White Screen of Death ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 text-center font-sans">
          <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-700">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <i className="fas fa-bug text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold mb-2">Application Error</h2>
            <p className="text-slate-400 mb-6 text-sm">
              The application encountered a critical error and could not render.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl text-left text-xs font-mono text-red-300 overflow-auto max-h-40 mb-6 border border-slate-900">
              {this.state.error?.toString() || "Unknown Error"}
            </div>
            <button 
              onClick={() => {
                localStorage.clear(); // Safe clear to recover from bad state
                window.location.reload();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              Reset & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Environment Safety Check ---
if (window.location.protocol === 'file:') {
  console.warn("Running via file:// protocol. Some features (Maps, APIs) may be restricted.");
}

// --- Application Mount ---
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. Application cannot mount.");
}