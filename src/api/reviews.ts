import { asJson, request } from "./client";
import { Review, ReviewRequest } from "../types/domain";

export const reviewsApi = {
  public: () => request<Review[]>("/api/Reviews/public"),
  all: () => request<Review[]>("/api/Reviews"),
  mine: () => request<Review[]>("/api/Reviews/me"),
  create: (body: ReviewRequest) => request<Review>("/api/Reviews", { method: "POST", body: asJson(body) }),
  byId: (id: string) => request<Review>(`/api/Reviews/${id}`),
  hide: (id: string) => request<Review>(`/api/Reviews/${id}/hide`, { method: "PATCH" }),
  show: (id: string) => request<Review>(`/api/Reviews/${id}/show`, { method: "PATCH" }),
  remove: (id: string) => request<void>(`/api/Reviews/${id}`, { method: "DELETE" })
};
