import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Repository } from 'typeorm';
import { Placex } from './entities/placex.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminLevelMapService } from './admin-level-map.service/admin-level-map.service';

@Injectable()
export class NominatimService {
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    private readonly adminLevelMapService: AdminLevelMapService,
    @InjectRepository(Placex)
    private placexRepo: Repository<Placex>,
  ) {
    const envVariable = this.configService.get<string>('NOMINATIM_URL');
    if (!envVariable) {
      throw new Error('Undefined env: NOMINATIM_URL');
    }
    this.baseUrl = envVariable;
  }

  async search(q: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { q, format: 'json' },
      });
      return response.data;
    } catch (err: any) {
      return {
        error: 'Nominatim search failed',
        details: err.message,
        hint: 'Use /nominatim/search?q=<address>, e.g. /nominatim/search?q=MG+Road+Bangalore',
      };
    }
  }

  async reverse(lat: string, lon: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params: { lat, lon, format: 'json' },
      });
      return response.data;
    } catch (err: any) {
      return {
        error: 'Nominatim reverse failed',
        details: err.message,
        hint: 'Use /nominatim/reverse?lat=<latitude>&lon=<longitude>, e.g. /nominatim/reverse?lat=12.97&lon=77.59',
      };
    }
  }

  async getAdminLevels(
    countryCode: string,
  ): Promise<Array<{ level: number; name: string }> | object> {
    try {
      const rows = await this.placexRepo
        .createQueryBuilder('placex')
        .select('DISTINCT placex.admin_level::int', 'admin_level')
        .where('placex.country_code = :country', {
          country: countryCode.toLowerCase(),
        })
        .andWhere('placex.admin_level IS NOT NULL')
        .orderBy('admin_level', 'ASC')
        .getRawMany();

      const levels = rows.map((r) => r.admin_level);

      return levels
        .map((level: number) => {
          const name = this.adminLevelMapService.getLevelName(
            countryCode,
            level,
          );

          if (!name) return null; // Sets missing levels as nulls

          return { level, name };
        })
        .filter(Boolean); // removes nulls
    } catch (err: any) {
      return {
        error: 'Admin level query failed',
        details: err.message,
        hint: 'Use /nominatim/admin-levels?country=<ISO code>. Example: /nominatim/admin-levels?country=in',
      };
    }
  }
}
