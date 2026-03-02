export interface PoiResult {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  osm_uid: string;

  name?: string;

  brand?: string;
  amenity?: string;
  cuisine?: string;
  wikidata?: string;

  country?: string;
  state?: string;
  country_code?: string;

  source: 'overpass' | 'photon';
}
