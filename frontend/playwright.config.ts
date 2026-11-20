import { defineConfig, devices } from "@playwright/test";

// E2E_SLOWMO: milisegundos de pausa entre acciones, para ver los tests en el navegador
// (p. ej. `make e2e E2E_FLAGS=--headed E2E_SLOWMO=500`). Con pausa se amplía el timeout.
const slowMo = Number(process.env.E2E_SLOWMO) || 0;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: slowMo > 0 ? 180_000 : 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: { slowMo },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
