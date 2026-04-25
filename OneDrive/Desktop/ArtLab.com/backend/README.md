# ArtLab API (NestJS + Prisma + Supabase Postgres)

Бэкенд для двухэтапного потока: **регистрация/вход** → **httpOnly cookie** → **создание проекта** (`POST /projects`).

## Безопасность

- **Не коммитьте** файл `.env` и **не вставляйте** в код реальные ключи Supabase или пароли БД.
- Ключ `sb_publishable_...` из Supabase предназначен для **клиента** (anon). Для этого сервера используется только **`DATABASE_URL`** (прямое подключение к Postgres).
- Пароль БД берётся в Supabase: **Project Settings → Database → Database password**.

## Установка

```bash
cd backend
cp .env.example .env
# Отредактируйте .env: DATABASE_URL, JWT_*, FRONTEND_URL, ADMIN_*
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

API по умолчанию: `http://localhost:3000`.

## Первый администратор

1. Зарегистрируйте пользователя: `POST /auth/register` с нужным email (тот же, что укажете в `ADMIN_PANEL_EMAIL`).
2. В Supabase SQL Editor:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

3. В `.env` задайте `ADMIN_PANEL_EMAIL` и длинный `ADMIN_PANEL_PASSWORD`.
4. Вход в панель: `POST /auth/admin/login` с телом:

```json
{
  "email": "admin@example.com",
  "password": "ваш_пароль_учётки",
  "adminSecret": "значение_ADMIN_PANEL_PASSWORD_из_env"
}
```

## Эндпоинты

| Метод | Путь | Описание |
|--------|------|-----------|
| POST | `/auth/register` | `{ name, email, password }` → user + cookies |
| POST | `/auth/login` | `{ email, password }` → user + cookies |
| POST | `/auth/admin/login` | `{ email, password, adminSecret }` → только ADMIN |
| POST | `/auth/forgot` | `{ email }` → всегда одинаковое сообщение (MVP) |
| POST | `/auth/refresh` | cookie `refresh_token` → новая пара токенов |
| POST | `/auth/logout` | JWT → очистка cookies и refresh в БД |
| GET | `/auth/me` | JWT → текущий пользователь |
| POST | `/projects` | JWT → `{ title, description, requestedAmount }` |
| GET | `/projects/mine` | JWT → список проектов пользователя |

Cookies: **`access_token`**, **`refresh_token`** (httpOnly, `sameSite=lax` в dev).

## CORS

`FRONTEND_URL` должен совпадать с origin фронта (например `http://localhost:5173`). Запросы с фронта должны идти с `credentials: 'include'`.

## Ограничение описания проекта в БД (опционально)

После `db push` в Supabase можно добавить CHECK:

```sql
ALTER TABLE projects
ADD CONSTRAINT projects_description_len CHECK (char_length(description) <= 250);
```

## Supabase CLI (по желанию)

```bash
supabase login
supabase init
supabase link --project-ref qrdznxbrbyizuptjxctk
```

Миграции Prisma живут в `prisma/`; схема синхронизируется с вашей БД через `prisma db push` или `prisma migrate dev`.
