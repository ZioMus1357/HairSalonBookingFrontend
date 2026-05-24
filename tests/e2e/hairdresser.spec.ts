import { expect, test } from "@playwright/test";

const hostedAppUrl = "https://ziomus1357.github.io/HairSalonBookingFrontend/";
const apiBaseUrl = "https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net";

type Appointment = {
  id: string;
  customerId: string;
  hairdresserId: string;
  salonServiceId: string;
  startAt: string;
  status: "Booked" | "Confirmed" | "Completed" | "Cancelled";
  notes?: string | null;
};

type HairdresserHistory = {
  customer?: unknown;
  previousAppointments?: Appointment[] | null;
  upcomingAppointments?: Appointment[] | null;
  usedServiceIds?: string[] | null;
};

type AuthMe = {
  user?: {
    role: string;
    hairdresserId?: string | null;
  } | null;
};

test.use({
  storageState: "playwright/.auth/hairdresser.json"
});

async function api<T>(page: import("@playwright/test").Page, path: string, init?: RequestInit) {
  return page.evaluate(
    async ({ url, path, init }) => {
      const result = await fetch(`${url}${path}`, {
        credentials: "include",
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          ...(init?.body ? { "Content-Type": "application/json" } : {})
        }
      });

      const text = await result.text();
      if (!result.ok) {
        throw new Error(`${path} returned ${result.status}: ${text}`);
      }

      return text ? JSON.parse(text) : null;
    },
    { url: apiBaseUrl, path, init }
  ) as Promise<T>;
}

test("fryzjer ma dostep do panelu i metryk pracy", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/dashboard`);

  await expect(page.getByText("Panel fryzjera").first()).toBeVisible();
  await expect(page.getByText("Wykonane usługi").first()).toBeVisible();
  await expect(page.getByText("Zaplanowane wizyty").first()).toBeVisible();
  await expect(page.getByText("Wizyty dzisiaj").first()).toBeVisible();
});

test("fryzjer widzi liste wizyt z filtrami", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/appointments`);

  await expect(page.getByText("Wizyty fryzjera").first()).toBeVisible();
  await expect(page.getByText("Status").first()).toBeVisible();
  await expect(page.getByText("Klient").first()).toBeVisible();
  await expect(page.getByText(/Od daty|Do daty/i).first()).toBeVisible();
});

test("fryzjer widzi historie klientow", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/customers`);

  await expect(page.getByText("Historia klientów").first()).toBeVisible();
  await expect(page.getByText(/Wizyty|Zakończone|Zaplanowane|Brak danych/i).first()).toBeVisible();
});

test("fryzjer widzi swoj profil tylko do podgladu", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/profile`);

  await expect(page.getByText("Profil fryzjera").first()).toBeVisible();
  await expect(page.getByText(/Dane profilu|Brak profilu fryzjera/i).first()).toBeVisible();
  await expect(page.getByText(/administrator/i).first()).toBeVisible();
});

test("sesja fryzjera pozwala pobrac aktualnego uzytkownika z API", async ({ page }) => {
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
  expect(response.body).toContain("Hairdresser");
});

test("fryzjer moze pobrac swoje wizyty z chmury", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/appointments`);
  await expect(page.getByText("Wizyty fryzjera").first()).toBeVisible();

  const appointments = await api<Appointment[]>(page, "/api/Hairdressers/me/appointments");

  expect(Array.isArray(appointments)).toBe(true);
  expect(appointments.every((appointment) => Boolean(appointment.id))).toBe(true);
});

test("fryzjer moze pobrac historie klienta powiazanego z jego wizyta", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/customers`);
  await expect(page.getByText("Historia klientów").first()).toBeVisible();

  const appointments = await api<Appointment[]>(page, "/api/Hairdressers/me/appointments");
  const customerId = appointments.find((appointment) => appointment.customerId)?.customerId;
  test.skip(!customerId, "Brak klienta powiazanego z wizytami fryzjera.");

  const history = await api<HairdresserHistory>(page, `/api/Hairdressers/me/customers/${customerId}/history`);

  expect(history).toBeTruthy();
  expect(Array.isArray(history.previousAppointments ?? [])).toBe(true);
  expect(Array.isArray(history.upcomingAppointments ?? [])).toBe(true);
});

test("fryzjer moze sprawdzic dostepnosc swojego profilu", async ({ page }) => {
  await page.goto(`${hostedAppUrl}hairdresser/profile`);

  const me = await api<AuthMe>(page, "/api/Auth/me");
  const hairdresserId = me.user?.hairdresserId;
  expect(me.user?.role).toBe("Hairdresser");
  expect(hairdresserId).toBeTruthy();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);
  const slots = await api<string[]>(page, `/api/Hairdressers/${hairdresserId}/availability/${date}`);

  expect(Array.isArray(slots)).toBe(true);
});
