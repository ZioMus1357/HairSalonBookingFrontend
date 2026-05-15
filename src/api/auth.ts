import { asJson, request } from "./client";
import { AppUser, AuthMe } from "../types/domain";

export const authApi = {
  me: () => request<AuthMe>("/api/Auth/me"),
  register: (displayName?: string, email?: string) =>
    request<AppUser>("/api/Auth/register", {
      method: "POST",
      body: asJson({ displayName, email })
    }),
  headers: () => request<Record<string, unknown>>("/api/Auth/headers")
};
