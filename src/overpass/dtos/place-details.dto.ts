import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PlaceDetailsQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(10)
  @Max(300)
  timeout?: number;
}
