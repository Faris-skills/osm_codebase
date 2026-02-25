import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { OverpassService } from './overpass.service';
import { PostcodesByCityDto } from './dtos/post-codes.dto';

@Controller('overpass')
export class OverpassController {
  constructor(private readonly overpassService: OverpassService) {}

  @Post('bbox')
  async bbox(
    @Body('tags') tags: Record<string, string>,
    @Body('bbox') bbox: [number, number, number, number],
  ) {
    return this.overpassService.findNodesByTagsInBBox(tags, bbox);
  }

  @Post('area')
  async area(
    @Body('tags') tags: Record<string, string>,
    @Body('areaName') areaName: string,
  ) {
    return this.overpassService.findNodesByTagsInArea(tags, areaName);
  }

  @Post('postcodes')
  async postcodesByCity(@Body() body: PostcodesByCityDto) {
    return this.overpassService.postcodesByCity(body.name, {
      adminLevel: body.adminLevel,
      timeout: body.timeout,
    });
  }

  @Post('custom')
  async custom(@Body('query') query: string) {
    return this.overpassService.custom(query);
  }
}
