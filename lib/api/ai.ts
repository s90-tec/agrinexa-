import { apiRequest, jsonBody } from "./client";

export const aiApi = {
  irrigation: (field_id: string) => apiRequest<Record<string, unknown>>("/ai/irrigation-recommendation", { method: "POST", body: jsonBody({ field_id }) }),
  yieldPrediction: (input: { crop_cycle_id: string; features: Record<string, number>; expected_harvest?: string }) =>
    apiRequest<Record<string, unknown>>("/ai/yield-prediction", { method: "POST", body: jsonBody(input) }),
  disease: (fieldId: string, crop: string, image: File) => {
    const body = new FormData();
    body.set("field_id", fieldId);
    body.set("crop", crop);
    body.set("image", image);
    return apiRequest<Record<string, unknown>>("/ai/disease-detection", { method: "POST", body });
  },
};