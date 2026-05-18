import * as DocumentPicker from "expo-document-picker";
import { CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3, Edit3, Image as ImageIcon, Plus, RefreshCcw, Scissors, Trash2, Upload, UserRound, UsersRound } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { adminApi, appointmentsApi, authApi, AUTH_BASE_URL, customersApi, galleryApi, hairdressersApi, notificationsApi, servicesApi } from "../api";
import { Button, Card, Chip, DataTable, Field, PageHeader, SelectRail, StateView } from "../components/Primitives";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsyncData } from "../hooks/useAsyncData";
import { useRouter } from "../router/RouterContext";
import { colors, images, radii, shadow } from "../theme/tokens";
import { Appointment, AppointmentRequest, Customer, CustomerRequest, Hairdresser, HairdresserRequest, SalonPhoto, SalonService, SalonServiceRequest, UserRole } from "../types/domain";
import { addDays, appointmentLabel, dateOnly, fullName, getErrorMessage, money, toLocalDateTime } from "../utils/format";

const fallbackGallery = [
  { title: "Soft blonde layers", image: images.hairOne },
  { title: "Gloss color", image: images.hairTwo },
  { title: "Barber fade", image: images.barber }
];

export function HomePage() {
  const { navigate } = useRouter();
  const services = useAsyncData(() => servicesApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const photos = useAsyncData(() => galleryApi.all(), []);

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
      <Testimonials />
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
            <Text style={screenStyles.muted}>Poniedziałek-Piątek 9:00-20:00</Text>
            <Text style={screenStyles.muted}>Sobota 9:00-16:00</Text>
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
            <Text style={screenStyles.authNoticeText}>Logowanie Google/GitHub działa tylko na Azure App Service. Ustaw EXPO_PUBLIC_API_BASE_URL oraz EXPO_PUBLIC_AUTH_BASE_URL na adres App Service.</Text>
          </View>
        ) : null}
        <View style={screenStyles.providerLinks}>
          <Pressable onPress={() => auth.login("google")} style={screenStyles.providerLink}>
            <Text style={screenStyles.providerText}>Google</Text>
          </Pressable>
          <Pressable onPress={() => auth.login("github")} style={screenStyles.providerLink}>
            <Text style={screenStyles.providerText}>GitHub</Text>
          </Pressable>
        </View>
      </Card>
    </View>
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
          showToast({ title: "Zalogowano", message: `Rola: ${role}`, tone: "success" });
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
  const customers = useAsyncData(() => customersApi.all(), []);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(query.get("serviceId") ?? "");
  const [hairdresserId, setHairdresserId] = useState(query.get("hairdresserId") ?? "");
  const [day, setDay] = useState(dateOnly());
  const [slot, setSlot] = useState(query.get("startAt") ?? "");
  const [notes, setNotes] = useState("");
  const selectedService = services.data?.find((item) => item.id === serviceId);
  const selectedHairdresser = hairdressers.data?.find((item) => item.id === hairdresserId);
  const slots = useAsyncData(() => (hairdresserId ? hairdressersApi.availability(hairdresserId, day) : Promise.resolve([])), [hairdresserId, day]);
  const customerId = auth.user?.customerId ?? customers.data?.[0]?.id ?? "";
  const availableSlots = (slots.data ?? []).filter((item) => {
    if (!selectedService) return true;
    const start = new Date(item).getTime();
    const end = start + selectedService.durationMinutes * 60_000;
    const close = new Date(`${item.slice(0, 10)}T17:00:00.000Z`).getTime();
    return end <= close;
  });

  if (!auth.isAuthenticated) {
    return <Gate title="Musisz się zalogować, aby zarezerwować wizytę" message="Rezerwacja wymaga profilu klienta połączonego z kontem Google albo GitHub." />;
  }

  const create = async () => {
    if (!serviceId || !hairdresserId || !slot || !customerId) {
      showToast({ title: "Uzupełnij wszystkie kroki", tone: "error" });
      return;
    }
    const request: AppointmentRequest = { customerId, hairdresserId, salonServiceId: serviceId, startAt: slot, status: "Booked", notes };
    try {
      await appointmentsApi.create(request);
      showToast({ title: "Wizyta została zarezerwowana", message: "Backend uruchomił powiadomienia, kolejkę i potwierdzenie mailowe.", tone: "success" });
      navigate("/my-visits");
    } catch (err) {
      showToast({ title: "Rezerwacja odrzucona", message: getErrorMessage(err), tone: "error" });
    }
  };

  return (
    <>
      <PageHeader kicker="Rezerwacja" title="Umów wizytę" subtitle="Wybierz usługę, stylistę i dogodny termin. Po potwierdzeniu zapiszemy wizytę w Twoim profilu klienta." image={images.hero} />
      <View style={screenStyles.stepper}>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={`Krok ${n}`} active={step === n} onPress={() => setStep(n)} />)}</View>
      {step === 1 ? <ServiceGrid services={(services.data ?? []).filter((item) => item.isAvailable)} loading={services.loading} error={services.error} selectedId={serviceId} onSelect={(id) => { setServiceId(id); setStep(2); }} /> : null}
      {step === 2 ? <HairdresserGrid hairdressers={(hairdressers.data ?? []).filter((item) => item.isActive)} loading={hairdressers.loading} error={hairdressers.error} selectedId={hairdresserId} onProfile={() => undefined} onBook={(id) => { setHairdresserId(id); setStep(3); }} /> : null}
      {step === 3 ? <Card><SelectRail label="Wybierz datę" value={day} options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ label: addDays(n), value: addDays(n) }))} onChange={(value) => { setDay(value); setStep(4); }} /></Card> : null}
      {step === 4 ? <Card><Text style={screenStyles.cardTitle}>Wybierz godzinę</Text><StateView loading={slots.loading} error={slots.error} empty={availableSlots.length === 0}><View style={screenStyles.slotWrap}>{availableSlots.map((item) => <Chip key={item} label={new Date(item).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} active={slot === item} onPress={() => { setSlot(item); setStep(5); }} />)}</View></StateView></Card> : null}
      {step === 5 ? <Card><Text style={screenStyles.cardTitle}>Podsumowanie</Text><Summary rows={[["Usługa", selectedService ? `${selectedService.name} · ${money(selectedService.price)}` : "Brak"], ["Fryzjer", fullName(selectedHairdresser)], ["Termin", slot ? toLocalDateTime(slot) : "Brak"], ["Czas", selectedService ? `${selectedService.durationMinutes} min` : "Brak"], ["Klient", customerId]]} /><Field label="Notatka" value={notes} onChangeText={setNotes} multiline /><Button label="Potwierdź rezerwację" icon={<Check size={17} color={colors.ink} />} onPress={create} /></Card> : null}
    </>
  );
}

