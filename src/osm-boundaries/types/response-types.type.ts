export interface OsmBoundaryRaw {
  boundary_id: string; // string, includes negative values
  name: string;
  name_en: string | null;
  boundary: string; // e.g. "local_authority"
  admin_level: number;
  parents: string[];
  parents_administrative: string[];
}
