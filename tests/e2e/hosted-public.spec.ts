import { expect, test } from "@playwright/test";

test("gosc moze przejsc przez publiczne widoki hostowanej aplikacji", async ({ page }) => {
  await page.goto("https://ziomus1357.github.io/HairSalonBookingFrontend/");

  await page.getByText("Usługi").first().click();
  await expect(page.getByText(/Rytuały dopasowane|Usługi/i).first()).toBeVisible();

  await page.getByText("Fryzjerzy").first().click();
  await expect(page.getByText("Fryzjerzy").first()).toBeVisible();

  await page.getByText("Galeria").first().click();
  await expect(page.getByText(/Efekty, detale i atmosfera|Galeria/i).first()).toBeVisible();

  await page.getByText("Opinie").first().click();
  await expect(page.getByText(/Doświadczenia klientów|Opinie/i).first()).toBeVisible();

  await page.getByText("Kontakt").first().click();
  await expect(page.getByText("Maison Noir Studio").first()).toBeVisible();

  await page.getByText("Home").first().click();
  await page.getByText("Umów wizytę", { exact: true }).first().click();
  await expect(page.getByText(/Nie masz uprawnień|Logowanie/i).first()).toBeVisible();
});
