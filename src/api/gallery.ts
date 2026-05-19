import * as DocumentPicker from "expo-document-picker";
import { appendFile, asJson, request } from "./client";
import { SalonPhoto, SalonPhotoRequest } from "../types/domain";

export const galleryApi = {
  all: () => request<SalonPhoto[]>("/api/SalonPhotos"),
  byId: (id: string) => request<SalonPhoto>(`/api/SalonPhotos/${id}`),
  upload: async (asset: DocumentPicker.DocumentPickerAsset, caption?: string) => {
    const form = new FormData();
    await appendFile(form, "file", asset);
    if (caption) {
      form.append("caption", caption);
    }
    return request<SalonPhoto>("/api/SalonPhotos", { method: "POST", body: form });
  },
  update: (id: string, body: SalonPhotoRequest) => request<SalonPhoto>(`/api/SalonPhotos/${id}`, { method: "PUT", body: asJson(body) }),
  remove: (id: string) => request<void>(`/api/SalonPhotos/${id}`, { method: "DELETE" })
};
