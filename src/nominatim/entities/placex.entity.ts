import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'placex' })
export class Placex {
  @PrimaryGeneratedColumn()
  place_id: number;

  @Column({ nullable: true })
  country_code: string;

  @Column({ nullable: true })
  admin_level: string;
}
