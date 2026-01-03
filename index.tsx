
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Fix for typo in service worker registration (original line 71)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.worker.register corrected to navigator.serviceWorker.register
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registered'))
      .catch(err => console.log('SW failed', err));
  });
}

/**
 * Dynamically injects the global styles, fonts, and scripts that were 
 * previously in the HTML template to avoid "HTML-in-TSX" syntax errors.
 */
const initializeEnvironment = () => {
  if (typeof document === 'undefined') return;

  // Set document metadata - CHANGED TO ENGLISH/LTR
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";

  // Inject Meta Viewport if missing
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement('meta');
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    document.head.appendChild(meta);
  }

  // Inject external dependencies
  const assets = [
    { tag: 'link', rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' },
    { tag: 'link', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap' },
    { tag: 'link', rel: 'stylesheet', href: '/index.css' },
    { tag: 'script', src: 'https://cdn.tailwindcss.com' },
    { tag: 'script', src: 'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js' } // Added proj4 for UTM conversion
  ];

  assets.forEach(asset => {
    const selector = asset.tag === 'link' ? `link[href="${asset.href}"]` : `script[src="${asset.src}"]`;
    if (!document.querySelector(selector)) {
      const el = document.createElement(asset.tag);
      Object.entries(asset).forEach(([key, value]) => {
        if (key !== 'tag') (el as any)[key] = value;
      });
      document.head.appendChild(el);
    }
  });

  // Check for local file protocol warning (original line 67)
  if (window.location.protocol === 'file:') {
    const warning = document.createElement('div');
    warning.id = 'file-warning';
    warning.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: #f59e0b; color: white; text-align: center; padding: 12px; z-index: 9999; font-weight: bold; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);";
    warning.innerHTML = '<i class="fas fa-exclamation-triangle ml-2"></i> Warning: Local file protocol detected. Map and AI features may be limited. Please use a local server.';
    document.body.prepend(warning);
  }
};

// Initialize the environment before mounting
initializeEnvironment();

// Ensure the root container exists
let rootContainer = document.getElementById('root');
if (!rootContainer) {
  rootContainer = document.createElement('div');
  rootContainer.id = 'root';
  document.body.appendChild(rootContainer);
}

// Mount the React application to the root container
const root = createRoot(rootContainer);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
