import { IsString, IsOptional, IsNumber } from 'class-validator';

export class PostcodesByCityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  adminLevel?: number;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}
