import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OverpassService {
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    const envVariable = this.configService.get<string>('OVERPASS_URL');
    if (!envVariable) {
      throw new Error('Undefined env: OVERPASS_URL');
    }
    this.baseUrl = envVariable;
  }

  private async runQuery(query: string, hint: string) {
    try {
      const response = await axios.post(this.baseUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
      });
      return response.data;
    } catch (err: any) {
      console.error(err);
      return {
        error: 'Overpass query failed',
        details: err.message,
        hint,
      };
    }
  }

  async findNodesByTagsInBBox(
    tags: Record<string, string>,
    bbox: [number, number, number, number],
  ) {
    const [south, west, north, east] = bbox;
    const tagFilters = Object.entries(tags)
      .map(([k, v]) => `["${k}"="${v}"]`)
      .join('');
    const query = `[out:json]; node${tagFilters}(${south},${west},${north},${east}); out;`;

    const hint =
      'Use /overpass/bbox with body { "tags": { "amenity": "restaurant" }, "bbox": [south, west, north, east] }. Example: [out:json]; node["amenity"="restaurant"](48.8,2.25,48.9,2.45); out;';

    return this.runQuery(query, hint);
  }

  async findNodesByTagsInArea(tags: Record<string, string>, areaName: string) {
    const tagFilters = Object.entries(tags)
      .map(([k, v]) => `["${k}"="${v}"]`)
      .join('');
    const query = `[out:json]; area["name"="${areaName}"]->.searchArea; node${tagFilters}(area.searchArea); out;`;

    const hint =
      'Use /overpass/area with body { "tags": { "amenity": "cafe" }, "areaName": "Paris" }. Example: [out:json]; area["name"="Paris"]->.searchArea; node["amenity"="cafe"](area.searchArea); out;';

    return this.runQuery(query, hint);
  }

  async postcodesByCity(
    name: string,
    options?: {
      adminLevel?: number;
      timeout?: number;
    },
  ) {
    const timeout = options?.timeout ?? 300;

    const adminFilter = options?.adminLevel
      ? `[admin_level=${options.adminLevel}]`
      : '';

    const query = `
        [out:json][timeout:${timeout}];
        area[name="${name}"][boundary=administrative]${adminFilter}->.a;
        nwr(area.a)["addr:postcode"];
        out center tags;
    `;

    const hint =
      'Use POST /overpass/postcodes with body { "name": "<city>", "adminLevel": <number>, "timeout": <number> } (adminLevel and timeout optional)';

    return this.runQuery(query, hint);
  }

  async custom(query: string) {
    const hint =
      'Use /overpass/custom with body { "query": "<valid Overpass QL>" }. Example: [out:json]; way["highway"="primary"](48.8,2.25,48.9,2.45); out;';
    return this.runQuery(query, hint);
  }
}
