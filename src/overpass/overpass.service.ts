import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  buildTagFilters,
  escaper,
  validateBBox,
} from 'src/shared/overpass-formatter';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OverpassService {
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const envVariable = this.configService.get<string>('OVERPASS_URL');
    if (!envVariable) {
      throw new Error('Undefined env: OVERPASS_URL');
    }
    this.baseUrl = envVariable;
  }

  private async logOverpassRequest(data: {
    query: string;
    cacheKey?: string;
    status: 'success' | 'error' | 'cache-hit';
    durationMs: number;
    error?: string;
  }) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const timestamp = now.toISOString();

    const logDir = path.join(process.cwd(), 'logs', 'overpass');
    await fs.promises.mkdir(logDir, { recursive: true });

    const logFile = path.join(logDir, `${date}.log`);

    const separator = '='.repeat(50);

    const logBlock = `
${separator}
Timestamp: ${timestamp}
Status: ${data.status}
Duration: ${data.durationMs}ms
CacheKey: ${data.cacheKey ?? 'none'}
${data.error ? `Error: ${data.error}` : ''}

Quoted Query: ${JSON.stringify(data.query) + '\n'}
Raw Query:
    ${data.query.trim()}
${separator}
    `;

    await fs.promises.appendFile(logFile, logBlock);
  }

  private async runQuery(
    query: string,
    hint: string,
    cacheKey?: string,
    ttl = 3600,
  ) {
    const start = Date.now();

    try {
      if (cacheKey) {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          await this.logOverpassRequest({
            query,
            cacheKey,
            status: 'cache-hit',
            durationMs: Date.now() - start,
          });
          return cached;
        }
      }

      const response = await axios.post(this.baseUrl, query, {
        headers: { 'Content-Type': 'text/plain' },
      });

      const data = response.data;

      // Detect Overpass internal runtime errors
      if (data?.remark) {
        const remark = data.remark as string;

        let improvedHint = hint;

        if (remark.includes('out of memory')) {
          improvedHint =
            'Query exceeded Overpass memory limits. Try reducing area size, adding more tag filters, or lowering timeout.';
        } else if (remark.includes('timeout')) {
          improvedHint =
            'Query timed out. Try reducing the search area or increasing specificity.';
        } else if (remark.includes('parse error')) {
          improvedHint =
            'Invalid Overpass QL syntax. Verify query structure and filters.';
        }

        await this.logOverpassRequest({
          query,
          cacheKey,
          status: 'error',
          durationMs: Date.now() - start,
          error: remark,
        });

        throw new BadRequestException({
          error: 'Overpass runtime error',
          details: remark,
          hint: improvedHint,
        });
      }

      if (cacheKey) {
        await this.cacheManager.set(cacheKey, data, ttl);
      }

      await this.logOverpassRequest({
        query,
        cacheKey,
        status: 'success',
        durationMs: Date.now() - start,
      });

      return data;
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }

      await this.logOverpassRequest({
        query,
        cacheKey,
        status: 'error',
        durationMs: Date.now() - start,
        error: err.response?.data ?? err.message,
      });

      if (err.response) {
        throw new InternalServerErrorException({
          error: 'Overpass HTTP error',
          details: err.response.statusText,
          hint,
        });
      }

      throw new InternalServerErrorException({
        error: 'Overpass query failed',
        details: err.message,
        hint,
      });
    }
  }

  async findNodesByTagsInBBox(
    tags: Record<string, string>,
    bbox: [number, number, number, number],
    timeout = 180,
  ) {
    validateBBox(bbox);

    const [south, west, north, east] = bbox;
    const tagFilters = buildTagFilters(tags);

    const query = `
        [out:json][timeout:${timeout}];
        node${tagFilters}(${south},${west},${north},${east});
        out;
    `;

    const normalizedTags = Object.keys(tags)
      .sort()
      .map((k) => `${k}:${tags[k]}`)
      .join('|');
    const cacheKey = `bbox:${normalizedTags}:${bbox.join(',')}`;

    const hint =
      'Use POST /overpass/bbox with body { "tags": { "key": "value" }, "bbox": [south, west, north, east], "timeout": <number> } (timeout optional)';

    return this.runQuery(query, hint, cacheKey);
  }

  async findNodesByTagsInArea(
    tags: Record<string, string>,
    areaName: string,
    options?: {
      adminLevel?: number;
      timeout?: number;
    },
  ) {
    const timeout = options?.timeout ?? 180;
    const safeName = escaper(areaName);

    // ----------------- AREA QUERY -----------------
    let areaQuery = '';

    if (options?.adminLevel) {
      areaQuery = `
        area["name"="${safeName}"]["boundary"="administrative"]
        ["admin_level"="${options.adminLevel}"]->.a;
        `;
    } else {
      areaQuery = `
        (
            area["name"="${safeName}"]["boundary"="administrative"]["admin_level"="8"];
            area["name"="${safeName}"]["boundary"="administrative"]["admin_level"="6"];
            area["name"="${safeName}"]["boundary"="administrative"]["admin_level"="4"];
        )->.a;
        `;
    }

    // ----------------- ELEMENT QUERY -----------------
    let elementQueries = '';
    const tagEntries = Object.entries(tags);

    if (tagEntries.length === 1 && tagEntries[0][0] === 'name') {
      const safeValue = escaper(tagEntries[0][1]);
      const normalized = safeValue.replace(/['’]/g, '');

      elementQueries = `
        node["name"~"${safeValue}", i](area.a);
        node["brand"~"${safeValue}", i](area.a);
        node["brand"~"${normalized}", i](area.a);

        way["name"~"${safeValue}", i](area.a);
        way["brand"~"${safeValue}", i](area.a);
        way["brand"~"${normalized}", i](area.a);

        relation["name"~"${safeValue}", i](area.a);
        relation["brand"~"${safeValue}", i](area.a);
        relation["brand"~"${normalized}", i](area.a);
      `;
    } else {
      const tagFilterBlock = tagEntries
        .map(([key, value]) => `["${key}"="${escaper(value)}"]`)
        .join('');
      elementQueries = `
        node${tagFilterBlock}(area.a);
        way${tagFilterBlock}(area.a);
        relation${tagFilterBlock}(area.a);
      `;
    }

    const query = `
        [out:json][timeout:${timeout}];
        ${areaQuery}
        (
        ${elementQueries}
        );
        out center;
    `;

    const normalizedTags = Object.keys(tags)
      .sort()
      .map((k) => `${k}:${tags[k]}`)
      .join('|');

    const cacheKey = `area:${safeName}:${normalizedTags}:${options?.adminLevel ?? 'auto'}`;

    const hint =
      'Use POST /overpass/area with body { "tags": { "key": "value" }, "areaName": "<name>", "adminLevel": <number>, "timeout": <number> }';

    return this.runQuery(query, hint, cacheKey);
  }

  async postcodesByCity(
    name: string,
    options?: {
      adminLevel?: number;
      timeout?: number;
    },
  ) {
    const timeout = options?.timeout ?? 300;
    const safeName = escaper(name);

    let areaQuery: string;

    if (options?.adminLevel) {
      areaQuery = `
      area["name"="${safeName}"]["boundary"="administrative"]
      ["admin_level"="${options.adminLevel}"]->.a;
    `;
    } else {
      areaQuery = `
      (
        area["name"="${safeName}"]["boundary"="administrative"]["admin_level"="8"];
        area["name"="${safeName}"]["boundary"="administrative"]["admin_level"="6"];
        area["name"="${safeName}"]["boundary"="administrative"]["admin_level"="4"];
      )->.a;
    `;
    }

    const query = `
        [out:json][timeout:${timeout}];
        ${areaQuery}
        nwr(area.a)["addr:postcode"];
        out center tags;
    `;

    const cacheKey = `postcodes:${safeName}:${options?.adminLevel ?? 'auto'}`;

    const hint =
      'Use POST /overpass/postcodes with body { "name": "<city>", "adminLevel": <number>, "timeout": <number> } (adminLevel and timeout optional)';

    return this.runQuery(query, hint, cacheKey, 3600);
  }

  async custom(query: string) {
    const hint =
      'Use /overpass/custom with body { "query": "<valid Overpass QL>" }. Example: [out:json]; way["highway"="primary"](48.8,2.25,48.9,2.45); out;';
    return this.runQuery(query, hint);
  }
}
