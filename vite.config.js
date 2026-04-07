import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 1000,
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/setupTests.js'],
        globals: true,
    }
});
