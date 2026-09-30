export type ApiEnvelope<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiErrorEnvelope = {
  success: false;
  error: { code: string; message: string };
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  language: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type AuthResult = { user: User; tokens: TokenPair };

export type Farm = {
  id: string;
  name: string;
  description?: string | null;
  area_acres: number;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type FarmDashboard = {
  farm: { id: string; name: string; area_acres: number; field_count: number };
  health: { ndvi: number | null; observed_at: string | null };
  soil: Record<string, unknown> | null;
  weather: Record<string, unknown> | null;
  yield: Record<string, unknown> | null;
  disease_risk: Record<string, unknown> | null;
  irrigation: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  ai_insights: Array<Record<string, unknown>>;
};

export type FarmField = {
  id: string;
  farm_id: string;
  name: string;
  area_acres: number;
};

export type GeoFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: number[] | number[][] | number[][][] } | null;
  properties: Record<string, unknown>;
};

export type GeoFeatureCollection = { type: "FeatureCollection"; features: GeoFeature[] };

export type Alert = {
  id: string;
  category?: string;
  severity?: string;
  title?: string;
  message?: string;
  is_read: boolean;
  created_at?: string;
  farm_id?: string | null;
};