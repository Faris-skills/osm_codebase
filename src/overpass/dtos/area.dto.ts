import { IsObject, IsString, IsOptional, IsNumber } from 'class-validator';

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
  timeout?: number;
}
