import type { Alert } from "@/types";
import { apiRequest } from "./client";

export const alertsApi = {
  list: () => apiRequest<Alert[]>("/alerts"),
  markRead: (id: string) => apiRequest<{ id: string; is_read: boolean }>(`/alerts/${id}/read`, { method: "PATCH" }),
};