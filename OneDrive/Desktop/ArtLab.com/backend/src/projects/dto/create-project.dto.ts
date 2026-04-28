import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength, Max } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: true }, { message: 'imageUrl должен быть корректной ссылкой' })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: true }, { message: 'logoUrl должен быть корректной ссылкой' })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: true }, { message: 'presentationUrl должен быть корректной ссылкой' })
  presentationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @IsUrl({ require_tld: true }, { message: 'telegramUrl должен быть корректной ссылкой' })
  telegramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @IsUrl({ require_tld: true }, { message: 'vkUrl должен быть корректной ссылкой' })
  vkUrl?: string;
}
