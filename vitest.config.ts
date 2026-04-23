import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000/api',
      NEXT_PUBLIC_COMPANY_SLUG: 'wire-and-bead',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      include: ['src/lib/**/*.ts', 'src/contexts/**/*.tsx', 'src/components/**/*.tsx'],
      exclude: ['**/*.test.*', 'src/test/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
