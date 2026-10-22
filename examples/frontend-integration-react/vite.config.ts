// SPDX-License-Identifier: MIT
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // stellar-sdk and freighter-api include Node built-ins that must be polyfilled
  // when bundling for the browser.
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Required polyfills for @stellar/stellar-sdk in browser environments
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['@stellar/stellar-sdk', '@stellar/freighter-api', 'buffer'],
  },
});
