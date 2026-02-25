export interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

export type NominatimSearchResponse = NominatimSearchResult[];

export interface NominatimReverseResponse {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, any>;
}

export interface AdminLevelResponse {
  level: number;
  name: string;
}
