import type { AuthResult, TokenPair, User } from "@/types";
import { apiRequest, jsonBody } from "./client";

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<AuthResult>("/auth/login", { method: "POST", body: jsonBody({ email, password }) });
  },
  signup(input: { name: string; email: string; phone?: string; password: string }) {
    return apiRequest<AuthResult>("/auth/register", { method: "POST", body: jsonBody(input) });
  },
  refresh(refresh_token: string) {
    return apiRequest<TokenPair>("/auth/refresh", { method: "POST", body: jsonBody({ refresh_token }) });
  },
  me() {
    return apiRequest<User>("/auth/me");
  },
  logout(refresh_token: string) {
    return apiRequest<null>("/auth/logout", { method: "POST", body: jsonBody({ refresh_token }) });
  },
};