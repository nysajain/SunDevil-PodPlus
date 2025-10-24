import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite configuration for the SunDevil Pods+ prototype. This file
// configures the React plugin and sets up a simple alias for
// resolving imports from the src directory. In a future phase
// (e.g. phase‑2) this file could be extended to include proxy
// definitions or server options.
export default defineConfig({
  plugins: [react()],
  // Ensure correct base path for Vercel deployments
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
