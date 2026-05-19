import * as DocumentPicker from "expo-document-picker";
import { ApiError, appendFile, asJson, request } from "./client";
import { Appointment, Hairdresser, HairdresserCustomerHistory, HairdresserRequest } from "../types/domain";

export const hairdressersApi = {
  all: () => request<Hairdresser[]>("/api/Hairdressers"),
  byId: (id: string) => request<Hairdresser>(`/api/Hairdressers/${id}`),
  create: (body: HairdresserRequest) => request<Hairdresser>("/api/Hairdressers", { method: "POST", body: asJson(body) }),
  update: (id: string, body: HairdresserRequest) => request<Hairdresser>(`/api/Hairdressers/${id}`, { method: "PUT", body: asJson(body) }),
  remove: (id: string) => request<void>(`/api/Hairdressers/${id}`, { method: "DELETE" }),
  availability: (id: string, day: string) => request<string[]>(`/api/Hairdressers/${id}/availability/${day}`),
  myAppointments: () => request<Appointment[]>("/api/Hairdressers/me/appointments"),
  customerHistory: async (customerId: string) => {
    try {
      return await request<HairdresserCustomerHistory>(`/api/Hairdressers/me/customers/${customerId}/history`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return request<HairdresserCustomerHistory>(`/api/Hairdressers/me/customers/${customerId}/my-history`);
      }
      throw error;
    }
  },
  uploadPhoto: async (id: string, asset: DocumentPicker.DocumentPickerAsset) => {
    const form = new FormData();
    await appendFile(form, "file", asset);
    return request<Hairdresser>(`/api/Hairdressers/${id}/photo`, { method: "POST", body: form });
  }
};
