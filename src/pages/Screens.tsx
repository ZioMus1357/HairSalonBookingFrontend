import * as DocumentPicker from "expo-document-picker";
import { CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, Edit3, Image as ImageIcon, Plus, RefreshCcw, Scissors, Trash2, Upload, UserRound, UsersRound } from "lucide-react-native";
import { createElement, useEffect, useMemo, useState } from "react";
import { Alert, Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { adminApi, appointmentsApi, authApi, AUTH_BASE_URL, customersApi, galleryApi, hairdressersApi, notificationsApi, reviewsApi, servicesApi } from "../api";
import { nativeGoogleIdToken } from "../api/nativeGoogleSignIn";
import { Button, Card, Chip, DataTable, Field, PageHeader, SelectRail, StateView } from "../components/Primitives";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsyncData } from "../hooks/useAsyncData";
import { useRouter } from "../router/RouterContext";
import { colors, images, radii, shadow } from "../theme/tokens";
import { AppUser, Appointment, AppointmentRequest, AppointmentStatus, CreateAppointmentRequest, Customer, CustomerRequest, Hairdresser, HairdresserCustomerHistory, HairdresserRequest, Review, ReviewRequest, SalonPhoto, SalonService, SalonServiceRequest, UserRole } from "../types/domain";
import { addDays, appointmentLabel, dateOnly, fullName, getErrorMessage, money, roleLabel, toLocalDateTime } from "../utils/format";

const fallbackGallery = [
  { title: "Soft blonde layers", image: images.hairOne },
  { title: "Gloss color", image: images.hairTwo },
  { title: "Barber fade", image: images.barber }
];

const appointmentStatuses: AppointmentStatus[] = ["Booked", "Confirmed", "Completed", "Cancelled"];
const salonOpenMinutes = 9 * 60;
const salonCloseMinutes = 17 * 60;
const slotFitsSalonHours = (value: string, durationMinutes = 0) => {
  const start = new Date(value);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return start.toDateString() === end.toDateString() && startMinutes >= salonOpenMinutes && endMinutes <= salonCloseMinutes;
};
const customerLabel = (customerId?: string | null, customers: Customer[] = []) => {
  const customer = customers.find((item) => item.id === customerId);
  return customer ? fullName(customer) : "Klient";
};
const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  Booked: "Nowa",
  Confirmed: "Potwierdzona",
  Completed: "Zakończona",
  Cancelled: "Anulowana"
};

export function HomePage() {
  const { navigate } = useRouter();
  const services = useAsyncData(() => servicesApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const photos = useAsyncData(() => galleryApi.all(), []);
  const reviews = useAsyncData(() => reviewsApi.public(), []);

  return (
    <>
      <ImageBackground source={{ uri: images.hero }} style={screenStyles.hero} imageStyle={screenStyles.heroImage}>
        <LinearGradient colors={["rgba(0,0,0,0.74)", "rgba(0,0,0,0.32)", "rgba(0,0,0,0.78)"]} style={screenStyles.heroOverlay}>
          <Text style={screenStyles.heroKicker}>Luxury hair studio · Warszawa</Text>
          <Text style={screenStyles.heroTitle}>Maison Noir</Text>
          <Text style={screenStyles.heroText}>Premium beauty booking dla salonu, który łączy spokojny rytuał, precyzyjne cięcie i nowoczesną obsługę wizyt.</Text>
          <View style={screenStyles.actions}>
            <Button label="Umów wizytę" icon={<CalendarDays size={18} color={colors.ink} />} onPress={() => navigate("/booking")} />
            <Button label="Zobacz usługi" variant="light" onPress={() => navigate("/services")} />
          </View>
        </LinearGradient>
      </ImageBackground>
      <StatsStrip />
      <SectionTitle title="Wyróżniki salonu" subtitle="Cicha elegancja, transparentne ceny i pełny booking online." />
      <View style={screenStyles.grid}>
        {["Konsultacja przed usługą", "Powiadomienia o rezerwacji", "Historia wizyt klienta"].map((item) => (
          <Card key={item}><Text style={screenStyles.cardTitle}>{item}</Text><Text style={screenStyles.muted}>Doświadczenie premium bez chaosu i telefonów.</Text></Card>
        ))}
      </View>
      <PreviewBlock title="Usługi" onPress={() => navigate("/services")}>
        <ServiceGrid services={(services.data ?? []).slice(0, 3)} loading={services.loading} error={services.error} onBook={(id) => navigate(`/booking?serviceId=${id}`)} />
      </PreviewBlock>
      <PreviewBlock title="Zespół" onPress={() => navigate("/hairdressers")}>
        <HairdresserGrid hairdressers={(hairdressers.data ?? []).slice(0, 3)} loading={hairdressers.loading} error={hairdressers.error} onProfile={(id) => navigate(`/hairdressers/${id}`)} onBook={(id) => navigate(`/booking?hairdresserId=${id}`)} />
      </PreviewBlock>
      <PreviewBlock title="Galeria" onPress={() => navigate("/gallery")}>
        <GalleryGrid photos={(photos.data ?? []).slice(0, 6)} />
      </PreviewBlock>
      <PreviewBlock title="Opinie" onPress={() => navigate("/reviews")}>
        <ReviewsGrid reviews={(reviews.data ?? []).slice(0, 3)} loading={reviews.loading} error={reviews.error} />
      </PreviewBlock>
    </>
  );
}

export function ServicesPage() {
  const { navigate } = useRouter();
  const [sort, setSort] = useState("recommended");
  const [availableOnly, setAvailableOnly] = useState(false);
  const data = useAsyncData(() => servicesApi.all(), []);
  const services = useMemo(() => {
    const rows = [...(data.data ?? [])].filter((item) => !availableOnly || item.isAvailable);
    if (sort === "priceAsc") rows.sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") rows.sort((a, b) => b.price - a.price);
    if (sort === "duration") rows.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return rows;
  }, [availableOnly, data.data, sort]);

  return (
    <>
      <PageHeader kicker="Usługi" title="Rytuały dopasowane do Twojego stylu" subtitle="Od precyzyjnego cięcia po koloryzację z połyskiem. Wybierz usługę, porównaj czas i cenę, a potem zarezerwuj termin u wybranego stylisty." image={images.hairTwo} />
      <View style={screenStyles.filters}>
        <SelectRail label="Sortowanie" value={sort} options={[{ label: "Polecane", value: "recommended" }, { label: "Cena rosnąco", value: "priceAsc" }, { label: "Cena malejąco", value: "priceDesc" }, { label: "Czas trwania", value: "duration" }]} onChange={setSort} />
        <Chip label="Tylko dostępne" active={availableOnly} onPress={() => setAvailableOnly((value) => !value)} />
      </View>
      <ServiceGrid services={services} loading={data.loading} error={data.error} onBook={(id) => navigate(`/booking?serviceId=${id}`)} />
    </>
  );
}

export function HairdressersPage() {
  const { navigate } = useRouter();
  const data = useAsyncData(() => hairdressersApi.all(), []);
  return (
    <>
      <PageHeader kicker="Zespół" title="Fryzjerzy" subtitle="Poznaj stylistów Maison Noir, sprawdź ich specjalizacje i wybierz osobę, u której chcesz umówić wizytę." image={images.stylist} />
      <HairdresserGrid hairdressers={data.data ?? []} loading={data.loading} error={data.error} onProfile={(id) => navigate(`/hairdressers/${id}`)} onBook={(id) => navigate(`/booking?hairdresserId=${id}`)} />
    </>
  );
}

export function HairdresserDetailsPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const [day, setDay] = useState(dateOnly());
  const hairdresser = useAsyncData(() => hairdressersApi.byId(id), [id]);
  const slots = useAsyncData(() => hairdressersApi.availability(id, day), [id, day]);
  const dayOptions = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(n));
  return (
    <>
      <PageHeader kicker="Profil fryzjera" title={hairdresser.data ? fullName(hairdresser.data) : "Fryzjer"} subtitle={hairdresser.data?.specialization ?? "Dostępność i szczegóły stylisty."} image={hairdresser.data?.photoUrl ?? images.stylist} />
      <View style={screenStyles.profileStack}>
        <View style={screenStyles.detailPanel}>
          <Card>
            <Text style={screenStyles.cardTitle}>Dostępność</Text>
            <AvailabilityDays days={dayOptions} value={day} onChange={setDay} />
            <StateView loading={slots.loading} error={slots.error} empty={(slots.data ?? []).length === 0}>
              <AvailabilitySlots slots={slots.data ?? []} onSelect={(slot) => navigate(`/booking?hairdresserId=${id}&startAt=${encodeURIComponent(slot)}`)} />
            </StateView>
          </Card>
        </View>
        <View style={screenStyles.detailPanel}>
          <Card>
            <Text style={screenStyles.cardTitle}>Profil</Text>
            <Text style={screenStyles.muted}>{hairdresser.data?.isActive ? "Aktywny członek zespołu" : "Aktualnie nieaktywny"}</Text>
            <Button label="Umów wizytę u tego fryzjera" onPress={() => navigate(`/booking?hairdresserId=${id}`)} />
          </Card>
        </View>
      </View>
    </>
  );
}

