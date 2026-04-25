import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min, MinLength, Max } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(250)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1_000)
  @Max(10_000_000)
  requestedAmount!: number;
}
