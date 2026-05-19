import { asJson, request } from "./client";
import { AppUser, Appointment, Customer, Hairdresser, SalonPhoto, SalonService, UserRole } from "../types/domain";

export const adminApi = {
  users: () => request<AppUser[]>("/api/Admin/users"),
  customers: () => request<Customer[]>("/api/Admin/customers"),
  hairdressers: () => request<Hairdresser[]>("/api/Admin/hairdressers"),
  services: () => request<SalonService[]>("/api/Admin/services"),
  salonPhotos: () => request<SalonPhoto[]>("/api/Admin/salon-photos"),
  appointments: () => request<Appointment[]>("/api/Admin/appointments"),
  assignRole: (userId: string, role: UserRole, customerId?: string, hairdresserId?: string) =>
    request<AppUser>(`/api/Admin/users/${userId}/role`, {
      method: "PUT",
      body: asJson({ role, customerId, hairdresserId })
    })
};