function AvailabilityDays({ days, value, onChange }: { days: string[]; value: string; onChange: (value: string) => void }) {
  const index = Math.max(0, days.indexOf(value));
  const current = days[index] ?? value;
  const date = new Date(`${current}T12:00:00`);
  const canGoBack = index > 0;
  const canGoNext = index < days.length - 1;
  const move = (direction: -1 | 1) => {
    const next = days[index + direction];
    if (next) onChange(next);
  };

  return (
    <View style={screenStyles.availabilityBlock}>
      <Text style={screenStyles.compactLabel}>Dzień</Text>
      <View style={screenStyles.dayStepper}>
        <Pressable disabled={!canGoBack} onPress={() => move(-1)} style={[screenStyles.stepButton, !canGoBack && screenStyles.stepButtonDisabled]}>
          <ChevronLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={screenStyles.dayCurrent}>
          <Text style={screenStyles.dayName}>{date.toLocaleDateString("pl-PL", { weekday: "long" })}</Text>
          <Text style={screenStyles.dayNumber}>{date.toLocaleDateString("pl-PL", { day: "2-digit", month: "long" })}</Text>
        </View>
        <Pressable disabled={!canGoNext} onPress={() => move(1)} style={[screenStyles.stepButton, !canGoNext && screenStyles.stepButtonDisabled]}>
          <ChevronRight size={18} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

function AvailabilitySlots({ slots, onSelect }: { slots: string[]; onSelect: (slot: string) => void }) {
  return (
    <View style={screenStyles.availabilityBlock}>
      <View style={screenStyles.availabilityHead}>
        <Text style={screenStyles.compactLabel}>Wolne godziny</Text>
        <Text style={screenStyles.slotCount}>{slots.length} terminów</Text>
      </View>
      <ScrollView style={screenStyles.hourScroll} contentContainerStyle={screenStyles.hourGrid} nestedScrollEnabled showsVerticalScrollIndicator>
        {slots.map((slot) => (
          <Pressable key={slot} onPress={() => onSelect(slot)} style={screenStyles.hourPill}>
            <Text style={screenStyles.hourText}>{new Date(slot).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function GalleryPage() {
  const data = useAsyncData(() => galleryApi.all(), []);
  return (
    <>
      <PageHeader kicker="Galeria" title="Efekty, detale i atmosfera Maison Noir" subtitle="Zobacz wybrane metamorfozy, tekstury włosów i wnętrze salonu. To krótki podgląd estetyki, z którą pracujemy każdego dnia." image={images.salon} />
      <StateView loading={data.loading} error={data.error} empty={false}>
        <GalleryGrid photos={data.data ?? []} />
      </StateView>
    </>
  );
}

export function ReviewsPage() {
  const data = useAsyncData(() => reviewsApi.public(), []);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const reviews = useMemo(() => {
    const rows = [...(data.data ?? [])].filter((item) => ratingFilter === "all" || item.rating === Number(ratingFilter));
    rows.sort((a, b) => {
      if (sort === "highest") return b.rating - a.rating;
      if (sort === "lowest") return a.rating - b.rating;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [data.data, ratingFilter, sort]);
  return (
    <>
      <PageHeader kicker="Opinie" title="Doświadczenia klientów" subtitle="Publiczne recenzje wizyt w Maison Noir. Pokazujemy wyłącznie opinie oznaczone jako widoczne." image={images.hairOne} />
      <Card>
        <SelectRail label="Ocena" value={ratingFilter} options={[{ label: "Wszystkie", value: "all" }, ...[5, 4, 3, 2, 1].map((value) => ({ label: stars(value), value: String(value) }))]} onChange={setRatingFilter} />
        <SelectRail label="Sortowanie" value={sort} options={[{ label: "Najnowsze", value: "newest" }, { label: "Najstarsze", value: "oldest" }, { label: "Najwyzsza ocena", value: "highest" }, { label: "Najnizsza ocena", value: "lowest" }]} onChange={setSort} />
      </Card>
      <ReviewsGrid reviews={reviews} loading={data.loading} error={data.error} />
    </>
  );
}

export function ContactPage() {
  const { width } = useWindowDimensions();
  const compact = width < 760;

  return (
    <>
      <PageHeader kicker="Kontakt" title="Umów wizytę lub zapytaj o konsultację" subtitle="Jesteśmy w centrum Warszawy. Napisz, zadzwoń albo zarezerwuj wizytę online, a pomożemy dobrać usługę do Twoich włosów i planu dnia." image={images.salon} />
      <View style={screenStyles.contactLayout}>
        <View style={[screenStyles.contactCard, compact && screenStyles.contactFullWidth]}>
          <Card>
            <Text style={screenStyles.cardTitle}>Maison Noir Studio</Text>
            <Text style={screenStyles.contactLine}>ul. Elegancka 18, 00-001 Warszawa</Text>
            <Text style={screenStyles.contactLine}>+48 123 123 123</Text>
            <Text style={screenStyles.contactLine}>kontakt@maison-noir.pl</Text>
            <View style={screenStyles.contactDivider} />
            <Text style={screenStyles.muted}>Codziennie 9:00-17:00</Text>
          </Card>
        </View>
        <View style={[screenStyles.mapMock, compact && screenStyles.contactFullWidth]}>
          <Text style={screenStyles.mapTitle}>Warszawa Centrum</Text>
          <Text style={screenStyles.mapText}>Kameralny salon beauty z wygodnym dojazdem, strefą konsultacji i spokojną atmosferą stworzoną z myślą o pełnym relaksie.</Text>
        </View>
      </View>
    </>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const authRunsLocally = AUTH_BASE_URL.includes("localhost") || AUTH_BASE_URL.includes("127.0.0.1");

  return (
    <View style={screenStyles.authScreen}>
      <ImageBackground source={{ uri: images.hero }} style={screenStyles.authHero} imageStyle={screenStyles.authHeroImage}>
        <LinearGradient colors={["rgba(0,0,0,0.74)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.76)"]} style={screenStyles.authOverlay}>
          <Text style={screenStyles.heroKicker}>Maison Noir</Text>
          <Text style={screenStyles.authTitle}>Logowanie</Text>
        </LinearGradient>
      </ImageBackground>
      <Card>
        {authRunsLocally ? (
          <View style={screenStyles.authNotice}>
            <Text style={screenStyles.authNoticeText}>Logowanie Google/GitHub działa przez opublikowaną usługę. Jeśli testujesz lokalnie, upewnij się, że adres logowania wskazuje wdrożoną aplikację.</Text>
          </View>
        ) : null}
        {Platform.OS === "web" ? (
          <View style={screenStyles.providerLinks}>
            <Pressable onPress={() => auth.login("google")} style={screenStyles.providerLink}>
              <Text style={screenStyles.providerText}>Google</Text>
            </Pressable>
            <Pressable onPress={() => auth.login("github")} style={screenStyles.providerLink}>
              <Text style={screenStyles.providerText}>GitHub</Text>
            </Pressable>
          </View>
        ) : (
          <NativeGoogleLogin />
        )}
      </Card>
    </View>
  );
}

function NativeGoogleLogin() {
  const { showToast } = useToast();

  if (Platform.OS !== "android") {
    return (
      <Pressable
        onPress={() => showToast({ title: "Logowanie mobilne", message: "Natywne logowanie Google jest obecnie skonfigurowane dla Androida.", tone: "info" })}
        style={screenStyles.providerLink}
      >
        <Text style={screenStyles.providerText}>Google</Text>
      </Pressable>
    );
  }

  return <NativeAndroidGoogleLogin />;
}

function NativeAndroidGoogleLogin() {
  const { loginWithGoogleIdToken, register } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const finishGoogleLogin = async () => {
    if (!webClientId) {
      throw new Error("Ustaw EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID i uruchom Expo ponownie.");
    }

    const idToken = await nativeGoogleIdToken(webClientId);
    if (!idToken) {
      throw new Error("Logowanie Google zostało anulowane.");
    }

    const principal = await loginWithGoogleIdToken(idToken);
    if (!principal) {
      throw new Error("Azure Easy Auth nie zwrócił profilu po zalogowaniu.");
    }

    const role = principal.user?.role;
    if (!principal.user) {
      await register(principal.name, principal.email);
      showToast({ title: "Profil utworzony", message: "Konto klienta zostało połączone z logowaniem Google.", tone: "success" });
      navigate("/profile?onboarding=1");
      return;
    }

    showToast({ title: "Zalogowano", message: `Rola: ${roleLabel(role)}`, tone: "success" });
    navigate(role === "Admin" ? "/admin" : role === "Hairdresser" ? "/hairdresser/dashboard" : "/booking");
  };

  return (
    <Pressable
      disabled={busy}
      onPress={() => {
        setBusy(true);
        finishGoogleLogin()
          .catch((err) => showToast({ title: "Logowanie Google nieudane", message: getErrorMessage(err), tone: "error" }))
          .finally(() => setBusy(false));
      }}
      style={[screenStyles.providerLink, busy && screenStyles.providerLinkDisabled]}
    >
      <Text style={screenStyles.providerText}>{busy ? "Logowanie..." : "Google"}</Text>
    </Pressable>
  );
}

export function AuthCallbackPage() {
  const auth = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem("maisonNoirLogoutPending")) {
      window.sessionStorage.removeItem("maisonNoirLogoutPending");
      showToast({ title: "Wylogowano", message: "Sesja Easy Auth została zakończona.", tone: "success" });
      navigate("/");
      return;
    }

    auth.refresh()
      .then(async (principal) => {
        if (!principal) {
          showToast({ title: "Nie udało się odczytać sesji", message: "Zaloguj się ponownie przez Google albo GitHub.", tone: "error" });
          navigate("/login");
          return;
        }

        let role = principal.user?.role;
        if (!principal.user) {
          await auth.register(principal.name, principal.email);
          role = "Customer";
          showToast({ title: "Profil utworzony", message: "Konto klienta zostało połączone z logowaniem Easy Auth.", tone: "success" });
          navigate("/profile?onboarding=1");
          return;
        } else {
          showToast({ title: "Zalogowano", message: `Rola: ${roleLabel(role)}`, tone: "success" });
        }

        navigate(role === "Admin" ? "/admin" : role === "Hairdresser" ? "/hairdresser/dashboard" : "/booking");
      })
      .catch((err) => showToast({ title: "Nie udało się odczytać sesji", message: getErrorMessage(err), tone: "error" }));
  }, []);

  return <Gate title="Logowanie zakończone" message="Odczytuję profil użytkownika i przekierowuję do odpowiedniego panelu." />;
}

export function RegisterPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <>
      <PageHeader kicker="Auth" title="Rejestracja profilu" subtitle="Rejestracja zapisuje profil aplikacji dla użytkownika już zalogowanego przez Easy Auth." image={images.hairOne} />
      <Card>
        <Field label="Imię i nazwisko" value={displayName} onChangeText={setDisplayName} />
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Button label="Utwórz profil" onPress={() => auth.register(displayName, email).then(() => showToast({ title: "Profil zapisany", tone: "success" })).catch((err) => showToast({ title: "Nie udało się zarejestrować", message: getErrorMessage(err), tone: "error" }))} />
      </Card>
    </>
  );
}

export function BookingPage() {
  const auth = useAuth();
  const { query, navigate } = useRouter();
  const { showToast } = useToast();
  const services = useAsyncData(() => servicesApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(query.get("serviceId") ?? "");
  const [hairdresserId, setHairdresserId] = useState(query.get("hairdresserId") ?? "");
  const [day, setDay] = useState(dateOnly());
  const [slot, setSlot] = useState(query.get("startAt") ?? "");
  const [notes, setNotes] = useState("");
  const [serviceSort, setServiceSort] = useState("recommended");
  const [shortServicesOnly, setShortServicesOnly] = useState(false);
  const selectedService = services.data?.find((item) => item.id === serviceId);
  const selectedHairdresser = hairdressers.data?.find((item) => item.id === hairdresserId);
  const customerName = auth.user?.displayName || auth.user?.email || "Twój profil";
  const bookingServices = useMemo(() => {
    const rows = [...(services.data ?? [])].filter((item) => item.isAvailable && (!shortServicesOnly || item.durationMinutes <= 60));
    if (serviceSort === "priceAsc") rows.sort((a, b) => a.price - b.price);
    if (serviceSort === "priceDesc") rows.sort((a, b) => b.price - a.price);
    if (serviceSort === "duration") rows.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return rows;
  }, [serviceSort, services.data, shortServicesOnly]);
  const slots = useAsyncData(() => (hairdresserId ? hairdressersApi.availability(hairdresserId, day) : Promise.resolve([])), [hairdresserId, day]);
  const customerId = auth.user?.customerId ?? "";
  const availableSlots = (slots.data ?? []).filter((item) => slotFitsSalonHours(item, selectedService?.durationMinutes));

  if (!auth.isAuthenticated) {
    return <Gate title="Musisz się zalogować, aby zarezerwować wizytę" message="Rezerwacja wymaga profilu klienta połączonego z kontem Google albo GitHub." />;
  }

  const create = async () => {
    if (!serviceId || !hairdresserId || !slot || !customerId) {
      showToast({ title: "Uzupełnij wszystkie kroki", message: customerId ? undefined : "Najpierw uzupełnij profil klienta po pierwszym logowaniu.", tone: "error" });
      return;
    }
    const request: CreateAppointmentRequest = { customerId, hairdresserId, salonServiceId: serviceId, startAt: slot, notes };
    try {
      await appointmentsApi.create(request);
      showToast({ title: "Wizyta została zarezerwowana", message: "Wysłaliśmy powiadomienie i zapisaliśmy wizytę w Twoim profilu.", tone: "success" });
      navigate("/my-visits");
    } catch (err) {
      showToast({ title: "Rezerwacja odrzucona", message: getErrorMessage(err), tone: "error" });
    }
  };

  return (
    <>
      <PageHeader kicker="Rezerwacja" title="Umów wizytę" subtitle="Wybierz usługę, stylistę i termin w godzinach 9:00-17:00. Po potwierdzeniu zapiszemy wizytę w Twoim profilu klienta." image={images.hero} />
      <View style={screenStyles.stepper}>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={`Krok ${n}`} active={step === n} onPress={() => setStep(n)} />)}</View>
      {step === 1 ? <><View style={screenStyles.filters}><SelectRail label="Sortowanie usług" value={serviceSort} options={[{ label: "Polecane", value: "recommended" }, { label: "Cena rosnąco", value: "priceAsc" }, { label: "Cena malejąco", value: "priceDesc" }, { label: "Czas trwania", value: "duration" }]} onChange={setServiceSort} /><Chip label="Do 60 minut" active={shortServicesOnly} onPress={() => setShortServicesOnly((value) => !value)} /></View><ServiceGrid services={bookingServices} loading={services.loading} error={services.error} selectedId={serviceId} onSelect={(id) => { setServiceId(id); setStep(2); }} /></> : null}
      {step === 2 ? <HairdresserGrid hairdressers={(hairdressers.data ?? []).filter((item) => item.isActive)} loading={hairdressers.loading} error={hairdressers.error} selectedId={hairdresserId} onProfile={() => undefined} onBook={(id) => { setHairdresserId(id); setStep(3); }} /> : null}
      {step === 3 ? <Card><Text style={screenStyles.cardTitle}>Wybierz datę</Text><Text style={screenStyles.muted}>Salon jest otwarty codziennie od 9:00 do 17:00.</Text><DatePickerField label="Data wizyty" value={day} onChange={setDay} /><SelectRail label="Szybki wybór" value={day} options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ label: addDays(n), value: addDays(n) }))} onChange={setDay} /><Button label="Pokaż dostępne godziny" onPress={() => setStep(4)} /></Card> : null}
      {step === 4 ? <Card><Text style={screenStyles.cardTitle}>Wybierz godzinę</Text><StateView loading={slots.loading} error={slots.error} empty={availableSlots.length === 0}><View style={screenStyles.slotWrap}>{availableSlots.map((item) => <Chip key={item} label={new Date(item).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} active={slot === item} onPress={() => { setSlot(item); setStep(5); }} />)}</View></StateView></Card> : null}
      {step === 5 ? <Card><Text style={screenStyles.cardTitle}>Podsumowanie</Text><Summary rows={[["Usługa", selectedService ? `${selectedService.name} · ${money(selectedService.price)}` : "Brak"], ["Fryzjer", fullName(selectedHairdresser)], ["Termin", slot ? toLocalDateTime(slot) : "Brak"], ["Czas", selectedService ? `${selectedService.durationMinutes} min` : "Brak"], ["Klient", customerName]]} /><Field label="Notatka" value={notes} onChangeText={setNotes} multiline /><Button label="Potwierdź rezerwację" icon={<Check size={17} color={colors.ink} />} onPress={create} /></Card> : null}
    </>
  );
}

export function MyVisitsPage() {
  const { showToast } = useToast();
  const data = useAsyncData(() => customersApi.myAppointments(), []);
  const reviews = useAsyncData(() => reviewsApi.mine(), []);
  const cancelAppointment = (appointment: Appointment) => {
    customersApi.cancelMyAppointment(appointment.id)
      .then(() => {
        showToast({ title: "Wizyta odwołana", tone: "success" });
        data.refresh();
      })
      .catch((err) => showToast({ title: "Nie odwołano wizyty", message: getErrorMessage(err), tone: "error" }));
  };
  return (
    <>
      <VisitsView title="Moje wizyty" appointments={data.data ?? []} loading={data.loading} error={data.error} showCustomer={false} onCancel={(appointment) => confirmDelete(() => cancelAppointment(appointment), "Na pewno odwołać tę wizytę?", "Odwołaj")} />
      <CustomerReviewPanel appointments={data.data ?? []} reviews={reviews.data ?? []} appointmentsLoading={data.loading} reviewsLoading={reviews.loading} error={reviews.error} onSaved={reviews.refresh} />
    </>
  );
}

export function ProfilePage() {
  const { showToast } = useToast();
  const auth = useAuth();
  const { query, navigate } = useRouter();
  const onboarding = query.get("onboarding") === "1";
  const data = useAsyncData(() => customersApi.me(), []);
  const [form, setForm] = useState<CustomerRequest>({ firstName: "", lastName: "", phoneNumber: "", email: "", notes: "" });
  useMemo(() => { if (data.data) setForm({ firstName: data.data.firstName, lastName: data.data.lastName, phoneNumber: data.data.phoneNumber, email: data.data.email, notes: data.data.notes ?? "" }); }, [data.data]);
  const save = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      showToast({ title: "Uzupełnij dane", message: "Imię, nazwisko, email i telefon są wymagane do rezerwacji.", tone: "error" });
      return;
    }

    customersApi.updateMe(form)
      .then(() => {
        showToast({ title: "Profil zapisany", tone: "success" });
        data.refresh();
        if (onboarding) {
          navigate("/booking");
        }
      })
      .catch((err) => showToast({ title: "Nie zapisano profilu", message: getErrorMessage(err), tone: "error" }));
  };
  const removeAccount = () => {
    customersApi.removeMe()
      .then(() => {
        showToast({ title: "Konto usunięte", message: "Twój profil klienta został usunięty.", tone: "success" });
        auth.logout();
      })
      .catch((err) => showToast({ title: "Nie usunięto konta", message: getErrorMessage(err), tone: "error" }));
  };

  return (
    <>
      <PageHeader kicker={onboarding ? "Pierwsze logowanie" : "Klient"} title={onboarding ? "Uzupełnij dane do rezerwacji" : "Profil klienta"} subtitle={onboarding ? "Podaj dane kontaktowe, żebyśmy mogli potwierdzić wizytę i przypisać rezerwacje do Twojego profilu." : "Zarządzaj danymi kontaktowymi używanymi przy rezerwacjach i historii wizyt."} image={images.hairOne} />
      <StateView loading={data.loading} error={data.error} empty={!data.data}>
        <Card>
          <CustomerForm form={form} setForm={setForm} showNotes={false} />
          <Button label={onboarding ? "Zapisz i przejdź do rezerwacji" : "Zapisz profil"} icon={<Edit3 size={17} color={colors.ink} />} onPress={save} />
        </Card>
        {!onboarding ? <Card><Text style={screenStyles.cardTitle}>Usunięcie konta</Text><Text style={screenStyles.muted}>Ta akcja usuwa Twój profil klienta i dane powiązane z kontem w aplikacji.</Text><Button label="Usuń moje konto" variant="ghost" icon={<Trash2 size={17} color={colors.gold} />} onPress={() => confirmDelete(removeAccount, "Na pewno usunąć swoje konto?", "Usuń konto")} /></Card> : null}
      </StateView>
    </>
  );
}

