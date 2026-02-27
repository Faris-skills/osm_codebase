export type PlaceSource = 'overpass' | 'osm-boundaries';

export interface PlaceResult {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: string | number;
  osm_uid: string; // R123 / W123 / N123

  name?: string;
  name_en?: string;
  admin_level?: string;
  boundary?: string;

  parent_ids?: string[];

  raw_tags?: Record<string, any>; // only for overpass
  source: 'overpass' | 'osm-boundaries';
}
