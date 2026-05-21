import { asJson, request } from "./client";
import { AppUser, Appointment, AssignUserRoleRequest, Customer, Hairdresser, Review, SalonPhoto, SalonService } from "../types/domain";

export const adminApi = {
  users: () => request<AppUser[]>("/api/Admin/users"),
  customers: () => request<Customer[]>("/api/Admin/customers"),
  hairdressers: () => request<Hairdresser[]>("/api/Admin/hairdressers"),
  services: () => request<SalonService[]>("/api/Admin/services"),
  salonPhotos: () => request<SalonPhoto[]>("/api/Admin/salon-photos"),
  appointments: () => request<Appointment[]>("/api/Admin/appointments"),
  reviews: () => request<Review[]>("/api/Admin/reviews"),
  assignRole: (userId: string, body: AssignUserRoleRequest) =>
    request<AppUser>(`/api/Admin/users/${userId}/role`, {
      method: "PUT",
      body: asJson(body)
    }),
  removeUser: (userId: string) => request<void>(`/api/Admin/users/${userId}`, { method: "DELETE" })
};
