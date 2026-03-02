export interface PlaceResult {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;

  osm_uid: string; // R123 / W123 / N123

  name?: string;
  name_en?: string;

  admin_level?: string;
  boundary?: string;

  country?: string;
  country_code?: string;
  state?: string;
  county?: string;
  city?: string;

  parent_ids?: string[];
  raw_tags?: Record<string, any>;

  source: 'overpass' | 'photon' | 'osm-boundaries';
}
