import { Injectable, Logger } from '@nestjs/common';
import { PlaceResult } from './types/place-boundary.type';
import { OverpassService } from 'src/overpass/overpass.service';
import {
  normalizeOsmBoundariesResponse,
  normalizeOverpassResponse,
} from 'src/shared/normalize.helper';
import { OsmBoundariesService } from 'src/osm-boundaries/osm-boundaries.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);

  constructor(
    private readonly overpassService: OverpassService,
    private readonly osmBoundariesService: OsmBoundariesService,
  ) {}

  private async logApiRequest(data: {
    provider: string;
    action: string;
    query: string;
    resultSource?: string;
    resultCount?: number;
    durationMs?: number;
    reason?: string;
    error?: string;
  }) {
    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      const logDir = path.join(process.cwd(), 'logs', 'api');
      await fs.promises.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, `${date}.log`);
      const separator = '='.repeat(60);

      const logBlock = `
${separator}
Timestamp: ${timestamp}
Provider: ${data.provider}
Action: ${data.action}
Query: ${data.query}
Result Source: ${data.resultSource ?? 'N/A'}
Result Count: ${data.resultCount ?? 'N/A'}
Duration: ${data.durationMs ?? 'N/A'}ms
Reason: ${data.reason ?? 'N/A'}
${data.error ? `Error: ${data.error}` : ''}
${separator}

`;

      await fs.promises.appendFile(logFile, logBlock);
    } catch (err) {
      this.logger.error('Failed to write API log', err);
    }
  }

  async get_place_list(name: string, timeout?: number): Promise<PlaceResult[]> {
    const start = Date.now();

    // Try Overpass first
    try {
      const overpassRaw = await this.overpassService.findPlaceDetails(
        name,
        timeout,
      );

      const overpassResults = normalizeOverpassResponse(overpassRaw);

      if (overpassResults.length > 0) {
        await this.logApiRequest({
          provider: 'places',
          action: 'search',
          query: name,
          resultSource: 'overpass',
          resultCount: overpassResults.length,
          durationMs: Date.now() - start,
        });

        return overpassResults;
      }

      // Overpass returned empty → fallback
      await this.logApiRequest({
        provider: 'places',
        action: 'fallback-triggered',
        query: name,
        reason: 'overpass-empty',
      });
    } catch (err: any) {
      // Overpass error → fallback
      await this.logApiRequest({
        provider: 'places',
        action: 'fallback-triggered',
        query: name,
        reason: 'overpass-error',
        error: err.message,
      });
    }

    // Fallback to OSM-Boundaries
    const fallbackRaw = await this.osmBoundariesService.searchByName(name);
    const fallbackResults = normalizeOsmBoundariesResponse(fallbackRaw);

    await this.logApiRequest({
      provider: 'places',
      action: 'search',
      query: name,
      resultSource: 'osm-boundaries',
      resultCount: fallbackResults.length,
      durationMs: Date.now() - start,
    });

    return fallbackResults;
  }
}
