import { asJson, request } from "./client";
import { AppUser, Appointment, Customer, Hairdresser, UserRole } from "../types/domain";

export const adminApi = {
  users: () => request<AppUser[]>("/api/Admin/users"),
  customers: () => request<Customer[]>("/api/Admin/customers"),
  hairdressers: () => request<Hairdresser[]>("/api/Admin/hairdressers"),
  appointments: () => request<Appointment[]>("/api/Admin/appointments"),
  assignRole: (userId: string, role: UserRole, customerId?: string, hairdresserId?: string) =>
    request<AppUser>(`/api/Admin/users/${userId}/role`, {
      method: "PUT",
      body: asJson({ role, customerId, hairdresserId })
    })
};
