import { Module } from '@nestjs/common';
import { NominatimController } from './nominatim.controller';
import { NominatimService } from './nominatim.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Placex } from './entities/placex.entity';
import { AdminLevelMapService } from './admin-level-map.service/admin-level-map.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([Placex]),
    CacheModule.register({
      ttl: 3600, // 1 hour
      max: 1000,
    }),
  ],
  controllers: [NominatimController],
  providers: [NominatimService, AdminLevelMapService],
  exports: [AdminLevelMapService],
})
export class NominatimModule {}
