import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class GetCountDto {
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
