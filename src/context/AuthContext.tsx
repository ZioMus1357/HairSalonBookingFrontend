import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { AUTH_BASE_URL, authApi } from "../api";
import { AppUser, AuthMe, UserRole } from "../types/domain";

type PreviewUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  customerId?: string;
  hairdresserId?: string;
};

type AuthState = {
  loading: boolean;
  principal: AuthMe | null;
  user: AppUser | PreviewUser | null;
  role: UserRole | "Guest";
  isAuthenticated: boolean;
  error?: string;
  refresh: () => Promise<AuthMe | null>;
  register: (displayName: string, email: string) => Promise<void>;
  login: (provider?: "google" | "github" | "aad") => void;
  loginWithCredentials: (email: string, password: string) => Promise<AppUser | PreviewUser>;
  logout: () => void;
  previewAs: (role: UserRole) => void;
};

const AuthContext = createContext<AuthState | null>(null);
const basePath = (process.env.EXPO_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

function frontendUrl(path = "/") {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${basePath}${normalizedPath}`;
}

const previewUsers: Record<UserRole, PreviewUser> = {
  Customer: {
    id: "preview-customer",
    displayName: "Preview Customer",
    email: "customer@maison-noir.local",
    role: "Customer",
    customerId: "customer-demo"
  },
  Hairdresser: {
    id: "preview-hairdresser",
    displayName: "Preview Hairdresser",
    email: "hairdresser@maison-noir.local",
    role: "Hairdresser",
    hairdresserId: "hairdresser-demo"
  },
  Admin: {
    id: "preview-admin",
    displayName: "Preview Admin",
    email: "admin@maison-noir.local",
    role: "Admin"
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<AuthMe | null>(null);
  const [preview, setPreview] = useState<PreviewUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await authApi.me();
      setPrincipal(next);
      setPreview(null);
      setError(undefined);
      return next;
    } catch (err) {
      setPrincipal(null);
      setError(err instanceof Error ? err.message : "Nie udało się odczytać użytkownika Easy Auth.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(
    async (displayName: string, email: string) => {
      const user = await authApi.register(displayName, email);
      setPrincipal((current) => ({
        provider: current?.provider ?? "EasyAuth",
        providerUserId: current?.providerUserId ?? user.providerUserId,
        name: displayName,
        email,
        user,
        customer: current?.customer ?? null
      }));
    },
    []
  );

  const login = useCallback((provider: "google" | "github" | "aad" = "aad") => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const redirect = encodeURIComponent(frontendUrl("/auth/callback"));
      window.location.href = `${AUTH_BASE_URL}/.auth/login/${provider}?post_login_redirect_uri=${redirect}`;
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      if (!email.trim() || !password.trim()) {
        throw new Error("Wpisz email i hasło.");
      }

      const next = await authApi.me();
      const nextUser = next.user;
      if (!nextUser) {
        throw new Error("Konto istnieje u providera, ale nie ma jeszcze profilu aplikacji. Użyj rejestracji.");
      }

      if (nextUser.email.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error("Aktywna sesja Easy Auth należy do innego konta niż wpisany email.");
      }

      setPrincipal(next);
      setPreview(null);
      setError(undefined);
      return nextUser;
    },
    []
  );

  const logout = useCallback(() => {
    setPrincipal(null);
    setPreview(null);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.sessionStorage.setItem("maisonNoirLogoutPending", "1");
      const redirect = encodeURIComponent(frontendUrl("/auth/callback"));
      window.location.href = `${AUTH_BASE_URL}/.auth/logout?post_logout_redirect_uri=${redirect}`;
    }
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = principal?.user ?? preview;
    return {
      loading,
      principal,
      user,
      role: user?.role ?? "Guest",
      isAuthenticated: Boolean(user),
      error,
      refresh,
      register,
      login,
      loginWithCredentials,
      logout,
      previewAs: (role) => setPreview(previewUsers[role])
    };
  }, [error, loading, preview, principal, refresh, register, login, loginWithCredentials, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
