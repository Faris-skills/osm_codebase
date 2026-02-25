import { Controller, Get, Query } from '@nestjs/common';
import { NominatimService } from './nominatim.service';
import { SearchDto } from './dtos/search.dto';
import { ReverseDto } from './dtos/reverse.dto';
import { AdminLevelsDto } from './dtos/admin-levels.dto';
import {
  NominatimSearchResponse,
  NominatimReverseResponse,
  AdminLevelResponse,
} from './types/response-types.type';

@Controller('nominatim')
export class NominatimController {
  constructor(private readonly nominatimService: NominatimService) {}

  @Get('search')
  async search(@Query() query: SearchDto): Promise<NominatimSearchResponse> {
    return this.nominatimService.search(query.q);
  }

  @Get('reverse')
  async reverse(@Query() query: ReverseDto): Promise<NominatimReverseResponse> {
    return this.nominatimService.reverse(query.lat, query.lon);
  }

  @Get('admin-levels')
  async adminLevels(
    @Query() query: AdminLevelsDto,
  ): Promise<AdminLevelResponse[]> {
    return this.nominatimService.getAdminLevels(query.country);
  }
}
