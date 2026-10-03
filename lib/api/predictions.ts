import { apiRequest } from "./client";

export const predictionsApi = {
  yieldHistory: (cycleId: string) => apiRequest<Array<Record<string, unknown>>>(`/predictions/yield/${cycleId}`),
};