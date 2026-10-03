import type { Farm, FarmDashboard, FarmField, GeoFeatureCollection } from "@/types";
import { apiRequest, jsonBody } from "./client";

export const farmsApi = {
  list: () => apiRequest<Farm[]>("/farms"),
  get: (farmId: string) => apiRequest<Farm>(`/farms/${farmId}`),
  dashboard: (farmId: string) => apiRequest<FarmDashboard>(`/farms/${farmId}/dashboard`),
  healthMap: (farmId: string) => apiRequest<GeoFeatureCollection>(`/gis/farms/${farmId}/health-map`),
  create: (input: Pick<Farm, "name" | "area_acres" | "location_name" | "description" | "latitude" | "longitude">) =>
    apiRequest<Farm>("/farms", { method: "POST", body: jsonBody(input) }),
  update: (farmId: string, input: Partial<Farm>) =>
    apiRequest<Farm>(`/farms/${farmId}`, { method: "PATCH", body: jsonBody(input) }),
  remove: (farmId: string) => apiRequest<null>(`/farms/${farmId}`, { method: "DELETE" }),
  fields: (farmId: string) => apiRequest<FarmField[]>(`/fields?farm_id=${encodeURIComponent(farmId)}`),
};