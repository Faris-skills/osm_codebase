import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

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
  timeout?: number;
}