export function HairdresserDashboardPage() {
  const appointments = useAsyncData(() => hairdressersApi.myAppointments(), []);
  const rows = appointments.data ?? [];
  const now = Date.now();
  const completed = rows.filter((item) => item.status === "Completed").length;
  const planned = rows.filter((item) => item.status !== "Completed" && item.status !== "Cancelled" && new Date(item.startAt).getTime() >= now).length;
  const today = dateOnly();
  const todayAppointments = rows.filter((item) => item.startAt.slice(0, 10) === today && item.status !== "Cancelled").length;
  const uniqueCustomers = new Set(rows.map((item) => item.customerId)).size;
  const topCustomer = rows.reduce<Record<string, number>>((acc, item) => {
    if (item.status === "Completed") {
      acc[item.customerId] = (acc[item.customerId] ?? 0) + 1;
    }
    return acc;
  }, {});
  const topCustomerCount = Math.max(0, ...Object.values(topCustomer));
  const topCustomerId = Object.entries(topCustomer).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCustomerName = customerLabel(topCustomerId);
  const completionRate = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  const nextAppointment = [...rows]
    .filter((item) => item.status !== "Cancelled" && item.status !== "Completed" && new Date(item.startAt).getTime() >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  return (
    <>
      <PageHeader kicker="Fryzjer" title="Panel fryzjera" subtitle="Najbliższe wizyty, powiadomienia i szybki podgląd pracy na dziś." image={images.barber} />
      <StateView loading={appointments.loading} error={appointments.error} empty={false}>
        <View style={screenStyles.grid}>
          <Metric title="Wykonane usługi" value={completed} icon={<Check color={colors.gold} />} />
          <Metric title="Zaplanowane wizyty" value={planned} icon={<CalendarDays color={colors.gold} />} />
          <Metric title="Wizyty dzisiaj" value={todayAppointments} icon={<Clock3 color={colors.gold} />} />
          <Metric title="Stali klienci" value={uniqueCustomers} icon={<UsersRound color={colors.gold} />} />
        </View>
        <View style={screenStyles.twoCol}>
          <View style={screenStyles.dashboardInsight}>
            <Card>
              <Text style={screenStyles.cardTitle}>Najbardziej lojalny klient</Text>
              <Text style={screenStyles.metricValue}>{topCustomerCount}</Text>
              <Text style={screenStyles.muted}>{topCustomerCount ? `${topCustomerName} - wykonane usługi dla jednej osoby` : "Brak zakończonych wizyt do analizy."}</Text>
            </Card>
          </View>
          <View style={screenStyles.dashboardInsight}>
            <Card>
              <Text style={screenStyles.cardTitle}>Rytm pracy</Text>
              <Text style={screenStyles.metricValue}>{completionRate}%</Text>
              <Text style={screenStyles.muted}>{nextAppointment ? `Najbliższa wizyta: ${toLocalDateTime(nextAppointment.startAt)}` : "Brak zaplanowanych przyszłych wizyt."}</Text>
            </Card>
          </View>
        </View>
      </StateView>
    </>
  );
}

export function HairdresserAppointmentsPage() {
  const appointments = useAsyncData(() => hairdressersApi.myAppointments(), []);
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filteredAppointments = useMemo(() => {
    return (appointments.data ?? []).filter((appointment) => {
      const appointmentDay = appointment.startAt.slice(0, 10);
      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
      const matchesCustomer = customerFilter === "all" || appointment.customerId === customerFilter;
      const matchesFrom = !dateFrom || appointmentDay >= dateFrom;
      const matchesTo = !dateTo || appointmentDay <= dateTo;
      return matchesStatus && matchesCustomer && matchesFrom && matchesTo;
    });
  }, [appointments.data, customerFilter, dateFrom, dateTo, statusFilter]);
  const customerOptions = useMemo(() => {
    const ids = Array.from(new Set((appointments.data ?? []).map((appointment) => appointment.customerId).filter(Boolean)));
    return ids.map((id, index) => ({ label: `Klient ${index + 1}`, value: id }));
  }, [appointments.data]);
  const changeStatus = (appointment: Appointment, status: AppointmentStatus) =>
    appointmentsApi.update(appointment.id, appointmentUpdateBody(appointment, status))
      .then(() => {
        showToast({ title: "Status wizyty zmieniony", tone: "success" });
        appointments.refresh();
      })
      .catch((err) => showToast({ title: "Nie zmieniono statusu", message: getErrorMessage(err), tone: "error" }));

  return (
    <>
      <PageHeader kicker="Wizyty" title="Wizyty fryzjera" subtitle="Filtruj listę po dacie, kliencie i statusie, a potem aktualizuj przebieg wizyty jednym kliknięciem." image={images.barber} />
      <Card>
        <SelectRail label="Status" value={statusFilter} options={[{ label: "Wszystkie", value: "all" }, ...appointmentStatuses.map((status) => ({ label: appointmentStatusLabels[status], value: status }))]} onChange={setStatusFilter} />
        <SelectRail label="Klient" value={customerFilter} options={[{ label: "Wszyscy", value: "all" }, ...customerOptions]} onChange={setCustomerFilter} />
        <View style={screenStyles.filterDates}>
          <DatePickerField label="Od daty" value={dateFrom} onChange={setDateFrom} />
          <DatePickerField label="Do daty" value={dateTo} onChange={setDateTo} />
        </View>
        <View style={screenStyles.dateQuickActions}>
          <Chip label="Dzisiaj" onPress={() => { const today = dateOnly(); setDateFrom(today); setDateTo(today); }} />
          <Chip label="Najbliższe 7 dni" onPress={() => { setDateFrom(dateOnly()); setDateTo(addDays(7)); }} />
          <Chip label="Wyczyść daty" onPress={() => { setDateFrom(""); setDateTo(""); }} />
        </View>
      </Card>
      <VisitsView title="Lista wizyt" appointments={filteredAppointments} loading={appointments.loading} error={appointments.error} showHeader={false} onStatusChange={changeStatus} />
    </>
  );
}

export function HairdresserCustomersPage() {
  const appointments = useAsyncData(() => hairdressersApi.myAppointments(), []);
  const services = useAsyncData(() => servicesApi.all(), []);
  const { showToast } = useToast();
  const [history, setHistory] = useState<HairdresserCustomerHistory | null>(null);
  const [historyFallbackAppointments, setHistoryFallbackAppointments] = useState<Appointment[]>([]);
  const [historyLoadingId, setHistoryLoadingId] = useState("");
  const rows = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    (appointments.data ?? []).forEach((appointment) => {
      grouped.set(appointment.customerId, [...(grouped.get(appointment.customerId) ?? []), appointment]);
    });

    return Array.from(grouped.entries()).map(([customerId, visits]) => {
      const sorted = [...visits].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
      return {
        id: customerId,
        customerId,
        appointmentCount: visits.length,
        completedCount: visits.filter((item) => item.status === "Completed").length,
        upcomingCount: visits.filter((item) => item.status !== "Completed" && item.status !== "Cancelled" && new Date(item.startAt).getTime() >= Date.now()).length,
        lastVisit: sorted[0]?.startAt,
        visits
      };
    });
  }, [appointments.data]);
  return (
    <>
      <PageHeader kicker="Fryzjer" title="Historia klientów" subtitle="Lista klientów oraz wizyt powiązanych z Twoim profilem fryzjera." image={images.stylist} />
      <StateView loading={appointments.loading} error={appointments.error} empty={rows.length === 0}>
        <DataTable items={rows} columns={[
          { title: "Klient", render: (item) => customerLabel(item.customerId) },
          { title: "Wizyty", render: (item) => String(item.appointmentCount) },
          { title: "Zakończone", render: (item) => String(item.completedCount) },
          { title: "Zaplanowane", render: (item) => String(item.upcomingCount) },
          { title: "Ostatnia wizyta", render: (item) => item.lastVisit ? toLocalDateTime(item.lastVisit) : "Brak" }
        ]} actions={(item) => <Button label={historyLoadingId === item.customerId ? "Pobieram..." : "Pokaż historię"} variant="ghost" disabled={historyLoadingId === item.customerId} onPress={() => {
          setHistoryLoadingId(item.customerId);
          hairdressersApi.customerHistory(item.customerId)
            .then((result) => {
              setHistory(result);
              setHistoryFallbackAppointments(item.visits);
              showToast({ title: "Historia klienta pobrana", message: "Szczegóły wyświetlają się pod tabelą.", tone: "success" });
            })
            .catch((err) => showToast({ title: "Brak dostępu do historii", message: getErrorMessage(err), tone: "error" }))
            .finally(() => setHistoryLoadingId(""));
        }} />} />
      </StateView>
      {history ? <CustomerHistoryCard history={history} fallbackAppointments={historyFallbackAppointments} services={services.data ?? []} /> : null}
    </>
  );
}

