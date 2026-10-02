import { apiRequest } from "./client";

export const financeApi = {
  summary: (farmId: string) => apiRequest<{ revenue: number; expenses: number; profit: number; currency: string }>(`/farms/${farmId}/finance/summary`),
};