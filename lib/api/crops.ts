import { apiRequest } from "./client";

export type CropCycle = {
  id: string;
  field_id: string;
  crop_name: string;
  growth_stage?: string | null;
  status: string;
  area_acres: number;
  expected_harvest_date?: string | null;
};

export const cropsApi = {
  cycles: (fieldId?: string) => apiRequest<CropCycle[]>(`/crop-cycles${fieldId ? `?field_id=${encodeURIComponent(fieldId)}` : ""}`),
};