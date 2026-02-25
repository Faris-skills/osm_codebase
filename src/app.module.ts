import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NominatimModule } from './nominatim/nominatim.module';
import { OverpassModule } from './overpass/overpass.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Placex } from './nominatim/entities/placex.entity';
import { AdminLevelMapService } from './nominatim/admin-level-map.service/admin-level-map.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [Placex],
      }),
    }),
    NominatimModule,
    OverpassModule,
  ],
  controllers: [AppController],
  providers: [AppService, AdminLevelMapService],
})
export class AppModule {}
