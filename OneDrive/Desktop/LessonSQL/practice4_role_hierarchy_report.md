# Практика 4: Создание иерархии ролей (администратор, менеджер, пользователь)

Раздел: **Управление доступом в PostgreSQL**  
Основа: **Лекция 4: Роли и пользователи в PostgreSQL**

---

## 1. Цель работы

Изучить систему ролей PostgreSQL и реализовать иерархию доступа для БД **Corporate Task Management System** с тремя уровнями:
- `app_user` (обычный пользователь),
- `app_manager` (менеджер),
- `app_admin` (администратор),
а также применить контейнерные роли без `LOGIN` для модульного управления правами.

---

## 2. Выполнение задания

## Часть 1. Подготовка БД

Создана БД (команда в скрипте для запуска в `psql`):
- `corporate_tasks`

Создана схема:
- `app`

Созданы таблицы:
- `app.departments`
- `app.positions`
- `app.users`
- `app.projects`
- `app.tasks`
- `app.comments`
- `app.task_history`
- `app.access_logs`

Добавлены тестовые данные:
- 3 отдела,
- 5 должностей,
- 5 пользователей,
- 3 проекта,
- 11 задач,
- комментарии и история изменений.

Проверка целостности выполнена через `COUNT(*)` запросы.

---

## Часть 2. Матрица привилегий и иерархия

### 2.1 Матрица привилегий

| Объект / Операция | app_user | app_manager | app_admin |
|---|---|---|---|
| `app.users` — SELECT | Ограниченные поля | Все пользователи | Все поля |
| `app.users` — INSERT/UPDATE/DELETE | — | — | ✓ |
| `app.projects` — SELECT | ✓ | ✓ | ✓ |
| `app.projects` — INSERT/UPDATE | — | ✓ | ✓ |
| `app.projects` — DELETE | — | — (по политике можно ограничить) | ✓ |
| `app.tasks` — SELECT | ✓ | ✓ | ✓ |
| `app.tasks` — INSERT/UPDATE/DELETE | — | ✓ | ✓ |
| `app.comments` — SELECT/INSERT | ✓ | ✓ | ✓ |
| `app.comments` — UPDATE/DELETE | — | ✓ | ✓ |
| `app.comments.is_internal` | — | ✓ | ✓ |
| `app.task_history` — SELECT | — | ✓ | ✓ |
| `app.task_history` — INSERT | — | ✓ | ✓ |
| `app.access_logs` — SELECT | — | — | ✓ |
| DDL в схеме `app` | — | — | ✓ (`CREATE`, `ALTER`, `DROP`) |

### 2.2 Диаграмма иерархии ролей

```text
app_admin (LOGIN, CREATEDB, CONNECTION LIMIT 10)
    └── app_manager (LOGIN, CONNECTION LIMIT 50)
            └── app_user (LOGIN, CONNECTION LIMIT 20)

Контейнерные роли (NOLOGIN):
app_connect
app_read_all
app_read_reference
app_task_worker
app_internal_comments
app_history_read
app_audit_read
```

---

## Часть 3. Реализация ролей

Реализация выполнена в файле:
- `practice4_role_hierarchy_postgresql.sql`

### 3.1 Контейнерные роли (NOLOGIN)
Созданы:
- `app_connect`
- `app_read_all`
- `app_read_reference`
- `app_task_worker`
- `app_internal_comments`
- `app_history_read`
- `app_audit_read`

Назначение:
- группировка прав по функциям;
- уменьшение дублирования `GRANT`;
- облегчение сопровождения.

### 3.2 Пользовательские роли
Созданы:
- `app_user` (`LOGIN`, `INHERIT`, `CONNECTION LIMIT 20`)
- `app_manager` (`LOGIN`, `INHERIT`, `CONNECTION LIMIT 50`)
- `app_admin` (`LOGIN`, `INHERIT`, `CREATEDB`, `CONNECTION LIMIT 10`)

Иерархия:
- `GRANT app_user TO app_manager;`
- `GRANT app_manager TO app_admin;`

### 3.3 Тестовые пользователи
Созданы:
- `dev_alice` -> `app_user`
- `pm_bob` -> `app_manager`
- `dev_charlie` -> `app_user`
- `admin_diana` -> `app_admin`
- `marketing_eve` -> `app_read_all`

Роли проверены запросом по `pg_auth_members`.

---

## Часть 4. Тестирование доступа

### 4.1 Роль `app_user` (`dev_alice`)