export function HairdresserProfilePage() {
  const auth = useAuth();
  const hairdresserId = auth.user?.hairdresserId ?? "";
  const data = useAsyncData(() => hairdresserId ? hairdressersApi.byId(hairdresserId) : Promise.reject(new Error("Konto nie jest połączone z profilem fryzjera.")), [hairdresserId]);

  if (!hairdresserId) {
    return <Gate title="Brak profilu fryzjera" message="To konto nie ma przypisanego profilu fryzjera. Administrator musi połączyć użytkownika z fryzjerem." />;
  }

  return (
    <>
      <PageHeader kicker="Profil" title="Profil fryzjera" subtitle="Podgląd danych widocznych dla klientów. Zmiany profilu i zdjęcia wykonuje administrator salonu." image={data.data?.photoUrl ?? images.stylist} />
      <StateView loading={data.loading} error={data.error} empty={!data.data}>
        <View style={screenStyles.twoCol}>
          <View style={screenStyles.profileForm}>
            <Card>
              <Text style={screenStyles.cardTitle}>Dane profilu</Text>
              <Summary rows={[
                ["Imię i nazwisko", data.data ? fullName(data.data) : "Brak"],
                ["Specjalizacja", data.data?.specialization || "Brak"],
                ["Status", data.data?.isActive ? "Aktywny" : "Nieaktywny"]
              ]} />
              <Text style={screenStyles.muted}>Jeżeli dane są nieaktualne, poproś administratora o edycję profilu w panelu administracyjnym.</Text>
            </Card>
          </View>
          <View style={screenStyles.profilePhotoPanel}>
            <Card>
              <Image source={{ uri: data.data?.photoUrl || images.stylist }} style={screenStyles.profilePhoto} />
              <Text style={screenStyles.cardTitle}>{data.data ? fullName(data.data) : "Zdjęcie profilowe"}</Text>
              <Text style={screenStyles.muted}>To zdjęcie jest używane na publicznej liście fryzjerów i w profilu stylisty. Upload zdjęcia jest dostępny tylko dla administratora.</Text>
            </Card>
          </View>
        </View>
      </StateView>
    </>
  );
}

export function AdminDashboardPage() {
  const customers = useAsyncData(() => adminApi.customers(), []);
  const hairdressers = useAsyncData(() => adminApi.hairdressers(), []);
  const services = useAsyncData(() => adminApi.services(), []);
  const appointments = useAsyncData(() => adminApi.appointments(), []);
  const { navigate } = useRouter();
  const { showToast } = useToast();
  return (
    <>
      <PageHeader kicker="Panel" title="Centrum zarządzania" subtitle="Statystyki salonu, ostatnie rezerwacje i szybki dostęp do najważniejszych sekcji." image={images.salon} />
      <View style={screenStyles.grid}>
        <Metric title="Klienci" value={customers.data?.length ?? 0} icon={<UsersRound color={colors.gold} />} />
        <Metric title="Fryzjerzy" value={hairdressers.data?.length ?? 0} icon={<Scissors color={colors.gold} />} />
        <Metric title="Usługi" value={services.data?.length ?? 0} icon={<Check color={colors.gold} />} />
        <Metric title="Wizyty" value={appointments.data?.length ?? 0} icon={<CalendarDays color={colors.gold} />} />
      </View>
      <View style={screenStyles.grid}>
        <Button label="Dodaj usługę" onPress={() => navigate("/admin/services")} />
        <Button label="Dodaj fryzjera" onPress={() => navigate("/admin/hairdressers")} />
        <Button label="Dodaj zdjęcie" onPress={() => navigate("/admin/gallery")} />
        <Button label="Zarządzaj rolami" onPress={() => navigate("/admin/users")} />
        <Button label="Test SignalR" onPress={() => notificationsApi.signalrTest().then(() => showToast({ title: "Test SignalR wysłany", tone: "success" })).catch((err) => showToast({ title: "Test SignalR nieudany", message: getErrorMessage(err), tone: "error" }))} />
      </View>
      <VisitsView title="Ostatnie rezerwacje" appointments={(appointments.data ?? []).slice(0, 6)} loading={appointments.loading || customers.loading} error={appointments.error || customers.error} customers={customers.data ?? []} />
    </>
  );
}

