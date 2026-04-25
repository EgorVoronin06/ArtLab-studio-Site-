import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Админ-вход: email из ADMIN_PANEL_EMAIL, пароль учётной записи ADMIN в БД,
 * плюс adminSecret — значение из env ADMIN_PANEL_PASSWORD (второй фактор «панели»).
 */
export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(8)
  adminSecret!: string;
}
