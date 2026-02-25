import { Module } from '@nestjs/common';
import { OverpassController } from './overpass.controller';
import { OverpassService } from './overpass.service';

@Module({
  controllers: [OverpassController],
  providers: [OverpassService]
})
export class OverpassModule {}
