import { Injectable, Logger } from '@nestjs/common';
import { PlaceResult } from './types/place-boundary.type';
import { OverpassService } from 'src/overpass/overpass.service';
import { PhotonService } from './photon/photon.service';
import { LoggerService } from 'src/shared/logger/logger.service';
import {
  OverpassElement,
  OverpassResponse,
} from 'src/overpass/types/response-types.types';
import { PoiResult } from './types/poi-response.type';
import { AdminLevelMapService } from 'src/nominatim/admin-level-map.service/admin-level-map.service';

@Injectable()
export class ApiService {
  constructor(
    private readonly photonService: PhotonService,
    private readonly overpassService: OverpassService,
    private readonly apiLogger: LoggerService,
    private readonly adminLevelMappingService: AdminLevelMapService,
  ) {}

  async get_place_list(name: string, timeout?: number): Promise<PlaceResult[]> {
    const start = Date.now();

    try {
      const features = await this.photonService.search(name, 5);
      if (!features.length) return [];

      const relationIds = features
        .filter((f) => f.properties.osm_type === 'R')
        .map((f) => f.properties.osm_id);

      let overpassMap = new Map<number, OverpassElement>();

      if (relationIds.length) {
        try {
          const overpassRaw: OverpassResponse =
            await this.overpassService.fetchRelationsByIds(
              relationIds,
              timeout,
            );

          for (const el of overpassRaw.elements ?? []) {
            overpassMap.set(el.id, el);
          }
        } catch {
          // Overpass failure should NOT kill search
        }
      }

      // Build results from Photon base
      const results: PlaceResult[] = features.map((f) => {
        const overpassEl = overpassMap.get(f.properties.osm_id);

        const osmTypeMap: Record<string, 'node' | 'way' | 'relation'> = {
          N: 'node',
          W: 'way',
          R: 'relation',
        };

        return {
          osm_type: osmTypeMap[f.properties.osm_type],
          osm_id: f.properties.osm_id,
          osm_uid: `${f.properties.osm_type}${f.properties.osm_id}`,

          // Prefer Overpass data if available
          name: overpassEl?.tags?.name ?? f.properties.name,
          name_en: overpassEl?.tags?.name_en,
          admin_level: overpassEl?.tags?.admin_level,
          // admin_level_mapping:
          //   f.properties.countrycode && overpassEl?.tags?.admin_level
          //     ? this.adminLevelMappingService.getLevelName(
          //         f.properties.countrycode,
          //         Number(overpassEl?.tags?.admin_level),
          //       )
          //     : '',
          boundary: overpassEl?.tags?.boundary,

          hierarchy: {
            country: f.properties.country,
            country_code: f.properties.countrycode,
            state: f.properties.state,
            county: f.properties.county,
            city: f.properties.city,
          },

          raw_tags: overpassEl?.tags,
          source: overpassEl ? 'overpass' : 'photon',
        };
      });

      await this.apiLogger.log({
        provider: 'api',
        action: 'get_place_list',
        status: 'success',
        durationMs: Date.now() - start,
        query: name,
        params: {
          timeout,
          photonCount: features.length,
          overpassCount: overpassMap.size,
          resultCount: results.length,
        },
      });

      return results;
    } catch {
      return [];
    }
  }

  async get_poi_list(name: string, timeout?: number): Promise<PoiResult[]> {
    const start = Date.now();

    try {
      // Increase Photon limit for better dedupe quality
      const features = await this.photonService.search(name, 15);
      if (!features.length) return [];

      const osmTypeMap: Record<string, 'node' | 'way' | 'relation'> = {
        N: 'node',
        W: 'way',
        R: 'relation',
      };

      // Prepare mixed OSM ids for Overpass enrichment
      const ids = features.map((f) => ({
        id: f.properties.osm_id,
        type: osmTypeMap[f.properties.osm_type],
      }));

      const overpassMap = new Map<number, OverpassElement>();

      try {
        const overpassRaw = await this.overpassService.fetchByMixedIds(
          ids,
          timeout,
        );

        for (const el of overpassRaw.elements ?? []) {
          overpassMap.set(el.id, el);
        }
      } catch {
        // Overpass enrichment failure should NOT break search
      }

      // Deduplicate using Wikidata-first strategy
      const dedupeMap = new Map<string, PoiResult>();

      for (const f of features) {
        const osmType = osmTypeMap[f.properties.osm_type];
        const overpassEl = overpassMap.get(f.properties.osm_id);
        const tags = overpassEl?.tags ?? {};

        const result: PoiResult = {
          osm_type: osmType,
          osm_id: f.properties.osm_id,
          osm_uid: `${f.properties.osm_type}${f.properties.osm_id}`,

          name: f.properties.name,

          brand: tags.brand,
          amenity: tags.amenity ?? f.properties.osm_value,
          cuisine: tags.cuisine,
          wikidata: tags.wikidata,

          country: f.properties.country,
          state: f.properties.state,
          country_code: f.properties.countrycode,

          source: overpassEl ? 'overpass' : 'photon',
        };

        // PRIMARY KEY — Wikidata
        const key =
          result.wikidata ??
          `${result.name?.toLowerCase() ?? 'unknown'}-${
            result.country_code ?? 'xx'
          }`;

        if (!dedupeMap.has(key)) {
          dedupeMap.set(key, result);
        }
      }

      const results = Array.from(dedupeMap.values());

      await this.apiLogger.log({
        provider: 'api',
        action: 'get_poi_list',
        status: 'success',
        durationMs: Date.now() - start,
        query: name,
        params: {
          photonCount: features.length,
          overpassCount: overpassMap.size,
          uniqueCount: results.length,
        },
      });

      return results;
    } catch (err: any) {
      await this.apiLogger.log({
        provider: 'api',
        action: 'get_poi_list',
        status: 'error',
        durationMs: Date.now() - start,
        query: name,
        error: err.message,
      });

      return [];
    }
  }
}
