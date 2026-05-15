import * as DocumentPicker from "expo-document-picker";
import { appendFile, request } from "./client";
import { SalonPhoto } from "../types/domain";

export const galleryApi = {
  all: () => request<SalonPhoto[]>("/api/SalonPhotos"),
  byId: (id: string) => request<SalonPhoto>(`/api/SalonPhotos/${id}`),
  upload: (asset: DocumentPicker.DocumentPickerAsset, caption?: string) => {
    const form = new FormData();
    appendFile(form, "file", asset);
    if (caption) {
      form.append("caption", caption);
    }
    return request<SalonPhoto>("/api/SalonPhotos", { method: "POST", body: form });
  },
  remove: (id: string) => request<void>(`/api/SalonPhotos/${id}`, { method: "DELETE" })
};