export function AdminUsersPage() {
  const data = useAsyncData(() => adminApi.users(), []);
  const hairdressers = useAsyncData(() => adminApi.hairdressers(), []);
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>("Customer");
  const [hairdresserId, setHairdresserId] = useState("");
  const selectUser = (user: AppUser) => {
    setSelectedUser(user);
    setRole(user.role);
    setHairdresserId(user.hairdresserId ?? "");
  };
  const save = () => {
    if (!selectedUser) return;
    if (role === "Hairdresser" && !hairdresserId) {
      showToast({ title: "Wybierz fryzjera", message: "Rola fryzjera musi być powiązana z istniejącym profilem fryzjera.", tone: "error" });
      return;
    }

    adminApi.assignRole(selectedUser.id, {
      role,
      hairdresserId: role === "Hairdresser" ? hairdresserId : undefined
    })
      .then(() => {
        showToast({ title: "Użytkownik zaktualizowany", tone: "success" });
        setSelectedUser(null);
        data.refresh();
      })
      .catch((err) => showToast({ title: "Nie zapisano użytkownika", message: getErrorMessage(err), tone: "error" }));
  };
  return (
    <>
      <PageHeader kicker="Admin" title="Użytkownicy i role" subtitle="Zarządzaj dostępem do aplikacji i łącz konta fryzjerów z gotowymi profilami zespołu." image={images.hero} />
      <StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}>
        <DataTable items={data.data ?? []} columns={[{ title: "Użytkownik", render: (u) => u.displayName || u.email || "Użytkownik" }, { title: "Email", render: (u) => u.email }, { title: "Rola", render: (u) => roleLabel(u.role) }]} actions={(user) => <View style={screenStyles.tableActionStack}><Button label="Edytuj" variant="ghost" onPress={() => selectUser(user)} /><Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => adminApi.removeUser(user.id).then(() => { showToast({ title: "Użytkownik usunięty", tone: "success" }); if (selectedUser?.id === user.id) setSelectedUser(null); data.refresh(); }).catch((err) => showToast({ title: "Nie usunięto użytkownika", message: getErrorMessage(err), tone: "error" })), "Na pewno usunąć tego użytkownika?", "Usuń użytkownika")} /></View>} />
      </StateView>
      {selectedUser ? (
        <Card>
          <Text style={screenStyles.cardTitle}>Edycja użytkownika: {selectedUser.displayName || selectedUser.email}</Text>
          <SelectDropdown label="Rola" value={role} options={["Customer", "Hairdresser", "Admin"].map((item) => ({ label: roleLabel(item as UserRole), value: item }))} onChange={(v) => setRole(v as UserRole)} />
          {role === "Customer" ? <Text style={screenStyles.muted}>Profil klienta jest utrzymywany razem z kontem klienta.</Text> : null}
          {role === "Hairdresser" ? <SelectDropdown label="Powiązany fryzjer" value={hairdresserId} options={[{ label: "Wybierz profil fryzjera", value: "" }, ...(hairdressers.data ?? []).map((item) => ({ label: `${fullName(item)} · ${item.specialization || "profil"}`, value: item.id }))]} onChange={setHairdresserId} /> : null}
          {role === "Admin" ? <Text style={screenStyles.muted}>Administrator nie wymaga powiązania z klientem ani fryzjerem.</Text> : null}
          <View style={screenStyles.actions}><Button label="Zapisz zmiany" onPress={save} /><Button label="Anuluj" variant="ghost" onPress={() => setSelectedUser(null)} /></View>
          <Text style={screenStyles.muted}>Zmiana na fryzjera przypina konto do wybranego profilu zespołu. Z listy możesz też usunąć konto, które nie powinno mieć dostępu do aplikacji.</Text>
        </Card>
      ) : null}
    </>
  );
}

export function AdminCustomersPage() {
  const data = useAsyncData(() => adminApi.customers(), []);
  return <CustomersCrud data={data} />;
}

export function AdminHairdressersPage() {
  const data = useAsyncData(() => adminApi.hairdressers(), []);
  return <HairdressersCrud data={data} />;
}

export function AdminServicesPage() {
  const data = useAsyncData(() => adminApi.services(), []);
  return <ServicesCrud data={data} />;
}

export function AdminAppointmentsPage() {
  const data = useAsyncData(() => adminApi.appointments(), []);
  const customers = useAsyncData(() => adminApi.customers(), []);
  const { showToast } = useToast();
  const changeStatus = (appointment: Appointment, status: AppointmentStatus) =>
    appointmentsApi.update(appointment.id, appointmentUpdateBody(appointment, status))
      .then(() => {
        showToast({ title: "Status wizyty zmieniony", tone: "success" });
        data.refresh();
      })
      .catch((err) => showToast({ title: "Nie zmieniono statusu", message: getErrorMessage(err), tone: "error" }));

  return <VisitsView title="Wszystkie wizyty" appointments={data.data ?? []} loading={data.loading || customers.loading} error={data.error || customers.error} adminRefresh={data.refresh} onStatusChange={changeStatus} customers={customers.data ?? []} />;
}

export function AdminReviewsPage() {
  const data = useAsyncData(() => adminApi.reviews(), []);
  const { showToast } = useToast();
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const reviews = useMemo(() => {
    const rows = [...(data.data ?? [])]
      .filter((item) => visibilityFilter === "all" || (visibilityFilter === "visible" ? item.isVisible : !item.isVisible))
      .filter((item) => ratingFilter === "all" || item.rating === Number(ratingFilter));
    rows.sort((a, b) => {
      if (sort === "highest") return b.rating - a.rating;
      if (sort === "lowest") return a.rating - b.rating;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [data.data, ratingFilter, sort, visibilityFilter]);
  const refreshAfter = (promise: Promise<unknown>, success: string) =>
    promise
      .then(() => {
        showToast({ title: success, tone: "success" });
        data.refresh();
      })
      .catch((err) => showToast({ title: "Nie udało się zmienić opinii", message: getErrorMessage(err), tone: "error" }));

  return (
    <>
      <PageHeader kicker="Admin" title="Moderacja opinii" subtitle="Ukrywaj, przywracaj albo usuwaj recenzje klientów. Publicznie widoczne są tylko opinie z aktywną widocznością." image={images.hairTwo} />
      <Card>
        <SelectRail label="Widocznosc" value={visibilityFilter} options={[{ label: "Wszystkie", value: "all" }, { label: "Widoczne", value: "visible" }, { label: "Ukryte", value: "hidden" }]} onChange={setVisibilityFilter} />
        <SelectRail label="Ocena" value={ratingFilter} options={[{ label: "Wszystkie", value: "all" }, ...[5, 4, 3, 2, 1].map((value) => ({ label: stars(value), value: String(value) }))]} onChange={setRatingFilter} />
        <SelectRail label="Sortowanie" value={sort} options={[{ label: "Najnowsze", value: "newest" }, { label: "Najstarsze", value: "oldest" }, { label: "Najwyzsza ocena", value: "highest" }, { label: "Najnizsza ocena", value: "lowest" }]} onChange={setSort} />
      </Card>
      <StateView loading={data.loading} error={data.error} empty={reviews.length === 0}>
        <DataTable items={reviews} columns={[
          { title: "Autor", render: (item) => item.displayName || "Klient" },
          { title: "Ocena", render: (item) => stars(item.rating) },
          { title: "Treść", render: (item) => item.content || "Brak treści" },
          { title: "Widoczność", render: (item) => item.isVisible ? "Widoczna" : "Ukryta" },
          { title: "Data", render: (item) => item.createdAt ? toLocalDateTime(item.createdAt) : "Brak" }
        ]} actions={(item) => (
          <View style={screenStyles.tableActionStack}>
            <Button label={item.isVisible ? "Ukryj" : "Przywróć"} variant="ghost" onPress={() => refreshAfter(item.isVisible ? reviewsApi.hide(item.id) : reviewsApi.show(item.id), item.isVisible ? "Opinia ukryta" : "Opinia przywrócona")} />
            <Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => refreshAfter(reviewsApi.remove(item.id), "Opinia usunięta"))} />
          </View>
        )} />
      </StateView>
    </>
  );
}

export function AdminGalleryPage() {
  const data = useAsyncData(() => adminApi.salonPhotos(), []);
  const { showToast } = useToast();
  const [caption, setCaption] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const photos = data.data ?? [];
  const upload = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"] });
    if (!picked.canceled) {
      await galleryApi.upload(picked.assets[0], caption);
      showToast({ title: "Zdjęcie dodane", tone: "success" });
      setCaption("");
      data.refresh();
    }
  };
  const selectPhoto = (id: string) => {
    const photo = photos.find((item) => item.id === id);
    setSelectedPhotoId(id);
    setEditCaption(photo?.caption ?? "");
  };
  const updateCaption = async () => {
    if (!selectedPhotoId) {
      showToast({ title: "Wybierz zdjęcie", message: "Najpierw wskaż zdjęcie, którego podpis chcesz zmienić.", tone: "error" });
      return;
    }
    await galleryApi.update(selectedPhotoId, { caption: editCaption });
    showToast({ title: "Podpis zdjęcia zapisany", tone: "success" });
    data.refresh();
  };
  return (
    <>
      <PageHeader kicker="Admin" title="Galeria salonu" subtitle="Dodawaj zdjęcia salonu, porządkuj opisy i usuwaj materiały, które nie powinny być już widoczne w aplikacji." image={images.salon} />
      <Card><Field label="Podpis zdjęcia" value={caption} onChangeText={setCaption} /><Button label="Upload zdjęcia" icon={<Upload size={17} color={colors.ink} />} onPress={() => upload().catch((err) => showToast({ title: "Upload nieudany", message: getErrorMessage(err), tone: "error" }))} /></Card>
      <StateView loading={data.loading} error={data.error} empty={photos.length === 0}>
        <Card>
          <SelectDropdown label="Zdjęcie do edycji" value={selectedPhotoId} options={[{ label: "Wybierz zdjęcie", value: "" }, ...photos.map((photo) => ({ label: photo.caption || photo.fileName, value: photo.id }))]} onChange={selectPhoto} />
          <Field label="Nowy podpis" value={editCaption} onChangeText={setEditCaption} />
          <Button label="Zapisz podpis" onPress={() => updateCaption().catch((err) => showToast({ title: "Nie zapisano podpisu", message: getErrorMessage(err), tone: "error" }))} />
        </Card>
        <GalleryGrid photos={photos} onEdit={selectPhoto} onDelete={(id) => galleryApi.remove(id).then(data.refresh)} />
      </StateView>
    </>
  );
}

export function NotFoundPage() {
  return <Gate title="Nie znaleziono widoku" message="Ta ścieżka nie istnieje w aplikacji." />;
}

export function ForbiddenPage() {
  return <Gate title="Nie masz uprawnień do tego widoku" message="Zmień rolę lub zaloguj się przez Easy Auth." />;
}

function Gate({ title, message }: { title: string; message: string }) {
  const { navigate } = useRouter();
  return <><PageHeader kicker="Dostęp" title={title} subtitle={message} image={images.hero} /><Card><Button label="Przejdź do logowania" onPress={() => navigate("/login")} /></Card></>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <View><Text style={screenStyles.sectionKicker}>Maison Noir</Text><Text style={screenStyles.sectionTitle}>{title}</Text><Text style={screenStyles.sectionSubtitle}>{subtitle}</Text></View>;
}

