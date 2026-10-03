import type { GeoFeatureCollection } from "@/types";
import { apiRequest } from "./client";

export const gisApi = {
  healthMap: (farmId: string) => apiRequest<GeoFeatureCollection>(`/gis/farms/${farmId}/health-map`),
  index: (farmId: string, index: "ndvi" | "evi" | "ndwi" | "stress-zones") =>
    apiRequest<Array<Record<string, unknown>>>(`/gis/farms/${farmId}/${index}`),
};