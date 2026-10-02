import { apiRequest, jsonBody } from "./client";

export const assistantApi = {
  chat: (farm_id: string, question: string) => apiRequest<{ answer: string; context: Record<string, unknown>; question: string }>("/assistant/chat", { method: "POST", body: jsonBody({ farm_id, question }) }),
};