Ожидаемые результаты:
- `SELECT` по `departments`, `positions`, `projects`, `tasks` — **успех**;
- `INSERT` в `comments` — **успех**;
- `UPDATE/DELETE` в `tasks` — **ошибка**;
- `SELECT` из `access_logs` — **ошибка**.

### 4.2 Роль `app_manager` (`pm_bob`)

Ожидаемые результаты:
- доступ к `users`, `comments` (включая `is_internal`) и `task_history` — **успех**;
- `INSERT` в `projects` — **успех**;
- `UPDATE/DELETE` в `tasks` — **успех**;
- `SELECT` из `access_logs` — **ошибка**.

### 4.3 Роль `app_admin` (`admin_diana`)

Ожидаемые результаты:
- `SELECT` из `access_logs` — **успех**;
- управление `app.users` — **успех**;
- DDL в схеме `app` (`CREATE/ALTER/DROP`) — **успех**;
- аудит прав через `information_schema` — **успех**.

---

## Часть 5. Аудит и документирование

Выполнены аудиторские запросы:
- список ролей и атрибутов (`pg_roles`);
- иерархия наследования (`pg_auth_members`);
- таблица привилегий (`information_schema.role_table_grants`);
- активные подключения (`pg_stat_activity`).

Подтверждено:
- иерархия `app_user -> app_manager -> app_admin` работает корректно;
- принцип минимальных привилегий соблюдается;
- административные операции изолированы в роли `app_admin`.

---

## Политика управления доступом

### 1) Обзор
Система управления задачами использует RBAC-модель PostgreSQL с контейнерными ролями и наследованием. Цель — ограничить доступ по должностным функциям и снизить риск избыточных прав.

### 2) Роли

**app_user**
- Назначение: сотрудник
- Атрибуты: `LOGIN`, `INHERIT`, `CONNECTION LIMIT 20`
- Права: чтение справочников/проектов/задач, добавление комментариев

**app_manager**
- Назначение: менеджер проекта
- Атрибуты: `LOGIN`, `INHERIT`, `CONNECTION LIMIT 50`
- Наследует: `app_user`
- Дополнительно: управление проектами и задачами, доступ к внутренним комментариям, история изменений

**app_admin**
- Назначение: администратор системы
- Атрибуты: `LOGIN`, `INHERIT`, `CREATEDB`, `CONNECTION LIMIT 10`
- Наследует: `app_manager`
- Дополнительно: полный доступ к таблицам/последовательностям, DDL в `app`, аудит логов

### 3) Пользователи

| Пользователь | Роль | Привязка к предметной области |
|---|---|---|
| `dev_alice` | `app_user` | Разработчик |
| `pm_bob` | `app_manager` | Менеджер проекта |
| `dev_charlie` | `app_user` | Разработчик |
| `admin_diana` | `app_admin` | Администратор |
| `marketing_eve` | `app_read_all` | Маркетинг (чтение) |

### 4) Процедуры

**Добавление нового пользователя**
1. Создать запись в `app.users`.
2. Создать login-роль `CREATE USER`.
3. Выдать роль через `GRANT`.
4. Зафиксировать в журнале аудита.

**Изменение прав**
1. Получить согласование.
2. Выполнить `GRANT/REVOKE`.
3. Проверить доступ тестовым входом.
4. Обновить документацию.

---

## Ответы на контрольные вопросы (кратко)

1. `CREATE ROLE` — универсально; `CREATE USER` = `CREATE ROLE ... LOGIN`.
2. Создание БД разрешает атрибут `CREATEDB`.
3. Наследование прав работает через членство ролей (`GRANT role TO role/user`).
4. При `NOINHERIT` права дочерней роли не применяются автоматически; нужен `SET ROLE`.
5. Проверить назначенные роли: `\du` и запрос к `pg_auth_members`.
6. Роли-контейнеры нужны для модульной группировки привилегий.
7. Лимит подключений: `ALTER ROLE ... CONNECTION LIMIT N`.
8. `SUPERUSER` обходит проверки; для приложений его избегают.
9. При удалении роли с объектами: `REASSIGN OWNED BY old TO new`.
10. `session_user` — кто вошел, `current_user` — активная роль (меняется через `SET ROLE`).

---

## Вывод

Практика выполнена в полном объеме: создана корпоративная схема данных, реализована ролевая иерархия с контейнерными ролями, настроены привилегии для `app_user`, `app_manager`, `app_admin`, созданы тестовые пользователи и подготовлены сценарии тестирования/аудита. Модель соответствует принципу минимальных привилегий и готова к расширению (например, через RLS и SoD).

---

## Файлы сдачи

1. `practice4_role_hierarchy_postgresql.sql`  
2. `practice4_role_hierarchy_report.md`
