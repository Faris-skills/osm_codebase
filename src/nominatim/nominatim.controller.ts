import { Controller, Get, Query } from '@nestjs/common';
import { NominatimService } from './nominatim.service';

@Controller('nominatim')
export class NominatimController {
  constructor(private readonly nominatimService: NominatimService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    return this.nominatimService.search(q);
  }

  @Get('reverse')
  async reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.nominatimService.reverse(lat, lon);
  }

  @Get('admin-levels') async adminLevels(@Query('country') country: string) {
    return this.nominatimService.getAdminLevels(country);
  }
}