export function MyVisitsPage() {
  const data = useAsyncData(() => customersApi.myAppointments(), []);
  return <VisitsView title="Moje wizyty" appointments={data.data ?? []} loading={data.loading} error={data.error} />;
}

export function ProfilePage() {
  const { showToast } = useToast();
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

  return (
    <>
      <PageHeader kicker={onboarding ? "Pierwsze logowanie" : "Klient"} title={onboarding ? "Uzupełnij dane do rezerwacji" : "Profil klienta"} subtitle={onboarding ? "Podaj dane kontaktowe, żebyśmy mogli potwierdzić wizytę i przypisać rezerwacje do Twojego profilu." : "Zarządzaj danymi kontaktowymi używanymi przy rezerwacjach i historii wizyt."} image={images.hairOne} />
      <StateView loading={data.loading} error={data.error} empty={!data.data}>
        <Card>
          <CustomerForm form={form} setForm={setForm} />
          <Button label={onboarding ? "Zapisz i przejdź do rezerwacji" : "Zapisz profil"} icon={<Edit3 size={17} color={colors.ink} />} onPress={save} />
        </Card>
      </StateView>
    </>
  );
}

export function HairdresserDashboardPage() {
  const appointments = useAsyncData(() => hairdressersApi.myAppointments(), []);
  return (
    <>
      <PageHeader kicker="Fryzjer" title="Panel fryzjera" subtitle="Najbliższe wizyty, powiadomienia i szybki podgląd pracy na dziś." image={images.barber} />
      <VisitsView title="Najbliższe wizyty" appointments={(appointments.data ?? []).slice(0, 5)} loading={appointments.loading} error={appointments.error} />
    </>
  );
}

