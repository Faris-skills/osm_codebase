import { IsString } from 'class-validator';

export class CustomQueryDto {
  @IsString()
  query: string;
}
