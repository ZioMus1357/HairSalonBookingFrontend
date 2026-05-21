import { ApiError, asJson, AUTH_BASE_URL, request } from "./client";
import { AppUser, AuthMe } from "../types/domain";

type MobileEasyAuthSession = {
  authenticationToken?: string;
};

export const authApi = {
  me: () => request<AuthMe>("/api/Auth/me"),
  register: (displayName?: string, email?: string) =>
    request<AppUser>("/api/Auth/register", {
      method: "POST",
      body: asJson({ displayName, email })
    }),
  headers: () => request<Record<string, unknown>>("/api/Auth/headers"),
  googleMobileLogin: async (idToken: string) => {
    const response = await fetch(`${AUTH_BASE_URL}/.auth/login/google`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: asJson({ id_token: idToken }),
    });

    const payload = (await response.json().catch(() => null)) as MobileEasyAuthSession | { error?: string } | null;
    if (!response.ok) {
      const message = payload && "error" in payload && payload.error ? payload.error : `${response.status} ${response.statusText}`;
      throw new ApiError(message, response.status);
    }

    if (!payload || !("authenticationToken" in payload) || !payload.authenticationToken) {
      throw new Error("Azure Easy Auth nie zwrócił tokenu sesji dla logowania Google.");
    }

    return payload.authenticationToken;
  },
};