export function HairdresserAppointmentsPage() {
  const appointments = useAsyncData(() => hairdressersApi.myAppointments(), []);
  return <VisitsView title="Wizyty fryzjera" appointments={appointments.data ?? []} loading={appointments.loading} error={appointments.error} />;
}

export function HairdresserCustomersPage() {
  const customers = useAsyncData(() => customersApi.all(), []);
  const { showToast } = useToast();
  return (
    <>
      <PageHeader kicker="Fryzjer" title="Historia klientów" subtitle="Lista klientów oraz wizyt powiązanych z Twoim profilem fryzjera." image={images.stylist} />
      <StateView loading={customers.loading} error={customers.error} empty={(customers.data ?? []).length === 0}>
        <DataTable items={customers.data ?? []} columns={[{ title: "Klient", render: fullName }, { title: "Email", render: (item) => item.email }]} actions={(item) => <Button label="Historia" variant="ghost" onPress={() => hairdressersApi.customerHistory(item.id).then(() => showToast({ title: "Historia klienta pobrana", tone: "success" })).catch((err) => showToast({ title: "Brak dostępu do historii", message: getErrorMessage(err), tone: "error" }))} />} />
      </StateView>
    </>
  );
}

export function HairdresserProfilePage() {
  return <HairdresserDashboardPage />;
}

export function AdminDashboardPage() {
  const customers = useAsyncData(() => customersApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const services = useAsyncData(() => servicesApi.all(), []);
  const appointments = useAsyncData(() => appointmentsApi.all(), []);
  const { navigate } = useRouter();
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
      </View>
      <VisitsView title="Ostatnie rezerwacje" appointments={(appointments.data ?? []).slice(0, 6)} loading={appointments.loading} error={appointments.error} />
    </>
  );
}

export function AdminUsersPage() {
  const data = useAsyncData(() => adminApi.users(), []);
  const customers = useAsyncData(() => customersApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const { showToast } = useToast();
  const [role, setRole] = useState<UserRole>("Customer");
  const [customerId, setCustomerId] = useState("");
  const [hairdresserId, setHairdresserId] = useState("");
  return (
    <>
      <PageHeader kicker="Admin" title="Użytkownicy i role" subtitle="Zarządzaj dostępem do aplikacji i przypisuj konta do klientów, fryzjerów lub administratorów." image={images.hero} />
      <StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}>
        <DataTable items={data.data ?? []} columns={[{ title: "Użytkownik", render: (u) => u.displayName || u.id }, { title: "Email", render: (u) => u.email }, { title: "Rola", render: (u) => u.role }]} actions={(user) => <Button label="Ustaw" variant="ghost" onPress={() => adminApi.assignRole(user.id, role, customerId || undefined, hairdresserId || undefined).then(() => { showToast({ title: "Rola przypisana", tone: "success" }); data.refresh(); }).catch((err) => showToast({ title: "Nie przypisano roli", message: getErrorMessage(err), tone: "error" }))} />} />
      </StateView>
      <Card>
        <SelectRail label="Rola" value={role} options={["Customer", "Hairdresser", "Admin"].map((item) => ({ label: item, value: item }))} onChange={(v) => setRole(v as UserRole)} />
        <SelectRail label="CustomerId" value={customerId} options={(customers.data ?? []).map((item) => ({ label: fullName(item), value: item.id }))} onChange={setCustomerId} />
        <SelectRail label="HairdresserId" value={hairdresserId} options={(hairdressers.data ?? []).map((item) => ({ label: fullName(item), value: item.id }))} onChange={setHairdresserId} />
      </Card>
    </>
  );
}

