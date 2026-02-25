import { IsISO31661Alpha2 } from 'class-validator';

export class AdminLevelsDto {
  @IsISO31661Alpha2()
  country: string;
}
