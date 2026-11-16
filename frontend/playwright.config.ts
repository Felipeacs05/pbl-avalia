import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.e2e")) {
  process.loadEnvFile(".env.e2e");
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const backendURL = process.env.BACKEND_URL ?? "http://localhost:8081";
const userId = process.env.E2E_USER_ID;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/e2e/**/*.spec.ts",
  globalSetup: "./tests/global-setup.e2e.ts",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    // Mesma assunção do RoomE2ETest: o backend, no perfil de teste, lê o usuário do header X-User-Id
    extraHTTPHeaders: userId ? { "X-User-Id": userId } : undefined,
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${new URL(baseURL).port || "3001"}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_USE_MOCKS: "false",
      // O axios (api.ts) usa esta base; relativa, passa pelo rewrite /api/* -> BACKEND_URL como o fetch,
      // em vez de ir ao padrão http://localhost:8080 (fora do backend do e2e). Necessário para a US22.
      NEXT_PUBLIC_API_URL: "/api/v1",
      NEXT_DIST_DIR: ".next-e2e",
      BACKEND_URL: backendURL,
    },
  },
});
