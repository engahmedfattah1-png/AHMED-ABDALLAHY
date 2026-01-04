import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './',
    define: {
      // Robust definition for process.env to avoid "process is not defined" crashes
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': JSON.stringify({}) // Safe empty object fallback
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    },
    server: {
      host: true,
      port: 5173
    }
  };
});