import { OverpassResponse } from 'src/overpass/types/response-types.types';
import { PlaceResult } from '../api/types/place-boundary.type';
import { OsmBoundaryRaw } from 'src/osm-boundaries/types/response-types.type';

export function normalizeOverpassResponse(
  data: OverpassResponse,
): PlaceResult[] {
  if (!data?.elements?.length) return [];

  return data.elements.map((el: any) => {
    let osm_type: 'node' | 'way' | 'relation';
    let osm_id: number;

    if (el.type === 'area') {
      // Overpass area IDs = 3600000000 + relationId
      osm_type = 'relation';
      osm_id = Number(el.id) - 3600000000;
    } else {
      osm_type = el.type;
      osm_id = Number(el.id);
    }

    return {
      osm_type,
      osm_id,
      osm_uid: buildOsmUid(osm_type, osm_id),

      name: el.tags?.name,
      admin_level: el.tags?.admin_level,
      boundary: el.tags?.boundary,
      raw_tags: el.tags,

      source: 'overpass',
    };
  });
}

export function normalizeOsmBoundariesResponse(
  data: OsmBoundaryRaw[],
): PlaceResult[] {
  if (!Array.isArray(data)) return [];

  return data.map((el) => {
    const osm_type: 'relation' = 'relation';
    const osm_id = Math.abs(Number(el.boundary_id));

    return {
      osm_type,
      osm_id,
      osm_uid: buildOsmUid(osm_type, osm_id),

      name: el.name,
      admin_level: String(el.admin_level),
      boundary: el.boundary,
      parent_ids: el.parents_administrative ?? el.parents ?? [],

      source: 'osm-boundaries',
    };
  });
}

function buildOsmUid(type: 'node' | 'way' | 'relation', id: number): string {
  const prefix = type === 'relation' ? 'R' : type === 'way' ? 'W' : 'N';

  return `${prefix}${id}`;
}
