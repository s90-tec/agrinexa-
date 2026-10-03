import { apiRequest, jsonBody } from "./client";

export const irrigationApi = {
  history: (fieldId: string) => apiRequest<Array<Record<string, unknown>>>(`/irrigation/${fieldId}`),
  schedule: (input: { field_id: string; scheduled_at: string; recommended_duration: number; estimated_water: number }) =>
    apiRequest<Record<string, unknown>>("/irrigation/schedule", { method: "POST", body: jsonBody(input) }),
};