import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminLevelMapService {
  private readonly adminLevelMap: Record<string, Record<number, string>>;

  constructor() {
    const filePath = path.join(__dirname, '../../../administrative_areas_mapping/admin_level_map.json');

    this.adminLevelMap = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  getCountryLevels(countryCode: string): Record<number, string> {
    return this.adminLevelMap[countryCode.toLowerCase()] || {};
  }

  getLevelName(countryCode: string, level: number): string | null {
    return this.adminLevelMap[countryCode.toLowerCase()]?.[level] || null;
  }
}