export function AdminCustomersPage() {
  const data = useAsyncData(() => customersApi.all(), []);
  return <CustomersCrud data={data} />;
}

export function AdminHairdressersPage() {
  const data = useAsyncData(() => hairdressersApi.all(), []);
  return <HairdressersCrud data={data} />;
}

export function AdminServicesPage() {
  const data = useAsyncData(() => servicesApi.all(), []);
  return <ServicesCrud data={data} />;
}

export function AdminAppointmentsPage() {
  const data = useAsyncData(() => appointmentsApi.all(), []);
  return <VisitsView title="Wszystkie wizyty" appointments={data.data ?? []} loading={data.loading} error={data.error} adminRefresh={data.refresh} />;
}

export function AdminGalleryPage() {
  const data = useAsyncData(() => galleryApi.all(), []);
  const { showToast } = useToast();
  const [caption, setCaption] = useState("");
  const upload = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"] });
    if (!picked.canceled) {
      await galleryApi.upload(picked.assets[0], caption);
      showToast({ title: "Zdjęcie dodane", tone: "success" });
      setCaption("");
      data.refresh();
    }
  };
  return (
    <>
      <PageHeader kicker="Admin" title="Galeria salonu" subtitle="Dodawaj zdjęcia salonu, porządkuj opisy i usuwaj materiały, które nie powinny być już widoczne w aplikacji." image={images.salon} />
      <Card><Field label="Podpis zdjęcia" value={caption} onChangeText={setCaption} /><Button label="Upload zdjęcia" icon={<Upload size={17} color={colors.ink} />} onPress={() => upload().catch((err) => showToast({ title: "Upload nieudany", message: getErrorMessage(err), tone: "error" }))} /></Card>
      <GalleryGrid photos={data.data ?? []} onDelete={(id) => galleryApi.remove(id).then(data.refresh)} />
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

function GalleryGrid({ photos, onDelete }: { photos: SalonPhoto[]; onDelete?: (id: string) => void }) {
  const items = photos.length ? photos.map((photo) => ({ id: photo.id, title: photo.caption || photo.fileName, image: photo.blobUrl })) : fallbackGallery.map((item, index) => ({ id: `${index}`, ...item }));
  return <View style={screenStyles.gallery}>{items.map((item) => <View key={item.id} style={screenStyles.galleryItem}><Image source={{ uri: item.image }} style={screenStyles.galleryImage} /><LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} style={screenStyles.galleryShade}><Text style={screenStyles.galleryTitle}>{item.title}</Text>{onDelete ? <Pressable onPress={() => onDelete(item.id)} style={screenStyles.deleteButton}><Trash2 size={16} color={colors.pearl} /></Pressable> : null}</LinearGradient></View>)}</View>;
}

