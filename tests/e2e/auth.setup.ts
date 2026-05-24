import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const hostedAppUrl = "https://ziomus1357.github.io/HairSalonBookingFrontend/";
const authStatePath = "playwright/.auth/user.json";

test("zapisuje sesje zalogowanego uzytkownika", async ({ page }) => {
  await page.goto(hostedAppUrl);

  await page.pause();

  await expect(page.getByText(/Wyloguj|klient|fryzjer|admin/i).first()).toBeVisible();

  mkdirSync("playwright/.auth", { recursive: true });
  await page.context().storageState({ path: authStatePath });
});
