import {
  IsObject,
  IsString,
  IsOptional,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class AreaDto {
  @IsObject()
  tags: Record<string, string>;

  @IsString()
  areaName: string;

  @IsOptional()
  @IsNumber()
  adminLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  timeout?: number;
}