function PreviewBlock({ title, children, onPress }: { title: string; children: React.ReactNode; onPress: () => void }) {
  return <View style={screenStyles.block}><View style={screenStyles.blockHead}><Text style={screenStyles.sectionTitle}>{title}</Text><Button label="Zobacz wszystko" variant="ghost" onPress={onPress} /></View>{children}</View>;
}

function StatsStrip() {
  return <View style={screenStyles.stats}>{["Rezerwacja online 24/7", "Przypomnienia o wizycie", "Portfolio metamorfoz"].map((item) => <Text key={item} style={screenStyles.stat}>{item}</Text>)}</View>;
}

function ServiceGrid({ services, loading, error, selectedId, onSelect, onBook }: { services: SalonService[]; loading?: boolean; error?: string; selectedId?: string; onSelect?: (id: string) => void; onBook?: (id: string) => void }) {
  return <StateView loading={loading} error={error} empty={services.length === 0}><View style={screenStyles.grid}>{services.map((service) => <Pressable key={service.id} onPress={() => onSelect?.(service.id)} style={screenStyles.flexCard}><Card selected={selectedId === service.id}><Text style={screenStyles.cardTitle}>{service.name}</Text><Text style={screenStyles.muted}>{service.description}</Text><View style={screenStyles.row}><Text style={screenStyles.price}>{money(service.price)}</Text><Chip label={`${service.durationMinutes} min`} /></View><Chip label={service.isAvailable ? "Dostępna" : "Niedostępna"} active={service.isAvailable} />{onBook ? <Button label="Zarezerwuj" onPress={() => onBook(service.id)} disabled={!service.isAvailable} /> : null}</Card></Pressable>)}</View></StateView>;
}

function HairdresserGrid({ hairdressers, loading, error, selectedId, onProfile, onBook }: { hairdressers: Hairdresser[]; loading?: boolean; error?: string; selectedId?: string; onProfile: (id: string) => void; onBook: (id: string) => void }) {
  return <StateView loading={loading} error={error} empty={hairdressers.length === 0}><View style={screenStyles.grid}>{hairdressers.map((hairdresser) => <Pressable key={hairdresser.id} style={screenStyles.flexCard}><Card selected={selectedId === hairdresser.id}><Image source={{ uri: hairdresser.photoUrl || images.stylist }} style={screenStyles.avatar} /><Text style={screenStyles.cardTitle}>{fullName(hairdresser)}</Text><Text style={screenStyles.muted}>{hairdresser.specialization}</Text><View style={screenStyles.actions}><Button label="Profil" variant="ghost" onPress={() => onProfile(hairdresser.id)} /><Button label="Umów" onPress={() => onBook(hairdresser.id)} disabled={!hairdresser.isActive} /></View></Card></Pressable>)}</View></StateView>;
}

function GalleryGrid({ photos, onDelete, onEdit }: { photos: SalonPhoto[]; onDelete?: (id: string) => void; onEdit?: (id: string) => void }) {
  const items = photos.length ? photos.map((photo) => ({ id: photo.id, title: photo.caption || photo.fileName, image: photo.blobUrl })) : fallbackGallery.map((item, index) => ({ id: `${index}`, ...item }));
  return <View style={screenStyles.gallery}>{items.map((item) => <View key={item.id} style={screenStyles.galleryItem}><Image source={{ uri: item.image }} style={screenStyles.galleryImage} /><LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} style={screenStyles.galleryShade}><Text style={screenStyles.galleryTitle}>{item.title}</Text>{onEdit || onDelete ? <View style={screenStyles.galleryActions}>{onEdit ? <Pressable onPress={() => onEdit(item.id)} style={screenStyles.galleryActionButton}><Edit3 size={16} color={colors.pearl} /></Pressable> : null}{onDelete ? <Pressable onPress={() => onDelete(item.id)} style={screenStyles.galleryActionButton}><Trash2 size={16} color={colors.pearl} /></Pressable> : null}</View> : null}</LinearGradient></View>)}</View>;
}

function Testimonials() {
  return <View style={screenStyles.grid}>{["Minimalistyczne miejsce i perfekcyjne cięcie.", "Najlepszy booking beauty, z jakiego korzystałam.", "Spokojny luksus bez nadęcia."].map((text, index) => <Card key={text}><Text style={screenStyles.cardTitle}>★★★★★</Text><Text style={screenStyles.muted}>{text}</Text><Text style={screenStyles.goldText}>Klientka #{index + 1}</Text></Card>)}</View>;
}

function stars(rating: number) {
  const value = Math.max(1, Math.min(5, Math.round(rating || 0)));
  return "★".repeat(value) + "☆".repeat(5 - value);
}

function ReviewsGrid({ reviews, loading, error }: { reviews: Review[]; loading?: boolean; error?: string }) {
  return (
    <StateView loading={loading} error={error} empty={reviews.length === 0}>
      <View style={screenStyles.grid}>
        {reviews.map((review) => (
          <View key={review.id} style={screenStyles.flexCard}>
            <Card>
            <Text style={screenStyles.reviewStars}>{stars(review.rating)}</Text>
            <Text style={screenStyles.cardTitle}>{review.displayName || "Klient Maison Noir"}</Text>
            <Text style={screenStyles.muted}>{review.content || "Klient pozostawił ocenę bez dodatkowego komentarza."}</Text>
            <Text style={screenStyles.goldText}>{review.createdAt ? toLocalDateTime(review.createdAt) : "Opinia klienta"}</Text>
            </Card>
          </View>
        ))}
      </View>
    </StateView>
  );
}

function CustomerReviewPanel({ appointments, reviews, appointmentsLoading, reviewsLoading, error, onSaved }: { appointments: Appointment[]; reviews: Review[]; appointmentsLoading?: boolean; reviewsLoading?: boolean; error?: string; onSaved: () => void }) {
  const { showToast } = useToast();
  const services = useAsyncData(() => servicesApi.all(), []);
  const [appointmentId, setAppointmentId] = useState("");
  const [rating, setRating] = useState("5");
  const [content, setContent] = useState("");
  const completedAppointments = appointments.filter((appointment) => appointment.status === "Completed");
  const reviewedAppointmentIds = new Set(reviews.map((review) => review.appointmentId).filter(Boolean));
  const appointmentOptions = completedAppointments.map((appointment) => ({
    label: `${toLocalDateTime(appointment.startAt)} · ${services.data?.find((service) => service.id === appointment.salonServiceId)?.name ?? "Wizyta"}`,
    value: appointment.id,
    disabled: reviewedAppointmentIds.has(appointment.id)
  }));
  const selectedAppointment = appointments.find((appointment) => appointment.id === appointmentId);
  const submit = () => {
    const numericRating = Number(rating);
    if (numericRating < 1 || numericRating > 5 || !content.trim()) {
      showToast({ title: "Uzupełnij opinię", message: "Ocena od 1 do 5 i treść opinii są wymagane.", tone: "error" });
      return;
    }

    const body: ReviewRequest = {
      appointmentId: appointmentId || undefined,
      hairdresserId: selectedAppointment?.hairdresserId,
      salonServiceId: selectedAppointment?.salonServiceId,
      rating: numericRating,
      content: content.trim()
    };

    reviewsApi.create(body)
      .then(() => {
        showToast({ title: "Opinia dodana", message: "Dziękujemy za ocenę wizyty.", tone: "success" });
        setAppointmentId("");
        setRating("5");
        setContent("");
        onSaved();
      })
      .catch((err) => showToast({ title: "Nie dodano opinii", message: getErrorMessage(err), tone: "error" }));
  };

  return (
    <Card>
      <Text style={screenStyles.cardTitle}>Dodaj opinię po wizycie</Text>
      <Text style={screenStyles.muted}>Jeśli wybierzesz wizytę, system połączy opinię z zakończonym terminem z Twojej historii.</Text>
      <StateView loading={appointmentsLoading || reviewsLoading || services.loading} error={error || services.error} empty={false}>
        <SelectRail label="Powiązana wizyta" value={appointmentId} options={[{ label: "Bez powiązania", value: "" }, ...appointmentOptions]} onChange={setAppointmentId} />
        <SelectRail label="Ocena" value={rating} options={[1, 2, 3, 4, 5].map((value) => ({ label: stars(value), value: String(value) }))} onChange={setRating} />
        <Field label="Treść opinii" value={content} onChangeText={setContent} multiline placeholder="Napisz kilka zdań o wizycie..." />
        <Button label="Dodaj opinię" icon={<Plus size={17} color={colors.ink} />} onPress={submit} />
      </StateView>
      {reviews.length ? <View style={screenStyles.reviewList}>{reviews.map((review) => <View key={review.id} style={screenStyles.historyVisit}><Text style={screenStyles.historyVisitTitle}>{stars(review.rating)} · {review.isVisible ? "Widoczna" : "Ukryta"}</Text><Text style={screenStyles.muted}>{review.content || "Brak treści"}</Text></View>)}</View> : null}
    </Card>
  );
}

function appointmentUpdateBody(appointment: Appointment, status: AppointmentStatus): AppointmentRequest {
  return {
    customerId: appointment.customerId,
    hairdresserId: appointment.hairdresserId,
    salonServiceId: appointment.salonServiceId,
    startAt: appointment.startAt,
    status,
    notes: appointment.notes
  };
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  if (Platform.OS === "web") {
    return (
      <View style={screenStyles.datePickerField}>
        <Text style={screenStyles.fieldLabel}>{label}</Text>
        <View style={screenStyles.dateInputShell}>
          <CalendarDays size={17} color={colors.gold} />
          {createElement("input", {
            type: "date",
            value,
            onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            style: {
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.ink,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 800,
              width: "100%"
            }
          })}
        </View>
      </View>
    );
  }

  return <Field label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" />;
}

function SelectDropdown({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string; disabled?: boolean }[]; onChange: (value: string) => void }) {
  if (Platform.OS === "web") {
    return (
      <View style={screenStyles.datePickerField}>
        <Text style={screenStyles.fieldLabel}>{label}</Text>
        <View style={screenStyles.dateInputShell}>
          {createElement("select", {
            value,
            onChange: (event: { target: { value: string } }) => onChange(event.target.value),
            style: {
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.ink,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 800,
              width: "100%"
            }
          }, options.map((option) => createElement("option", { key: option.value, value: option.value, disabled: option.disabled }, option.label)))}
        </View>
      </View>
    );
  }

  return <SelectRail label={label} value={value} options={options} onChange={onChange} />;
}

function CustomerHistoryCard({ history, fallbackAppointments, services }: { history: HairdresserCustomerHistory; fallbackAppointments: Appointment[]; services: SalonService[] }) {
  const now = Date.now();
  const fallbackPrevious = fallbackAppointments.filter((appointment) => appointment.status === "Completed" || appointment.status === "Cancelled" || new Date(appointment.startAt).getTime() < now);
  const fallbackUpcoming = fallbackAppointments.filter((appointment) => appointment.status !== "Completed" && appointment.status !== "Cancelled" && new Date(appointment.startAt).getTime() >= now);
  const previousAppointments = Array.isArray(history.previousAppointments) && history.previousAppointments.length ? history.previousAppointments : fallbackPrevious;
  const upcomingAppointments = Array.isArray(history.upcomingAppointments) && history.upcomingAppointments.length ? history.upcomingAppointments : fallbackUpcoming;
  const serviceIds = Array.isArray(history.usedServiceIds) && history.usedServiceIds.length
    ? history.usedServiceIds
    : Array.from(new Set([...previousAppointments, ...upcomingAppointments].map((appointment) => appointment.salonServiceId).filter(Boolean)));
  const serviceNames = serviceIds
    .map((id) => services.find((service) => service.id === id)?.name ?? "Usługa")
    .join(", ");
  const customer = history.customer;
  const renderAppointments = (items: Appointment[]) => items.slice(0, 5).map((appointment) => (
    <View key={appointment.id} style={screenStyles.historyVisit}>
      <Text style={screenStyles.historyVisitTitle}>{toLocalDateTime(appointment.startAt)}</Text>
      <Text style={screenStyles.muted}>{services.find((service) => service.id === appointment.salonServiceId)?.name ?? "Usługa"} · {appointmentStatusLabels[appointment.status] ?? appointment.status}</Text>
    </View>
  ));

  return (
    <Card>
      <Text style={screenStyles.cardTitle}>Historia klienta: {customer ? fullName(customer) : "Klient"}</Text>
      <Summary rows={[
        ["Email", customer?.email ?? "Brak"],
        ["Telefon", customer?.phoneNumber ?? "Brak"],
        ["Poprzednie wizyty", String(previousAppointments.length)],
        ["Nadchodzące wizyty", String(upcomingAppointments.length)],
        ["Wykorzystane usługi", serviceNames || "Brak"]
      ]} />
      <View style={screenStyles.twoCol}>
        <View style={screenStyles.historyColumn}>
          <Text style={screenStyles.sectionMiniTitle}>Poprzednie wizyty</Text>
          {previousAppointments.length ? renderAppointments(previousAppointments) : <Text style={screenStyles.muted}>Brak poprzednich wizyt.</Text>}
        </View>
        <View style={screenStyles.historyColumn}>
          <Text style={screenStyles.sectionMiniTitle}>Nadchodzące wizyty</Text>
          {upcomingAppointments.length ? renderAppointments(upcomingAppointments) : <Text style={screenStyles.muted}>Brak nadchodzących wizyt.</Text>}
        </View>
      </View>
    </Card>
  );
}

function VisitsView({ title, appointments, loading, error, adminRefresh, showHeader = true, onStatusChange, onCancel, customers = [], showCustomer = true }: { title: string; appointments: Appointment[]; loading?: boolean; error?: string; adminRefresh?: () => void; showHeader?: boolean; onStatusChange?: (appointment: Appointment, status: AppointmentStatus) => void; onCancel?: (appointment: Appointment) => void; customers?: Customer[]; showCustomer?: boolean }) {
  const services = useAsyncData(() => servicesApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const { showToast } = useToast();
  const customerAliases = useMemo(() => new Map(Array.from(new Set(appointments.map((appointment) => appointment.customerId).filter(Boolean))).map((id, index) => [id, `Klient ${index + 1}`])), [appointments]);
  const customerColumn = showCustomer ? [{ title: "Klient", render: (item: Appointment) => customerLabel(item.customerId, customers) === "Klient" ? customerAliases.get(item.customerId) ?? "Klient" : customerLabel(item.customerId, customers) }] : [];
  const table = (
    <StateView loading={loading || services.loading || hairdressers.loading} error={error} empty={appointments.length === 0}>
      <DataTable items={appointments} columns={[
        { title: "Termin", render: (item) => toLocalDateTime(item.startAt) },
        { title: "Usługa", render: (item) => appointmentLabel(item, services.data ?? [], hairdressers.data ?? [], customers).service },
        { title: "Fryzjer", render: (item) => appointmentLabel(item, services.data ?? [], hairdressers.data ?? [], customers).hairdresser },
        ...customerColumn,
        { title: "Status", render: (item) => appointmentStatusLabels[item.status] ?? item.status }
      ]} actions={(item) => {
        const statusButtons = onStatusChange ? (
          <View style={screenStyles.statusActions}>
            {appointmentStatuses.map((status) => (
              <Chip key={status} label={appointmentStatusLabels[status]} active={item.status === status} onPress={() => onStatusChange(item, status)} />
            ))}
          </View>
        ) : null;
        const deleteButton = adminRefresh ? (
          <Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => appointmentsApi.remove(item.id).then(() => { showToast({ title: "Wizyta usunięta", tone: "success" }); adminRefresh(); }))} />
        ) : null;
        const cancelButton = onCancel && item.status !== "Cancelled" && item.status !== "Completed" ? (
          <Button label="Odwołaj" variant="ghost" onPress={() => onCancel(item)} />
        ) : null;
        return statusButtons || deleteButton || cancelButton ? <View style={screenStyles.tableActionStack}>{statusButtons}{cancelButton}{deleteButton}</View> : null;
      }} />
    </StateView>
  );

  return (
    <>
      {showHeader ? <PageHeader kicker="Wizyty" title={title} subtitle="Przegląd terminów z usługą, stylistą, klientem i aktualnym statusem rezerwacji." image={images.barber} /> : null}
      {showHeader ? table : <View style={screenStyles.plainPanel}><Text style={screenStyles.cardTitle}>{title}</Text>{table}</View>}
    </>
  );
}

