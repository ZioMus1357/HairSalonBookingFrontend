import { request } from "./client";

export const notificationsApi = {
  test: () => request<Record<string, unknown>>("/api/Notifications/test", { method: "POST" })
};