function Testimonials() {
  return <View style={screenStyles.grid}>{["Minimalistyczne miejsce i perfekcyjne cięcie.", "Najlepszy booking beauty, z jakiego korzystałam.", "Spokojny luksus bez nadęcia."].map((text, index) => <Card key={text}><Text style={screenStyles.cardTitle}>★★★★★</Text><Text style={screenStyles.muted}>{text}</Text><Text style={screenStyles.goldText}>Klientka #{index + 1}</Text></Card>)}</View>;
}

function VisitsView({ title, appointments, loading, error, adminRefresh }: { title: string; appointments: Appointment[]; loading?: boolean; error?: string; adminRefresh?: () => void }) {
  const services = useAsyncData(() => servicesApi.all(), []);
  const hairdressers = useAsyncData(() => hairdressersApi.all(), []);
  const customers = useAsyncData(() => customersApi.all(), []);
  const { showToast } = useToast();
  return (
    <>
      <PageHeader kicker="Wizyty" title={title} subtitle="Przegląd terminów z usługą, stylistą, klientem i aktualnym statusem rezerwacji." image={images.barber} />
      <StateView loading={loading || services.loading || hairdressers.loading || customers.loading} error={error} empty={appointments.length === 0}>
        <DataTable items={appointments} columns={[
          { title: "Termin", render: (item) => toLocalDateTime(item.startAt) },
          { title: "Usługa", render: (item) => appointmentLabel(item, services.data ?? [], hairdressers.data ?? [], customers.data ?? []).service },
          { title: "Fryzjer", render: (item) => appointmentLabel(item, services.data ?? [], hairdressers.data ?? [], customers.data ?? []).hairdresser },
          { title: "Klient", render: (item) => appointmentLabel(item, services.data ?? [], hairdressers.data ?? [], customers.data ?? []).customer },
          { title: "Status", render: (item) => item.status }
        ]} actions={adminRefresh ? (item) => <Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => appointmentsApi.remove(item.id).then(() => { showToast({ title: "Wizyta usunięta", tone: "success" }); adminRefresh(); }))} /> : undefined} />
      </StateView>
    </>
  );
}

function CustomersCrud({ data }: { data: ReturnType<typeof useAsyncData<Customer[]>> }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<CustomerRequest>({ firstName: "", lastName: "", phoneNumber: "", email: "", notes: "" });
  return <><PageHeader kicker="Admin" title="Klienci" subtitle="Dodawaj klientów, aktualizuj dane kontaktowe i utrzymuj porządek w bazie salonu." image={images.hairOne} /><Card><CustomerForm form={form} setForm={setForm} /><Button label="Dodaj klienta" icon={<Plus size={17} color={colors.ink} />} onPress={() => customersApi.create(form).then(() => { showToast({ title: "Klient dodany", tone: "success" }); data.refresh(); })} /></Card><StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}><DataTable items={data.data ?? []} columns={[{ title: "Klient", render: fullName }, { title: "Email", render: (x) => x.email }, { title: "Telefon", render: (x) => x.phoneNumber }]} actions={(item) => <Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => customersApi.remove(item.id).then(data.refresh))} />} /></StateView></>;
}

function HairdressersCrud({ data }: { data: ReturnType<typeof useAsyncData<Hairdresser[]>> }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<HairdresserRequest>({ firstName: "", lastName: "", specialization: "", isActive: true });
  const upload = async (id: string) => { const picked = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"] }); if (!picked.canceled) { await hairdressersApi.uploadPhoto(id, picked.assets[0]); showToast({ title: "Zdjęcie fryzjera zapisane", tone: "success" }); data.refresh(); } };
  return <><PageHeader kicker="Admin" title="Zespół fryzjerów" subtitle="Zarządzaj profilami stylistów, ich specjalizacjami, aktywnością i zdjęciami profilowymi." image={images.stylist} /><Card><Field label="Imię" value={form.firstName} onChangeText={(firstName) => setForm({ ...form, firstName })} /><Field label="Nazwisko" value={form.lastName} onChangeText={(lastName) => setForm({ ...form, lastName })} /><Field label="Specjalizacja" value={form.specialization} onChangeText={(specialization) => setForm({ ...form, specialization })} /><Chip label="Aktywny" active={form.isActive} onPress={() => setForm({ ...form, isActive: !form.isActive })} /><Button label="Dodaj fryzjera" icon={<Plus size={17} color={colors.ink} />} onPress={() => hairdressersApi.create(form).then(() => { showToast({ title: "Fryzjer dodany", tone: "success" }); data.refresh(); })} /></Card><StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}><DataTable items={data.data ?? []} columns={[{ title: "Fryzjer", render: fullName }, { title: "Specjalizacja", render: (x) => x.specialization }, { title: "Status", render: (x) => x.isActive ? "Aktywny" : "Nieaktywny" }]} actions={(item) => <View style={screenStyles.actions}><Button label="Foto" variant="ghost" icon={<Upload size={15} color={colors.gold} />} onPress={() => upload(item.id)} /><Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => hairdressersApi.remove(item.id).then(data.refresh))} /></View>} /></StateView></>;
}

