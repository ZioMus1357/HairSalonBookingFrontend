import { expect, test } from "@playwright/test";

const hostedAppUrl = "https://ziomus1357.github.io/HairSalonBookingFrontend/";
const apiBaseUrl = "https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  isAvailable: boolean;
};

type Hairdresser = {
  id: string;
  isActive: boolean;
};

test.use({
  storageState: "playwright/.auth/user.json"
});

test("klient ma dostep do swojego profilu", async ({ page }) => {
  await page.goto(`${hostedAppUrl}profile`);

  await expect(page.getByText(/Profil klienta|Uzupełnij dane do rezerwacji/i).first()).toBeVisible();
  await expect(page.getByText("Imie").first()).toBeVisible();
  await expect(page.getByText("Nazwisko").first()).toBeVisible();
  await expect(page.getByText("Telefon").first()).toBeVisible();
  await expect(page.getByText("Email").first()).toBeVisible();
});

test("klient moze otworzyc historie swoich wizyt", async ({ page }) => {
  await page.goto(`${hostedAppUrl}my-visits`);

  await expect(page.getByText("Moje wizyty").first()).toBeVisible();
  await expect(page.getByText(/Wizyty|Termin|Brak danych|Brak wizyt/i).first()).toBeVisible();
});

test("klient moze wejsc do procesu rezerwacji", async ({ page }) => {
  await page.goto(`${hostedAppUrl}booking`);

  await expect(page.getByText("Umów wizytę").first()).toBeVisible();
  await expect(page.getByText("Krok 1").first()).toBeVisible();
  await expect(page.getByText("SORTOWANIE USŁUG").first()).toBeVisible();
  await expect(page.getByText(/Cena rosnąco|Cena malejąco|Czas trwania/i).first()).toBeVisible();
});

test("sesja klienta pozwala pobrac profil klienta z API", async ({ page }) => {
  await page.goto(hostedAppUrl);

  const response = await page.evaluate(async (url) => {
    const result = await fetch(`${url}/api/Customers/me`, {
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

test("klient moze zrobic rezerwacje na dostepny termin", async ({ page }) => {
  await page.goto(hostedAppUrl);

  const bookingData = await page.evaluate(async (url) => {
    const getJson = async <T,>(path: string): Promise<T> => {
      const result = await fetch(`${url}${path}`, { credentials: "include" });
      if (!result.ok) {
        throw new Error(`${path} returned ${result.status}: ${await result.text()}`);
      }
      return result.json() as Promise<T>;
    };

    const services = (await getJson<Service[]>("/api/SalonServices"))
      .filter((service) => service.isAvailable)
      .sort((a, b) => a.durationMinutes - b.durationMinutes);
    const hairdressers = (await getJson<Hairdresser[]>("/api/Hairdressers"))
      .filter((hairdresser) => hairdresser.isActive);

    const day = (offset: number) => {
      const value = new Date();
      value.setDate(value.getDate() + offset);
      return value.toISOString().slice(0, 10);
    };

    const fitsSalonHours = (slot: string, durationMinutes: number) => {
      const start = new Date(slot);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      return start.getHours() >= 9 && end.getHours() <= 17 && (end.getHours() < 17 || end.getMinutes() === 0);
    };

    for (const service of services) {
      for (const hairdresser of hairdressers) {
        for (let offset = 1; offset <= 21; offset += 1) {
          const date = day(offset);
          const slots = await getJson<string[]>(`/api/Hairdressers/${hairdresser.id}/availability/${date}`);
          const slot = slots.find((item) => fitsSalonHours(item, service.durationMinutes));
          if (slot) {
            return {
              serviceId: service.id,
              serviceName: service.name,
              hairdresserId: hairdresser.id,
              slot
            };
          }
        }
      }
    }

    throw new Error("Nie znaleziono dostepnego terminu do testu rezerwacji.");
  }, apiBaseUrl);

  const query = new URLSearchParams({
    serviceId: bookingData.serviceId,
    hairdresserId: bookingData.hairdresserId,
    startAt: bookingData.slot
  });

  await page.goto(`${hostedAppUrl}booking?${query.toString()}`);
  await page.getByText("Krok 5").first().click();
  await expect(page.getByText("Podsumowanie").first()).toBeVisible();
  await expect(page.getByText(bookingData.serviceName).first()).toBeVisible();

  await page.getByText("Potwierdź rezerwację").first().click();

  await expect(page.getByText(/Wizyta została zarezerwowana|Moje wizyty/i).first()).toBeVisible();
});
