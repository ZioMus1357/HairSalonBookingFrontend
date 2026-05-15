import { asJson, request } from "./client";
import { SalonService, SalonServiceRequest } from "../types/domain";

export const servicesApi = {
  all: () => request<SalonService[]>("/api/SalonServices"),
  byId: (id: string) => request<SalonService>(`/api/SalonServices/${id}`),
  create: (body: SalonServiceRequest) => request<SalonService>("/api/SalonServices", { method: "POST", body: asJson(body) }),
  update: (id: string, body: SalonServiceRequest) => request<SalonService>(`/api/SalonServices/${id}`, { method: "PUT", body: asJson(body) }),
  remove: (id: string) => request<void>(`/api/SalonServices/${id}`, { method: "DELETE" })
};
