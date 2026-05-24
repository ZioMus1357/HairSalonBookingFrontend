import { expect, test } from "@playwright/test";

test("gosc widzi publiczna oferte uslug", async ({ page }) => {
  await page.goto("/");

  await page.getByText("Usługi", { exact: true }).first().click();

  await expect(page.getByText(/Rytuały dopasowane/i)).toBeVisible();
  await expect(page.getByText("Sortowanie", { exact: true })).toBeVisible();
  await expect(page.getByText("Tylko dostępne", { exact: true })).toBeVisible();
});

test("gosc po probie rezerwacji trafia do logowania", async ({ page }) => {
  await page.goto("/");

  await page.getByText("Umów wizytę", { exact: true }).first().click();

  await expect(page.getByText(/Nie masz uprawnień/i)).toBeVisible();
  await page.getByText("Przejdź do logowania", { exact: true }).click();

  await expect(page.getByText("Logowanie", { exact: true })).toBeVisible();
  await expect(page.getByText("Google", { exact: true })).toBeVisible();
  await expect(page.getByText("GitHub", { exact: true })).toBeVisible();
});
