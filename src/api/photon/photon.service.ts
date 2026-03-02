import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Cache } from 'cache-manager';
import { LoggerService } from 'src/shared/logger/logger.service';
import { PhotonFeature } from '../types/photon-response.type';

@Injectable()
export class PhotonService {
  private baseUrl: string;
  private readonly DEFAULT_TTL = 60 * 60; // 1 hour

  constructor(
    private configService: ConfigService,
    private readonly apiLogger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const envVariable = this.configService.get<string>('PHOTON_URL');
    if (!envVariable) {
      throw new Error('Undefined env: PHOTON_URL');
    }
    this.baseUrl = envVariable;
  }

  private buildCacheKey(name: string, limit: number) {
    const normalized_name = name.trim().toLowerCase().replace(/\s+/g, ' ');
    return `photon:search:${normalized_name}:${limit}`;
  }

  async search(name: string, limit = 5): Promise<PhotonFeature[]> {
    const start = Date.now();
    const cacheKey = this.buildCacheKey(name, limit);

    try {
      // Check cache
      const cached = await this.cacheManager.get<PhotonFeature[]>(cacheKey);
      if (cached) {
        await this.apiLogger.log({
          provider: 'photon',
          action: 'search',
          status: 'cache-hit',
          durationMs: Date.now() - start,
          endpoint: this.baseUrl,
          query: name,
        });

        return cached;
      }

      // Fetch from Photon
      const response = await axios.get(this.baseUrl, {
        params: { q: name, limit },
      });

      const features = response.data?.features ?? [];

      // Store in cache
      await this.cacheManager.set(cacheKey, features, this.DEFAULT_TTL);

      await this.apiLogger.log({
        provider: 'photon',
        action: 'search',
        status: 'success',
        durationMs: Date.now() - start,
        endpoint: this.baseUrl,
        query: name,
        response: features.map((f) => ({
          osm_type: f.properties?.osm_type,
          osm_id: f.properties?.osm_id,
          osm_key: f.properties?.osm_key,
          osm_value: f.properties?.osm_value,
          type: f.properties?.type,
          countrycode: f.properties?.countrycode,
          name: f.properties?.name,
          state: f.properties?.state,
          country: f.properties?.country,
        })),
      });

      return features;
    } catch (err: any) {
      await this.apiLogger.log({
        provider: 'photon',
        action: 'search',
        status: 'error',
        durationMs: Date.now() - start,
        endpoint: this.baseUrl,
        query: name,
        error: err.message,
      });

      throw new HttpException('Photon search failed', HttpStatus.BAD_GATEWAY);
    }
  }
}
