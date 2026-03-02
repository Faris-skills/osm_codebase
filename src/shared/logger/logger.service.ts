import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type ApiProvider =
  | 'api'
  | 'photon'
  | 'overpass'
  | 'nominatim'
  | 'osm-boundaries';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger(LoggerService.name);

  async log(data: {
    provider: ApiProvider;
    action: string;
    status: 'success' | 'error' | 'cache-hit';
    durationMs?: number;
    endpoint?: string;
    query?: string;
    params?: any;
    response?: any;
    error?: string;
  }) {
    try {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();

      const logDir = path.join(process.cwd(), 'logs', data.provider);
      await fs.promises.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, `${date}.log`);
      const separator = '='.repeat(60);

      // Only log response if photon
      const shouldLogResponse = data.provider === 'photon';

      const logBlock = `
${separator}
Timestamp: ${timestamp}
Provider: ${data.provider}
Action: ${data.action}
Status: ${data.status}
Duration: ${data.durationMs ?? 'N/A'}ms
Endpoint: ${data.endpoint ?? 'N/A'}
Query: ${data.query ?? 'N/A'}
${data.error ? `Error: ${data.error}` : ''}

Params:
${data.params ? JSON.stringify(data.params, null, 2) : 'none'}
${
  shouldLogResponse
    ? `\nResponse:\n${JSON.stringify(data.response ?? [], null, 2)}`
    : ''
}
${separator}

`;

      await fs.promises.appendFile(logFile, logBlock);
    } catch (err) {
      this.logger.error('Failed to write API log', err);
    }
  }
}
