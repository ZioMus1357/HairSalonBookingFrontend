import { asJson, request } from "./client";
import { Appointment, Customer, CustomerRequest } from "../types/domain";

export const customersApi = {
  all: () => request<Customer[]>("/api/Customers"),
  byId: (id: string) => request<Customer>(`/api/Customers/${id}`),
  me: () => request<Customer>("/api/Customers/me"),
  myAppointments: () => request<Appointment[]>("/api/Customers/me/appointments"),
  create: (body: CustomerRequest) => request<Customer>("/api/Customers", { method: "POST", body: asJson(body) }),
  update: (id: string, body: CustomerRequest) => request<Customer>(`/api/Customers/${id}`, { method: "PUT", body: asJson(body) }),
  updateMe: (body: CustomerRequest) => request<Customer>("/api/Customers/me", { method: "PUT", body: asJson(body) }),
  remove: (id: string) => request<void>(`/api/Customers/${id}`, { method: "DELETE" })
};