function CustomersCrud({ data }: { data: ReturnType<typeof useAsyncData<Customer[]>> }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<CustomerRequest>({ firstName: "", lastName: "", phoneNumber: "", email: "", notes: "" });
  const [editingId, setEditingId] = useState("");
  const reset = () => { setEditingId(""); setForm({ firstName: "", lastName: "", phoneNumber: "", email: "", notes: "" }); };
  const edit = (item: Customer) => { setEditingId(item.id); setForm({ firstName: item.firstName, lastName: item.lastName, phoneNumber: item.phoneNumber, email: item.email, notes: item.notes ?? "" }); };
  const save = () => {
    const request = editingId ? customersApi.update(editingId, form) : customersApi.create(form);
    request.then(() => { showToast({ title: editingId ? "Klient zapisany" : "Klient dodany", tone: "success" }); reset(); data.refresh(); }).catch((err) => showToast({ title: "Nie zapisano klienta", message: getErrorMessage(err), tone: "error" }));
  };
  return <><PageHeader kicker="Admin" title="Klienci" subtitle="Dodawaj klientów, aktualizuj dane kontaktowe i utrzymuj porządek w bazie salonu." image={images.hairOne} /><Card><Text style={screenStyles.cardTitle}>{editingId ? "Edytuj klienta" : "Dodaj klienta"}</Text><CustomerForm form={form} setForm={setForm} /><View style={screenStyles.actions}><Button label={editingId ? "Zapisz klienta" : "Dodaj klienta"} icon={<Plus size={17} color={colors.ink} />} onPress={save} />{editingId ? <Button label="Anuluj" variant="ghost" onPress={reset} /> : null}</View></Card><StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}><DataTable items={data.data ?? []} columns={[{ title: "Klient", render: fullName }, { title: "Email", render: (x) => x.email }, { title: "Telefon", render: (x) => x.phoneNumber }]} actions={(item) => <View style={screenStyles.tableActionStack}><Button label="Edytuj" variant="ghost" onPress={() => edit(item)} /><Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => customersApi.remove(item.id).then(data.refresh))} /></View>} /></StateView></>;
}

function HairdressersCrud({ data }: { data: ReturnType<typeof useAsyncData<Hairdresser[]>> }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<HairdresserRequest>({ firstName: "", lastName: "", specialization: "", isActive: true });
  const [editingId, setEditingId] = useState("");
  const reset = () => { setEditingId(""); setForm({ firstName: "", lastName: "", specialization: "", isActive: true }); };
  const edit = (item: Hairdresser) => { setEditingId(item.id); setForm({ firstName: item.firstName, lastName: item.lastName, specialization: item.specialization, isActive: item.isActive }); };
  const save = () => {
    const request = editingId ? hairdressersApi.update(editingId, form) : hairdressersApi.create(form);
    request.then(() => { showToast({ title: editingId ? "Fryzjer zapisany" : "Fryzjer dodany", tone: "success" }); reset(); data.refresh(); }).catch((err) => showToast({ title: "Nie zapisano fryzjera", message: getErrorMessage(err), tone: "error" }));
  };
  const upload = async (id: string) => { const picked = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"] }); if (!picked.canceled) { await hairdressersApi.uploadPhoto(id, picked.assets[0]); showToast({ title: "Zdjęcie fryzjera zapisane", tone: "success" }); data.refresh(); } };
  return <><PageHeader kicker="Admin" title="Zespół fryzjerów" subtitle="Zarządzaj profilami stylistów, ich specjalizacjami, aktywnością i zdjęciami profilowymi." image={images.stylist} /><Card><Text style={screenStyles.cardTitle}>{editingId ? "Edytuj fryzjera" : "Dodaj fryzjera"}</Text><HairdresserForm form={form} setForm={setForm} /><View style={screenStyles.actions}><Button label={editingId ? "Zapisz fryzjera" : "Dodaj fryzjera"} icon={<Plus size={17} color={colors.ink} />} onPress={save} />{editingId ? <Button label="Anuluj" variant="ghost" onPress={reset} /> : null}</View></Card><StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}><DataTable items={data.data ?? []} columns={[{ title: "Fryzjer", render: fullName }, { title: "Specjalizacja", render: (x) => x.specialization }, { title: "Status", render: (x) => x.isActive ? "Aktywny" : "Nieaktywny" }]} actions={(item) => <View style={screenStyles.tableActionStack}><Button label="Edytuj" variant="ghost" onPress={() => edit(item)} /><Button label="Foto" variant="ghost" icon={<Upload size={15} color={colors.gold} />} onPress={() => upload(item.id)} /><Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => hairdressersApi.remove(item.id).then(data.refresh))} /></View>} /></StateView></>;
}

