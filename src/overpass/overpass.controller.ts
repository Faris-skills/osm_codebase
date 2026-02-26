import { Controller, Post, Body } from '@nestjs/common';
import { OverpassService } from './overpass.service';
import { BboxDto } from './dtos/bbox.dto';
import { AreaDto } from './dtos/area.dto';
import { PostcodesByCityDto } from './dtos/postcodes.dto';
import { CustomQueryDto } from './dtos/custom.dto';
import { OverpassResponse } from './types/response-types.types';
import { GetCountDto } from './dtos/get-count.dto';

@Controller('overpass')
export class OverpassController {
  constructor(private readonly overpassService: OverpassService) {}

  @Post('bbox')
  async bbox(@Body() dto: BboxDto): Promise<OverpassResponse> {
    return this.overpassService.findNodesByTagsInBBox(
      dto.tags,
      dto.bbox,
      dto.timeout,
    );
  }

  @Post('area')
  async area(@Body() dto: AreaDto): Promise<OverpassResponse> {
    return this.overpassService.findNodesByTagsInArea(dto.tags, dto.areaName, {
      adminLevel: dto.adminLevel,
      timeout: dto.timeout,
    });
  }

  @Post('postcodes')
  async postcodes(@Body() dto: PostcodesByCityDto): Promise<OverpassResponse> {
    return this.overpassService.postcodesByCity(dto.name, {
      adminLevel: dto.adminLevel,
      timeout: dto.timeout,
    });
  }

  @Post('get-count') async countNumberOfPoints(
    @Body() dto: GetCountDto,
  ): Promise<OverpassResponse> {
    return this.overpassService.countNumberOfPoints(dto.tags, dto.areaName, {
      adminLevel: dto.adminLevel,
      timeout: dto.timeout,
    });
  }

  @Post('custom')
  async custom(@Body() dto: CustomQueryDto): Promise<OverpassResponse> {
    return this.overpassService.custom(dto.query);
  }
}
