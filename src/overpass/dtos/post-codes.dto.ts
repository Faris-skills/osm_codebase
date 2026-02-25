import { IsOptional, IsString, IsInt, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class PostcodesByCityDto {
  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adminLevel?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string; // ISO 3166-1 alpha-2 (FR, US, IN)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeout?: number;
}
