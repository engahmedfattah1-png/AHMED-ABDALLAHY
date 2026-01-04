import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using (process as any) to avoid type errors if @types/node is missing
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // Ensures relative paths for assets (important for deployment/Capacitor)
    define: {
      // Robust polyfill for process.env to avoid "process is not defined" errors in browser
      'process.env': JSON.stringify({
        API_KEY: env.API_KEY || '',
        NODE_ENV: mode
      }),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
    server: {
      host: true, // Listen on all addresses
      port: 5173
    }
  };
});