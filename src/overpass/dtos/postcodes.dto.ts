import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class PostcodesByCityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  adminLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  timeout?: number;
}
