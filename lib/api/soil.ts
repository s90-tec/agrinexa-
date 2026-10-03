import { apiRequest } from "./client";

export const soilApi = {
  readings: (fieldId: string) => apiRequest<Array<Record<string, unknown>>>(`/fields/${fieldId}/soil-readings`),
};