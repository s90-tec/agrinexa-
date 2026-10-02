import { apiRequest } from "./client";

export const weatherApi = {
  current: (farmId: string) => apiRequest<Record<string, unknown>>(`/weather/farms/${farmId}/current`),
  forecast: (farmId: string) => apiRequest<Array<Record<string, unknown>>>(`/weather/farms/${farmId}/forecast`),
};