import {
  IsObject,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class BboxDto {
  @IsObject()
  tags: Record<string, string>;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  bbox: [number, number, number, number];

  @IsOptional()
  @IsNumber()
  timeout?: number;
}
