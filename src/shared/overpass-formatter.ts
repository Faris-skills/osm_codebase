export function escape(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function buildTagFilters(tags: Record<string, string>): string {
  return Object.entries(tags)
    .map(([k, v]) => `["${this.escape(k)}"="${this.escape(v)}"]`)
    .join('');
}

export function validateBBox(bbox: [number, number, number, number]) {
  const [south, west, north, east] = bbox;

  if (
    south < -90 ||
    north > 90 ||
    west < -180 ||
    east > 180 ||
    south >= north ||
    west >= east
  ) {
    throw new Error('Invalid bounding box');
  }
}