function ServicesCrud({ data }: { data: ReturnType<typeof useAsyncData<SalonService[]>> }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", description: "", durationMinutes: "60", price: "150", isAvailable: true });
  const [editingId, setEditingId] = useState("");
  const body = (): SalonServiceRequest => ({ name: form.name, description: form.description, durationMinutes: Number(form.durationMinutes), price: Number(form.price), isAvailable: form.isAvailable });
  const reset = () => { setEditingId(""); setForm({ name: "", description: "", durationMinutes: "60", price: "150", isAvailable: true }); };
  const edit = (item: SalonService) => { setEditingId(item.id); setForm({ name: item.name, description: item.description, durationMinutes: String(item.durationMinutes), price: String(item.price), isAvailable: item.isAvailable }); };
  const save = () => {
    const request = editingId ? servicesApi.update(editingId, body()) : servicesApi.create(body());
    request.then(() => { showToast({ title: editingId ? "Usługa zapisana" : "Usługa dodana", tone: "success" }); reset(); data.refresh(); }).catch((err) => showToast({ title: "Nie zapisano usługi", message: getErrorMessage(err), tone: "error" }));
  };
  return <><PageHeader kicker="Admin" title="Usługi salonu" subtitle="Dodawaj i aktualizuj ofertę, ceny, czas trwania oraz dostępność usług widocznych dla klientów." image={images.hairTwo} /><Card><Text style={screenStyles.cardTitle}>{editingId ? "Edytuj usługę" : "Dodaj usługę"}</Text><Field label="Nazwa" value={form.name} onChangeText={(name) => setForm({ ...form, name })} /><Field label="Opis" value={form.description} onChangeText={(description) => setForm({ ...form, description })} /><Field label="Czas min" value={form.durationMinutes} onChangeText={(durationMinutes) => setForm({ ...form, durationMinutes })} keyboardType="numeric" /><Field label="Cena" value={form.price} onChangeText={(price) => setForm({ ...form, price })} keyboardType="numeric" /><Chip label="Dostępna" active={form.isAvailable} onPress={() => setForm({ ...form, isAvailable: !form.isAvailable })} /><View style={screenStyles.actions}><Button label={editingId ? "Zapisz usługę" : "Dodaj usługę"} onPress={save} />{editingId ? <Button label="Anuluj" variant="ghost" onPress={reset} /> : null}</View></Card><StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}><DataTable items={data.data ?? []} columns={[{ title: "Usługa", render: (x) => x.name }, { title: "Cena", render: (x) => money(x.price) }, { title: "Czas", render: (x) => `${x.durationMinutes} min` }, { title: "Status", render: (x) => x.isAvailable ? "Dostępna" : "Niedostępna" }]} actions={(item) => <View style={screenStyles.tableActionStack}><Button label="Edytuj" variant="ghost" onPress={() => edit(item)} /><Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => servicesApi.remove(item.id).then(data.refresh))} /></View>} /></StateView></>;
}

function CustomerForm({ form, setForm, showNotes = true }: { form: CustomerRequest; setForm: (form: CustomerRequest) => void; showNotes?: boolean }) {
  if (!showNotes) {
    return <><Field label="Imie" value={form.firstName} onChangeText={(firstName) => setForm({ ...form, firstName })} /><Field label="Nazwisko" value={form.lastName} onChangeText={(lastName) => setForm({ ...form, lastName })} /><Field label="Telefon" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} /><Field label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} /></>;
  }

  return <><Field label="Imię" value={form.firstName} onChangeText={(firstName) => setForm({ ...form, firstName })} /><Field label="Nazwisko" value={form.lastName} onChangeText={(lastName) => setForm({ ...form, lastName })} /><Field label="Telefon" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} /><Field label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} /><Field label="Notatki" value={form.notes ?? ""} onChangeText={(notes) => setForm({ ...form, notes })} multiline /></>;
}

function HairdresserForm({ form, setForm }: { form: HairdresserRequest; setForm: (form: HairdresserRequest) => void }) {
  return <><Field label="Imię" value={form.firstName} onChangeText={(firstName) => setForm({ ...form, firstName })} /><Field label="Nazwisko" value={form.lastName} onChangeText={(lastName) => setForm({ ...form, lastName })} /><Field label="Specjalizacja" value={form.specialization} onChangeText={(specialization) => setForm({ ...form, specialization })} multiline /><Chip label={form.isActive ? "Aktywny profil" : "Profil nieaktywny"} active={form.isActive} onPress={() => setForm({ ...form, isActive: !form.isActive })} /></>;
}

function Summary({ rows }: { rows: Array<[string, string]> }) {
  return <View style={screenStyles.summary}>{rows.map(([label, value]) => <View key={label} style={screenStyles.summaryRow}><Text style={screenStyles.summaryLabel}>{label}</Text><Text style={screenStyles.summaryValue}>{value}</Text></View>)}</View>;
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <View style={screenStyles.metric}><View>{icon}</View><Text style={screenStyles.metricValue}>{value}</Text><Text style={screenStyles.muted}>{title}</Text></View>;
}

function confirmDelete(action: () => void, message = "Na pewno usunąć ten rekord?", confirmText = "Usuń") {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(message)) action();
  } else {
    Alert.alert("Potwierdzenie", message, [{ text: "Anuluj" }, { text: confirmText, onPress: action }]);
  }
}

const screenStyles = StyleSheet.create({
  hero: {
    minHeight: 520,
    borderRadius: radii.xl,
    overflow: "hidden"
  },
  heroImage: {
    borderRadius: radii.xl
  },
  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22
  },
  heroKicker: {
    color: colors.champagne,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 0
  },
  heroTitle: {
    color: colors.pearl,
    fontSize: 46,
    lineHeight: 51,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 10
  },
  heroText: {
    color: "rgba(251,250,247,0.82)",
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 690,
    marginTop: 12
  },
  contactLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  contactCard: {
    width: 290,
    flexShrink: 0
  },
  contactFullWidth: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexBasis: "100%"
  },
  contactLine: {
    color: colors.ink,
    fontWeight: "800",
    marginTop: 9
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 16
  },
  mapMock: {
    flex: 1,
    minWidth: 260,
    minHeight: 250,
    borderRadius: radii.lg,
    padding: 22,
    justifyContent: "flex-end",
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: "rgba(184,146,74,0.35)"
  },
  mapTitle: {
    color: colors.champagne,
    fontSize: 24,
    fontWeight: "900"
  },
  mapText: {
    color: "rgba(251,250,247,0.76)",
    marginTop: 8,
    lineHeight: 22
  },
  authScreen: {
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    gap: 16
  },
  authHero: {
    height: 250,
    borderRadius: radii.xl,
    overflow: "hidden"
  },
  authHeroImage: {
    borderRadius: radii.xl
  },
  authOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22
  },
  authTitle: {
    color: colors.pearl,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    marginTop: 8
  },
  providerLinks: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  providerLink: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    alignItems: "center",
    justifyContent: "center"
  },
  providerLinkDisabled: {
    opacity: 0.58
  },
  providerText: {
    color: colors.ink,
    fontWeight: "900"
  },
  authNotice: {
    borderRadius: radii.md,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 12
  },
  authNoticeText: {
    color: colors.charcoal,
    lineHeight: 20,
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    marginTop: 14
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  flexCard: {
    flex: 1,
    flexBasis: 280,
    minWidth: 255,
    maxWidth: 340
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  muted: {
    color: colors.ash,
    lineHeight: 22
  },
  goldText: {
    color: colors.gold,
    fontWeight: "900",
    marginTop: 12
  },
  reviewStars: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10
  },
  reviewList: {
    gap: 10,
    marginTop: 14
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginVertical: 14
  },
  price: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  avatar: {
    width: "100%",
    height: 190,
    borderRadius: radii.md,
    backgroundColor: colors.bone,
    marginBottom: 12
  },
  stats: {
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-around",
    ...shadow
  },
  stat: {
    color: colors.champagne,
    fontWeight: "900"
  },
  sectionKicker: {
    color: colors.gold,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    marginTop: 4
  },
  sectionSubtitle: {
    color: colors.ash,
    marginTop: 6,
    lineHeight: 23
  },
  block: {
    gap: 14
  },
  blockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center"
  },
  filters: {
    gap: 12
  },
  twoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  profileForm: {
    flex: 1,
    minWidth: 300
  },
  profilePhotoPanel: {
    width: 360,
    maxWidth: "100%",
    flexShrink: 0
  },
  profilePhoto: {
    width: "100%",
    height: 250,
    borderRadius: radii.md,
    backgroundColor: colors.bone,
    marginBottom: 14
  },
  dashboardInsight: {
    flex: 1,
    minWidth: 280
  },
  filterDates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  dateQuickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  datePickerField: {
    flex: 1,
    minWidth: 190,
    gap: 7,
    marginBottom: 12
  },
  fieldLabel: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  dateInputShell: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  historyColumn: {
    flex: 1,
    minWidth: 260,
    gap: 10
  },
  historyVisit: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    padding: 12
  },
  historyVisitTitle: {
    color: colors.ink,
    fontWeight: "900",
    marginBottom: 4
  },
  sectionMiniTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  profileStack: {
    gap: 14,
    width: "100%"
  },
  detailPanel: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0
  },
  slotWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  availabilityBlock: {
    gap: 8,
    marginTop: 12
  },
  compactLabel: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  dayStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%"
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.champagne,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  stepButtonDisabled: {
    opacity: 0.38
  },
  dayCurrent: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pearl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  dayName: {
    color: colors.ash,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center"
  },
  dayNumber: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
    textAlign: "center"
  },
  availabilityHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center"
  },
  slotCount: {
    color: colors.ash,
    fontSize: 12,
    fontWeight: "800"
  },
  hourScroll: {
    maxHeight: 160,
    width: "100%"
  },
  hourGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 2
  },
  hourPill: {
    width: 76,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.champagne,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  hourText: {
    color: colors.ink,
    fontWeight: "900"
  },
  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  galleryItem: {
    flex: 1,
    minWidth: 230,
    height: 310,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.graphite
  },
  galleryImage: {
    width: "100%",
    height: "100%"
  },
  galleryShade: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 16
  },
  galleryTitle: {
    color: colors.pearl,
    fontWeight: "900",
    fontSize: 16
  },
  galleryActions: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    gap: 8
  },
  galleryActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)"
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  stepper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  summary: {
    gap: 9,
    marginBottom: 12
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 8
  },
  summaryLabel: {
    color: colors.ash,
    fontWeight: "900"
  },
  summaryValue: {
    color: colors.ink,
    fontWeight: "900",
    flex: 1,
    textAlign: "right"
  },
  plainPanel: {
    backgroundColor: "#fff",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 12,
    ...shadow
  },
  tableActionStack: {
    gap: 8,
    alignItems: "flex-start"
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    maxWidth: 520
  },
  metric: {
    flex: 1,
    minWidth: 190,
    backgroundColor: "#fff",
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  metricValue: {
    color: colors.ink,
    fontSize: 38,
    fontWeight: "900",
    marginTop: 10
  }
});
