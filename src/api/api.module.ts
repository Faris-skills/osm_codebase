import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { OverpassModule } from 'src/overpass/overpass.module';
import { OsmBoundariesModule } from 'src/osm-boundaries/osm-boundaries.module';

@Module({
  imports: [OverpassModule, OsmBoundariesModule],
  providers: [ApiService],
  controllers: [ApiController],
})
export class ApiModule {}
