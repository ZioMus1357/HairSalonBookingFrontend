import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ToastProvider } from "./src/context/ToastContext";
import { AppShell } from "./src/layout/AppShell";
import { matchPath, RouterProvider, useRouter } from "./src/router/RouterContext";
import { useSignalR } from "./src/hooks/useSignalR";
import {
  AdminAppointmentsPage,
  AdminCustomersPage,
  AdminDashboardPage,
  AdminGalleryPage,
  AdminHairdressersPage,
  AdminReviewsPage,
  AdminServicesPage,
  AdminUsersPage,
  BookingPage,
  ContactPage,
  ForbiddenPage,
  GalleryPage,
  AuthCallbackPage,
  HairdresserAppointmentsPage,
  HairdresserCustomersPage,
  HairdresserDashboardPage,
  HairdresserDetailsPage,
  HairdresserProfilePage,
  HairdressersPage,
  HomePage,
  LoginPage,
  MyVisitsPage,
  NotFoundPage,
  ProfilePage,
  RegisterPage,
  ReviewsPage,
  ServicesPage
} from "./src/pages/Screens";
import { UserRole } from "./src/types/domain";

type Route = {
  pattern: string;
  roles?: Array<UserRole | "Authenticated">;
  render: (params: Record<string, string>) => JSX.Element;
};

const routes: Route[] = [
  { pattern: "/", render: () => <HomePage /> },
  { pattern: "/services", render: () => <ServicesPage /> },
  { pattern: "/hairdressers", render: () => <HairdressersPage /> },
  { pattern: "/hairdressers/:id", render: (params) => <HairdresserDetailsPage id={params.id} /> },
  { pattern: "/gallery", render: () => <GalleryPage /> },
  { pattern: "/reviews", render: () => <ReviewsPage /> },
  { pattern: "/contact", render: () => <ContactPage /> },
  { pattern: "/login", render: () => <LoginPage /> },
  { pattern: "/auth/callback", render: () => <AuthCallbackPage /> },
  { pattern: "/booking", roles: ["Authenticated"], render: () => <BookingPage /> },
  { pattern: "/my-visits", roles: ["Customer"], render: () => <MyVisitsPage /> },
  { pattern: "/profile", roles: ["Customer"], render: () => <ProfilePage /> },
  { pattern: "/hairdresser/dashboard", roles: ["Hairdresser", "Admin"], render: () => <HairdresserDashboardPage /> },
  { pattern: "/hairdresser/appointments", roles: ["Hairdresser", "Admin"], render: () => <HairdresserAppointmentsPage /> },
  { pattern: "/hairdresser/customers", roles: ["Hairdresser", "Admin"], render: () => <HairdresserCustomersPage /> },
  { pattern: "/hairdresser/profile", roles: ["Hairdresser", "Admin"], render: () => <HairdresserProfilePage /> },
  { pattern: "/admin", roles: ["Admin"], render: () => <AdminDashboardPage /> },
  { pattern: "/admin/users", roles: ["Admin"], render: () => <AdminUsersPage /> },
  { pattern: "/admin/customers", roles: ["Admin"], render: () => <AdminCustomersPage /> },
  { pattern: "/admin/hairdressers", roles: ["Admin"], render: () => <AdminHairdressersPage /> },
  { pattern: "/admin/services", roles: ["Admin"], render: () => <AdminServicesPage /> },
  { pattern: "/admin/appointments", roles: ["Admin"], render: () => <AdminAppointmentsPage /> },
  { pattern: "/admin/reviews", roles: ["Admin"], render: () => <AdminReviewsPage /> },
  { pattern: "/admin/gallery", roles: ["Admin"], render: () => <AdminGalleryPage /> }
];

function RouteRenderer() {
  const { path } = useRouter();
  const auth = useAuth();
  useSignalR();

  const result = useMemo(() => {
    for (const route of routes) {
      const params = matchPath(route.pattern, path);
      if (params) {
        return { route, params };
      }
    }
    return null;
  }, [path]);

  if (!result) {
    return <NotFoundPage />;
  }

  const { route, params } = result;
  if (route.roles?.includes("Authenticated") && !auth.isAuthenticated) {
    return <ForbiddenPage />;
  }
  if (route.roles && !route.roles.includes("Authenticated") && !route.roles.includes(auth.role as UserRole)) {
    return <ForbiddenPage />;
  }
  return route.render(params);
}

export default function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppShell>
            <RouteRenderer />
          </AppShell>
        </AuthProvider>
      </ToastProvider>
    </RouterProvider>
  );
}
