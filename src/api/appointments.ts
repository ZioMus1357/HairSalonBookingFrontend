import { asJson, request } from "./client";
import { Appointment, AppointmentRequest } from "../types/domain";

export const appointmentsApi = {
  all: () => request<Appointment[]>("/api/Appointments"),
  byId: (id: string) => request<Appointment>(`/api/Appointments/${id}`),
  create: (body: AppointmentRequest) => request<Appointment>("/api/Appointments", { method: "POST", body: asJson(body) }),
  update: (id: string, body: AppointmentRequest) => request<Appointment>(`/api/Appointments/${id}`, { method: "PUT", body: asJson(body) }),
  remove: (id: string) => request<void>(`/api/Appointments/${id}`, { method: "DELETE" })
};
