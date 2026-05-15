import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type RouterValue = {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  navigate: (to: string) => void;
  replace: (to: string) => void;
};

const RouterContext = createContext<RouterValue | null>(null);
const basePath = (process.env.EXPO_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

function normalizePath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (basePath && normalized.startsWith(basePath)) {
    return normalized.slice(basePath.length) || "/";
  }
  return normalized;
}

function toBrowserPath(path: string) {
  const normalized = normalizePath(path);
  return `${basePath}${normalized}`;
}

function currentPath() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const pathname = basePath && window.location.pathname.startsWith(basePath)
      ? window.location.pathname.slice(basePath.length) || "/"
      : window.location.pathname;
    return `${pathname}${window.location.search}`;
  }
  return "/";
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((to: string, mode: "push" | "replace") => {
    const next = normalizePath(to);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const browserPath = toBrowserPath(next);
      if (mode === "push") {
        window.history.pushState({}, "", browserPath);
      } else {
        window.history.replaceState({}, "", browserPath);
      }
    }
    setPath(next);
  }, []);

  const parsed = useMemo(() => {
    const [pathname, search = ""] = path.split("?");
    return { pathname: pathname || "/", query: new URLSearchParams(search) };
  }, [path]);

  const value = useMemo<RouterValue>(
    () => ({
      path: parsed.pathname,
      params: {},
      query: parsed.query,
      navigate: (to) => go(to, "push"),
      replace: (to) => go(to, "replace")
    }),
    [go, parsed]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) {
    throw new Error("useRouter must be used inside RouterProvider");
  }
  return value;
}

export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}
