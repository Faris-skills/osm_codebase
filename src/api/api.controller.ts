import { Controller, Get, Query } from '@nestjs/common';
import { SearchPlaceDto } from './dto/search-place.dto';
import { PlaceResult } from './types/place-boundary.type';
import { ApiService } from './api.service';

@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('search/place')
  async searchAdmin(@Query() query: SearchPlaceDto): Promise<PlaceResult[]> {
    return this.apiService.get_place_list(query.name, query.timeout);
  }

  @Get('search/poi')
  async searchPoi(@Query() query: SearchPlaceDto): Promise<PlaceResult[]> {
    return this.apiService.get_poi_list(query.name, query.timeout);
  }
}
