import { Controller, Get, Query } from '@nestjs/common';
import { OsmBoundariesService } from './osm-boundaries.service';
import { SearchPlaceDto } from './dtos/search-place.dto';
import { OsmBoundaryRaw } from './types/response-types.type';

@Controller('osm-boundaries')
export class OsmBoundariesController {
  constructor(private readonly osmBoundariesService: OsmBoundariesService) {}

  @Get('search')
  async search(@Query() query: SearchPlaceDto): Promise<OsmBoundaryRaw[]> {
    return this.osmBoundariesService.searchByName(query.name);
  }
}
