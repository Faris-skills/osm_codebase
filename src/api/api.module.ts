import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { OverpassModule } from 'src/overpass/overpass.module';
import { OsmBoundariesModule } from 'src/osm-boundaries/osm-boundaries.module';
import { PhotonService } from './photon/photon.service';
import { LoggerService } from 'src/shared/logger/logger.service';
import { CacheModule } from '@nestjs/cache-manager';
import { AdminLevelMapService } from 'src/nominatim/admin-level-map.service/admin-level-map.service';

@Module({
  imports: [
    OverpassModule,
    OsmBoundariesModule,
    CacheModule.register({
      ttl: 3600, // 1 hour
      max: 1000,
    }),
  ],
  providers: [ApiService, PhotonService, LoggerService, AdminLevelMapService],
  controllers: [ApiController],
})
export class ApiModule {}
