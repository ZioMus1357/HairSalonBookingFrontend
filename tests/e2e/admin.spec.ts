import { expect, test } from "@playwright/test";

const hostedAppUrl = "https://ziomus1357.github.io/HairSalonBookingFrontend/";
const apiBaseUrl = "https://booking-api-fdgxg9cbc6chbqc8.francecentral-01.azurewebsites.net";

type SalonService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isAvailable: boolean;
};

type Hairdresser = {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  isActive: boolean;
};

type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  customerId?: string | null;
  hairdresserId?: string | null;
};

type Review = {
  id: string;
  rating: number;
  content?: string | null;
  isVisible: boolean;
};

test.use({
  storageState: "playwright/.auth/admin.json"
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

test("admin ma dostep do dashboardu i statystyk", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin`);

  await expect(page.getByText("Centrum zarządzania").first()).toBeVisible();
  await expect(page.getByText("Klienci").first()).toBeVisible();
  await expect(page.getByText("Fryzjerzy").first()).toBeVisible();
  await expect(page.getByText("Usługi").first()).toBeVisible();
  await expect(page.getByText("Wizyty").first()).toBeVisible();
});

test("admin widzi zarzadzanie uzytkownikami i rolami", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/users`);

  await expect(page.getByText("Użytkownicy i role").first()).toBeVisible();
  await expect(page.getByText("Rola").first()).toBeVisible();
  await expect(page.getByText(/Edytuj|Użytkownik/i).first()).toBeVisible();
});

test("admin widzi glowne ekrany zarzadzania danymi", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/customers`);
  await expect(page.getByText("Klienci").first()).toBeVisible();
  await expect(page.getByText(/Dodaj klienta|Edytuj klienta/i).first()).toBeVisible();

  await page.goto(`${hostedAppUrl}admin/hairdressers`);
  await expect(page.getByText("Zespół fryzjerów").first()).toBeVisible();
  await expect(page.getByText(/Dodaj fryzjera|Edytuj fryzjera/i).first()).toBeVisible();

  await page.goto(`${hostedAppUrl}admin/services`);
  await expect(page.getByText("Usługi salonu").first()).toBeVisible();
  await expect(page.getByText(/Dodaj usługę|Edytuj usługę/i).first()).toBeVisible();
});

test("admin widzi wizyty, galerie i moderacje opinii", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/appointments`);
  await expect(page.getByText("Wszystkie wizyty").first()).toBeVisible();

  await page.goto(`${hostedAppUrl}admin/gallery`);
  await expect(page.getByText(/Galeria|Zdjęcie do edycji|Dodaj zdjęcie/i).first()).toBeVisible();

  await page.goto(`${hostedAppUrl}admin/reviews`);
  await expect(page.getByText("Moderacja opinii").first()).toBeVisible();
  await expect(page.getByText(/Widocznosc|Ocena|Sortowanie/i).first()).toBeVisible();
});

test("sesja administratora pozwala pobrac aktualnego uzytkownika z API", async ({ page }) => {
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
  expect(response.body).toContain("Admin");
});

test("admin moze utworzyc, edytowac i usunac usluge testowa", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/services`);
  await expect(page.getByText("Usługi salonu").first()).toBeVisible();

  const unique = Date.now();
  const created = await api<SalonService>(page, "/api/SalonServices", {
    method: "POST",
    body: JSON.stringify({
      name: `E2E usluga ${unique}`,
      description: "Tymczasowa usluga utworzona przez automatyczny test admina.",
      durationMinutes: 30,
      price: 123,
      isAvailable: true
    })
  });

  try {
    const updated = await api<SalonService>(page, `/api/SalonServices/${created.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: `${created.name} edycja`,
        description: "Tymczasowa usluga po edycji w tescie.",
        durationMinutes: 45,
        price: 150,
        isAvailable: false
      })
    });

    expect(updated.name).toContain("edycja");
    expect(updated.durationMinutes).toBe(45);
    expect(updated.isAvailable).toBe(false);
  } finally {
    await api<null>(page, `/api/SalonServices/${created.id}`, { method: "DELETE" });
  }
});

test("admin moze utworzyc, edytowac i usunac profil fryzjera testowego", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/hairdressers`);
  await expect(page.getByText("Zespół fryzjerów").first()).toBeVisible();

  const unique = Date.now();
  const created = await api<Hairdresser>(page, "/api/Hairdressers", {
    method: "POST",
    body: JSON.stringify({
      firstName: "E2E",
      lastName: `Fryzjer${unique}`,
      specialization: "Testy automatyczne",
      isActive: true
    })
  });

  try {
    const updated = await api<Hairdresser>(page, `/api/Hairdressers/${created.id}`, {
      method: "PUT",
      body: JSON.stringify({
        firstName: "E2E",
        lastName: `Fryzjer${unique}`,
        specialization: "Testy po edycji",
        isActive: false
      })
    });

    expect(updated.specialization).toBe("Testy po edycji");
    expect(updated.isActive).toBe(false);
  } finally {
    await api<null>(page, `/api/Hairdressers/${created.id}`, { method: "DELETE" });
  }
});

test("admin moze pobrac uzytkownikow z rolami i powiazaniami", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/users`);
  await expect(page.getByText("Użytkownicy i role").first()).toBeVisible();

  const users = await api<AppUser[]>(page, "/api/Admin/users");

  expect(users.length).toBeGreaterThan(0);
  expect(users.some((user) => user.role === "Admin")).toBe(true);
  expect(users.every((user) => ["Customer", "Hairdresser", "Admin"].includes(user.role))).toBe(true);
});

test("admin moze moderowac opinie bez utraty pierwotnego stanu", async ({ page }) => {
  await page.goto(`${hostedAppUrl}admin/reviews`);
  await expect(page.getByText("Moderacja opinii").first()).toBeVisible();

  const reviews = await api<Review[]>(page, "/api/Admin/reviews");
  test.skip(reviews.length === 0, "Brak opinii w chmurze do sprawdzenia moderacji.");

  const review = reviews[0];
  const action = review.isVisible ? "hide" : "show";
  const restore = review.isVisible ? "show" : "hide";

  try {
    await api<Review>(page, `/api/Reviews/${review.id}/${action}`, { method: "PATCH" });
    const changed = await api<Review[]>(page, "/api/Admin/reviews");
    expect(changed.find((item) => item.id === review.id)?.isVisible).toBe(!review.isVisible);
  } finally {
    await api<Review>(page, `/api/Reviews/${review.id}/${restore}`, { method: "PATCH" });
  }
});
