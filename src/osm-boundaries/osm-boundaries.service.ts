import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, HttpException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { OsmBoundaryRaw } from './types/response-types.type';

@Injectable()
export class OsmBoundariesService {
  private baseUrl: string;
  private readonly logger = new Logger(OsmBoundariesService.name);
  private readonly cacheTtlSeconds = 60 * 60 * 24; // 24h

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const envVariable = this.configService.get<string>('OSM_BOUNDARIES_URL');
    if (!envVariable) {
      throw new Error('Undefined env: OSM_BOUNDARIES_URL');
    }
    this.baseUrl = envVariable;
  }

  private getCacheKey(name: string): string {
    return `osm-boundaries:${name.toLowerCase()}`;
  }

  /**
   * Structured file logger (Nominatim-style block logging)
   */
  private async logOsmBoundariesRequest(data: {
    endpoint: string;
    params?: any;
    cacheKey?: string;
    status: 'success' | 'error' | 'cache-hit';
    durationMs: number;
    httpStatus?: number;
    error?: string;
  }) {
    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      const logDir = path.join(process.cwd(), 'logs', 'osm-boundaries');
      await fs.promises.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, `${date}.log`);
      const separator = '='.repeat(60);

      const logBlock = `
${separator}
Timestamp: ${timestamp}
Status: ${data.status}
HTTP Status: ${data.httpStatus ?? 'N/A'}
Duration: ${data.durationMs}ms
CacheKey: ${data.cacheKey ?? 'none'}
${data.error ? `Error: ${data.error}` : ''}

Params:
${JSON.stringify(data.params, null, 2)}
${separator}

`;

      await fs.promises.appendFile(logFile, logBlock);
    } catch (err) {
      this.logger.error('Failed to write OSM-Boundaries log', err);
    }
  }

  async searchByName(name: string): Promise<OsmBoundaryRaw[]> {
    const cacheKey = this.getCacheKey(name);

    // Check cache first
    const cached = await this.cacheManager.get<OsmBoundaryRaw[]>(cacheKey);
    if (cached) {
      await this.logOsmBoundariesRequest({
        endpoint: this.baseUrl,
        params: { filterNameEn: name },
        cacheKey,
        status: 'cache-hit',
        durationMs: 0,
      });

      return cached;
    }

    const start = Date.now();

    try {
      // Call external API
      const response = await axios.get(this.baseUrl, {
        params: { filterNameEn: name },
      });

      const duration = Date.now() - start;
      const results = response.data ?? [];

      // Cache results (including empty arrays)
      await this.cacheManager.set(
        cacheKey,
        results,
        this.cacheTtlSeconds * 1000,
      );

      // Log success
      await this.logOsmBoundariesRequest({
        endpoint: this.baseUrl,
        params: { filterNameEn: name },
        cacheKey,
        status: 'success',
        durationMs: duration,
        httpStatus: response.status,
      });

      return results;
    } catch (err: any) {
      const duration = Date.now() - start;

      // Log error
      await this.logOsmBoundariesRequest({
        endpoint: this.baseUrl,
        params: { filterNameEn: name },
        cacheKey,
        status: 'error',
        durationMs: duration,
        httpStatus: err.response?.status,
        error: err.message,
      });

      throw new HttpException(
        'OSM-Boundaries request failed',
        err.response?.status || 500,
      );
    }
  }
}
