export interface PhotonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    osm_id: number;
    osm_type: 'N' | 'W' | 'R';
    osm_key?: string;
    osm_value?: string;

    type?: string;

    name?: string;
    country?: string;
    countrycode?: string;
    state?: string;
    county?: string;
    city?: string;

    [key: string]: any;
  };
}

export interface PhotonSearchResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}
