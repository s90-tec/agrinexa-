import type { Alert } from "@/types";
import { apiRequest, jsonBody } from "./client";

export const domainApi = {
  alerts: () => apiRequest<Alert[]>("/alerts"),
  markAlertRead: (id: string) => apiRequest<{ id: string; is_read: boolean }>(`/alerts/${id}/read`, { method: "PATCH" }),
  weather: (farmId: string) => apiRequest<Record<string, unknown>>(`/weather/farms/${farmId}/current`),
  forecast: (farmId: string) => apiRequest<Array<Record<string, unknown>>>(`/weather/farms/${farmId}/forecast`),
  finance: (farmId: string) => apiRequest<{ revenue: number; expenses: number; profit: number; currency: string }>(`/farms/${farmId}/finance/summary`),
  index: (farmId: string, type: "ndvi" | "evi" | "ndwi" | "stress-zones") =>
    apiRequest<Array<Record<string, unknown>>>(`/gis/farms/${farmId}/${type}`),
  ask: (farm_id: string, question: string) =>
    apiRequest<Record<string, unknown>>("/assistant/chat", { method: "POST", body: jsonBody({ farm_id, question }) }),
  recommendIrrigation: (field_id: string, flow_liters_per_minute?: number) =>
    apiRequest<Record<string, unknown>>("/ai/irrigation-recommendation", { method: "POST", body: jsonBody({ field_id, flow_liters_per_minute }) }),
  scheduleIrrigation: (input: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/irrigation/schedule", { method: "POST", body: jsonBody(input) }),
  irrigationHistory: (fieldId: string) => apiRequest<Array<Record<string, unknown>>>(`/irrigation/${fieldId}`),
  analyzeDisease: (fieldId: string, crop: string, image: File) => {
    const body = new FormData();
    body.set("field_id", fieldId);
    body.set("crop", crop);
    body.set("image", image);
    return apiRequest<Record<string, unknown>>("/ai/disease-detection", { method: "POST", body });
  },
  predictYield: (input: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>("/ai/yield-prediction", { method: "POST", body: jsonBody(input) }),
};