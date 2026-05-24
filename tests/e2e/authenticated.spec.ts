import { expect, test } from "@playwright/test";

const hostedAppUrl = "https://ziomus1357.github.io/HairSalonBookingFrontend/";
const apiBaseUrl = "https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net";

test.use({
  storageState: "playwright/.auth/user.json"
});

test("zalogowany uzytkownik zachowuje sesje po odswiezeniu", async ({ page }) => {
  await page.goto(hostedAppUrl);

  await expect(page.getByText(/Wyloguj|klient|fryzjer|admin/i).first()).toBeVisible();

  await page.reload();

  await expect(page.getByText(/Wyloguj|klient|fryzjer|admin/i).first()).toBeVisible();
});

test("zalogowana sesja pozwala pobrac aktualnego uzytkownika z API", async ({ page }) => {
  await page.goto(hostedAppUrl);

  const response = await page.evaluate(async (url) => {
    const result = await fetch(`${url}/api/Auth/me`, {
      credentials: "include"
    });

    return {
      ok: result.ok,
      status: result.status,
      body: await result.text()
    };
  }, apiBaseUrl);

  expect(response.status, response.body).toBe(200);
  expect(response.ok).toBe(true);
});
