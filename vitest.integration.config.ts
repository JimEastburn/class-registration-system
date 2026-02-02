import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node', // Actions are server-side
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['src/__tests__/integration/**/*.test.ts'],
        testTimeout: 30000, // Integration tests can be slow
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
