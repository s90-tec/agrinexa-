import type { FarmField } from "@/types";
import { apiRequest, jsonBody } from "./client";

export const fieldsApi = {
  list: (farmId: string) => apiRequest<FarmField[]>(`/fields?farm_id=${encodeURIComponent(farmId)}`),
  create: (input: { farm_id: string; name: string; area_acres: number; soil_type?: string }) =>
    apiRequest<FarmField>("/fields", { method: "POST", body: jsonBody(input) }),
};