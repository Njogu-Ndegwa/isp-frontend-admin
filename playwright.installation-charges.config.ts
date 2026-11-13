import { defineConfig } from '@playwright/test';

// Build first with NEXT_PUBLIC_TECHMID_INSTALLATION_CHARGES_ENABLED=true and
// NEXT_PUBLIC_API_BASE_URL=http://localhost:3197/api (match E2E_PORT if changed).
// Test the production build: the Next dev toolbar covers mobile navigation.
// Dedicated local server: never reuse another worktree or a live backend.
const port = Number(process.env.E2E_PORT || 3197);
export default defineConfig({
  testDir: './e2e', testMatch: 'installation-charges.spec.ts', timeout: 60_000,
  workers: 1, reporter: 'list', use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run start -- -p ${port}`, url: `http://localhost:${port}`,
    reuseExistingServer: false, timeout: 120_000,
    env: { NEXT_PUBLIC_TECHMID_INSTALLATION_CHARGES_ENABLED: 'true', NEXT_PUBLIC_API_BASE_URL: `http://localhost:${port}/api` },
  },
});
