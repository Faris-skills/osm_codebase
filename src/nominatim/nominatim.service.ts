import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Repository } from 'typeorm';
import { Placex } from './entities/placex.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminLevelMapService } from './admin-level-map.service/admin-level-map.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NominatimService {
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly adminLevelMapService: AdminLevelMapService,
    @InjectRepository(Placex)
    private placexRepo: Repository<Placex>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const envVariable = this.configService.get<string>('NOMINATIM_URL');
    if (!envVariable) {
      throw new Error('Undefined env: NOMINATIM_URL');
    }
    this.baseUrl = envVariable;
  }

  private async logNominatimRequest(data: {
    endpoint: string;
    params?: any;
    cacheKey?: string;
    status: 'success' | 'error' | 'cache-hit';
    durationMs: number;
    error?: string;
  }) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const timestamp = now.toISOString();

    const logDir = path.join(process.cwd(), 'logs', 'nominatim');
    await fs.promises.mkdir(logDir, { recursive: true });

    const logFile = path.join(logDir, `${date}.log`);
    const separator = '='.repeat(50);

    const logBlock = `
${separator}
Timestamp: ${timestamp}
Endpoint: ${data.endpoint}
Status: ${data.status}
Duration: ${data.durationMs}ms
CacheKey: ${data.cacheKey ?? 'none'}
${data.error ? `Error: ${data.error}` : ''}

Params:
${JSON.stringify(data.params, null, 2)}
${separator}
    `;

    await fs.promises.appendFile(logFile, logBlock);
  }

  private async runRequest(
    endpoint: string,
    params: any,
    hint: string,
    cacheKey?: string,
    ttl = 3600,
  ) {
    const start = Date.now();

    try {
      if (cacheKey) {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          await this.logNominatimRequest({
            endpoint,
            params,
            cacheKey,
            status: 'cache-hit',
            durationMs: Date.now() - start,
          });
          return cached;
        }
      }

      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        params,
        timeout: 30_000,
      });

      if (cacheKey) {
        await this.cacheManager.set(cacheKey, response.data, ttl);
      }

      await this.logNominatimRequest({
        endpoint,
        params,
        cacheKey,
        status: 'success',
        durationMs: Date.now() - start,
      });

      return response.data;
    } catch (err: any) {
      await this.logNominatimRequest({
        endpoint,
        params,
        cacheKey,
        status: 'error',
        durationMs: Date.now() - start,
        error: err.response?.data ?? err.message,
      });

      if (err instanceof HttpException) {
        throw err;
      }

      throw new InternalServerErrorException({
        error: 'Nominatim request failed',
        details: err.response?.data ?? err.message,
        hint,
      });
    }
  }

  async search(q: string) {
    const normalizedQ = q.trim();
    const cacheKey = `search:${normalizedQ.toLowerCase()}`;

    const hint =
      'Use GET /nominatim/search?q=<search string>, e.g. /nominatim/search?q=MG+Road+Bangalore';

    return this.runRequest(
      'search',
      { q: normalizedQ, format: 'json' },
      hint,
      cacheKey,
      3600,
    );
  }

  async reverse(lat: string, lon: string) {
    const cacheKey = `reverse:${lat}:${lon}`;

    const hint =
      'Use GET /nominatim/reverse?lat=<latitude>&lon=<longitude>, e.g. /nominatim/reverse?lat=12.97&lon=77.59';

    return this.runRequest(
      'reverse',
      { lat, lon, format: 'json' },
      hint,
      cacheKey,
      3600,
    );
  }

  async getAdminLevels(
    countryCode: string,
  ): Promise<Array<{ level: number; name: string }>> {
    const start = Date.now();
    const normalizedCountry = countryCode.toLowerCase();

    try {
      const rows = await this.placexRepo
        .createQueryBuilder('placex')
        .select('DISTINCT placex.admin_level::int', 'admin_level')
        .where('placex.country_code = :country', {
          country: normalizedCountry,
        })
        .andWhere('placex.admin_level IS NOT NULL')
        .orderBy('admin_level', 'ASC')
        .getRawMany();

      const levels = rows.map((r) => r.admin_level);

      const result = levels
        .map((level: number) => {
          const name = this.adminLevelMapService.getLevelName(
            countryCode,
            level,
          );
          if (!name) return null;
          return { level, name };
        })
        .filter((x): x is { level: number; name: string } => x !== null);

      await this.logNominatimRequest({
        endpoint: 'admin-levels',
        params: { countryCode },
        status: 'success',
        durationMs: Date.now() - start,
      });

      return result;
    } catch (err: any) {
      await this.logNominatimRequest({
        endpoint: 'admin-levels',
        params: { countryCode },
        status: 'error',
        durationMs: Date.now() - start,
        error: err.message,
      });

      throw new InternalServerErrorException({
        error: 'Admin level query failed',
        details: err.message,
        hint: 'Use GET /nominatim/admin-levels?country=<ISO2>, e.g. /nominatim/admin-levels?country=in',
      });
    }
  }
}
