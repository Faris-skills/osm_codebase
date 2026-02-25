export function escaper(value: string): string {
  return value.replace(/"/g, '\\"');
}

export function buildTagFilters(tags: Record<string, string>): string {
  return Object.entries(tags)
    .map(([k, v]) => `["${escaper(k)}"="${escaper(v)}"]`)
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
