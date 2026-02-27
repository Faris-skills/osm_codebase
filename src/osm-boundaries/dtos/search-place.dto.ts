import { IsString } from 'class-validator';

export class SearchPlaceDto {
  @IsString()
  name: string;
}
