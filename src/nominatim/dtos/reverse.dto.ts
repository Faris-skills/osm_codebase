import { IsLatitude, IsLongitude } from 'class-validator';

export class ReverseDto {
  @IsLatitude()
  lat: string;

  @IsLongitude()
  lon: string;
}
