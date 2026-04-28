import { IsArray, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400000)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({ require_tld: true }, { each: true, message: 'Каждая ссылка должна быть корректной' })
  links?: string[];
}
