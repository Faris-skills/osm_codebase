import { Module } from '@nestjs/common';
import { OsmBoundariesService } from './osm-boundaries.service';
import { OsmBoundariesController } from './osm-boundaries.controller';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 3600, // 1 hour
      max: 1000,
    }),
  ],
  providers: [OsmBoundariesService],
  controllers: [OsmBoundariesController],
})
export class OsmBoundariesModule {}