function ServicesCrud({ data }: { data: ReturnType<typeof useAsyncData<SalonService[]>> }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", description: "", durationMinutes: "60", price: "150", isAvailable: true });
  const body = (): SalonServiceRequest => ({ name: form.name, description: form.description, durationMinutes: Number(form.durationMinutes), price: Number(form.price), isAvailable: form.isAvailable });
  return <><PageHeader kicker="Admin" title="Usługi salonu" subtitle="Dodawaj i aktualizuj ofertę, ceny, czas trwania oraz dostępność usług widocznych dla klientów." image={images.hairTwo} /><Card><Field label="Nazwa" value={form.name} onChangeText={(name) => setForm({ ...form, name })} /><Field label="Opis" value={form.description} onChangeText={(description) => setForm({ ...form, description })} /><Field label="Czas min" value={form.durationMinutes} onChangeText={(durationMinutes) => setForm({ ...form, durationMinutes })} keyboardType="numeric" /><Field label="Cena" value={form.price} onChangeText={(price) => setForm({ ...form, price })} keyboardType="numeric" /><Chip label="Dostępna" active={form.isAvailable} onPress={() => setForm({ ...form, isAvailable: !form.isAvailable })} /><Button label="Dodaj usługę" onPress={() => servicesApi.create(body()).then(() => { showToast({ title: "Usługa dodana", tone: "success" }); data.refresh(); })} /></Card><StateView loading={data.loading} error={data.error} empty={(data.data ?? []).length === 0}><DataTable items={data.data ?? []} columns={[{ title: "Usługa", render: (x) => x.name }, { title: "Cena", render: (x) => money(x.price) }, { title: "Czas", render: (x) => `${x.durationMinutes} min` }, { title: "Status", render: (x) => x.isAvailable ? "Dostępna" : "Niedostępna" }]} actions={(item) => <Button label="Usuń" variant="ghost" onPress={() => confirmDelete(() => servicesApi.remove(item.id).then(data.refresh))} />} /></StateView></>;
}

function CustomerForm({ form, setForm }: { form: CustomerRequest; setForm: (form: CustomerRequest) => void }) {
  return <><Field label="Imię" value={form.firstName} onChangeText={(firstName) => setForm({ ...form, firstName })} /><Field label="Nazwisko" value={form.lastName} onChangeText={(lastName) => setForm({ ...form, lastName })} /><Field label="Telefon" value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} /><Field label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} /><Field label="Notatki" value={form.notes ?? ""} onChangeText={(notes) => setForm({ ...form, notes })} multiline /></>;
}

function Summary({ rows }: { rows: Array<[string, string]> }) {
  return <View style={screenStyles.summary}>{rows.map(([label, value]) => <View key={label} style={screenStyles.summaryRow}><Text style={screenStyles.summaryLabel}>{label}</Text><Text style={screenStyles.summaryValue}>{value}</Text></View>)}</View>;
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <View style={screenStyles.metric}><View>{icon}</View><Text style={screenStyles.metricValue}>{value}</Text><Text style={screenStyles.muted}>{title}</Text></View>;
}

function confirmDelete(action: () => void) {
  if (Platform.OS === "web") {
    action();
  } else {
    Alert.alert("Potwierdzenie", "Na pewno usunąć ten rekord?", [{ text: "Anuluj" }, { text: "Usuń", onPress: action }]);
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
    minWidth: 255
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
