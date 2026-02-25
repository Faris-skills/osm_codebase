import { Module } from '@nestjs/common';
import { OverpassController } from './overpass.controller';
import { OverpassService } from './overpass.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 3600, // 1 hour
      max: 1000,
    }),
  ],
  controllers: [OverpassController],
  providers: [OverpassService],
})
export class OverpassModule {}
