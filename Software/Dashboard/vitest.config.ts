import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react() as any],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/software/__tests__/setup.ts'],
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@docs': path.resolve(__dirname, '../../Management/Docs/'),
        },
    },
});
