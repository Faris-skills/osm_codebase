import { Controller, Get, Query } from '@nestjs/common';
import { SearchPlaceDto } from './dto/search-place.dto';
import { PlaceResult } from './types/place-boundary.type';
import { ApiService } from './api.service';

@Controller('api')
export class ApiController {
  constructor(private readonly api_service: ApiService) {}

  @Get('search')
  async search(@Query() query: SearchPlaceDto): Promise<PlaceResult[]> {
    return this.api_service.get_place_list(query.name, query.timeout);
  }
}
