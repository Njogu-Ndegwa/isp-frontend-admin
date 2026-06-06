import { defineConfig } from '@playwright/test';

// Defaults to the standard dev port; override with E2E_PORT to reuse an
// already-running dev server (e.g. E2E_PORT=3100).
const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 3000;
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: BASE },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
