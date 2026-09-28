import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const userId = process.env.E2E_USER_ID;

if (!userId) {
  throw new Error("E2E_USER_ID must be set to the UUID of an existing user");
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/e2e/**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    // Mesma assunção do RoomE2ETest: o backend, no perfil de teste, lê o usuário do header X-User-Id
    extraHTTPHeaders: { "X-User-Id": userId },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
