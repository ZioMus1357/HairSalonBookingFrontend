import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /(auth|auth-admin|auth-hairdresser)\.setup\.ts|authenticated\.spec\.ts|customer\.spec\.ts|admin\.spec\.ts|hairdresser\.spec\.ts/,
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome"
      }
    }
  ]
});
