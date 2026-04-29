-- =====================================================
-- Практика 3: Настройка методов аутентификации
-- Раздел: Управление доступом в PostgreSQL
-- =====================================================

-- ВАЖНО:
-- - Выполнять под суперпользователем PostgreSQL.
-- - pg_hba.conf редактируется вручную в файловой системе.
-- - После правок pg_hba.conf: SELECT pg_reload_conf();

-- -----------------------------------------------------
-- ЧАСТЬ 1. Подготовка окружения
-- -----------------------------------------------------

-- 1.1 Поиск конфигов
SHOW hba_file;
SHOW config_file;
SHOW data_directory;

SELECT name, setting
FROM pg_settings
WHERE name IN ('hba_file', 'config_file', 'data_directory')
ORDER BY name;

-- Резервную копию pg_hba.conf сделать в ОС:
-- Linux/macOS: cp /path/to/pg_hba.conf /path/to/pg_hba.conf.bak
-- Windows: copy "C:\...\pg_hba.conf" "C:\...\pg_hba.conf.bak"

-- 1.2 Создание тестовых пользователей с разными хешами
DROP ROLE IF EXISTS user_scram;
DROP ROLE IF EXISTS user_md5;
DROP ROLE IF EXISTS user_alice;

SHOW password_encryption;

SET password_encryption = 'scram-sha-256';
CREATE USER user_scram WITH PASSWORD 'SecurePass123!';

SET password_encryption = 'md5';
CREATE USER user_md5 WITH PASSWORD 'SecurePass123!';

SET password_encryption = 'scram-sha-256';
CREATE USER user_alice WITH PASSWORD 'AlicePassword456!';

SELECT
    usename,
    LEFT(passwd, 20) AS hash_prefix,
    CASE
        WHEN passwd LIKE 'md5%' THEN 'md5'
        WHEN passwd LIKE 'SCRAM-SHA-256%' THEN 'scram-sha-256'
        ELSE 'unknown'
    END AS encryption_method
FROM pg_shadow
WHERE usename IN ('user_scram', 'user_md5', 'user_alice')
ORDER BY usename;

-- Выдать минимальный доступ для теста подключения к БД postgres
GRANT CONNECT ON DATABASE postgres TO user_scram, user_md5, user_alice;

-- -----------------------------------------------------
-- ЧАСТЬ 2. Настройка методов аутентификации (pg_hba.conf)
-- -----------------------------------------------------
-- ПРАВИЛА ОБРАБАТЫВАЮТСЯ СВЕРХУ ВНИЗ: первое совпавшее правило применяется.

-- 2.1 TRUST (только тест)
-- Добавить временно в начало pg_hba.conf:
-- host    all   user_scram   127.0.0.1/32   trust
-- host    all   user_scram   ::1/128        trust
--
-- Тест:
-- psql -U user_scram -d postgres -h 127.0.0.1      -- должен пускать без пароля
-- psql -U user_md5   -d postgres -h 127.0.0.1      -- пароль потребуется (если нет trust-правила)
--
-- После теста удалить/закомментировать trust-правила.

-- 2.2 MD5
-- Добавить правило:
-- host    all   user_md5     127.0.0.1/32   md5
-- host    all   user_md5     ::1/128        md5
--
-- Тест:
-- psql -U user_md5 -d postgres -h 127.0.0.1
-- правильный пароль: успех
-- неправильный пароль: ошибка аутентификации

-- 2.3 SCRAM-SHA-256
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
SELECT pg_reload_conf();
SHOW password_encryption;

ALTER USER user_alice WITH PASSWORD 'NewSecurePassword789!';

-- Добавить правило:
-- host    all   user_alice   127.0.0.1/32   scram-sha-256
-- host    all   user_alice   ::1/128        scram-sha-256
--
-- Тест:
-- psql -U user_alice -d postgres -h 127.0.0.1

-- Проверка кейса: md5-пользователь против scram-правила (ожидается ошибка)
-- В pg_hba.conf временно поставить для user_md5 метод scram-sha-256:
-- host    all   user_md5     127.0.0.1/32   scram-sha-256
-- psql -U user_md5 -d postgres -h 127.0.0.1  -- должен получить ошибку

-- 2.4 PEER (Linux/Unix only)
-- Для Windows этот шаг теоретический.
-- Пример:
-- local   all   user_alice   peer
-- Требуется пользователь ОС с тем же именем.

-- -----------------------------------------------------
-- ЧАСТЬ 3. Миграция md5 -> scram-sha-256
-- -----------------------------------------------------

-- 3.1 Аудит пользователей
SELECT
    usename,
    CASE
        WHEN passwd LIKE 'md5%' THEN 'md5 (requires migration)'
        WHEN passwd LIKE 'SCRAM-SHA-256%' THEN 'scram-sha-256 (ok)'
        WHEN passwd IS NULL THEN 'no password'
        ELSE 'unknown'
    END AS password_type,
    valuntil AS password_expires
FROM pg_shadow
ORDER BY password_type, usename;

-- 3.2 Обновление пароля user_md5 до scram
ALTER USER user_md5 WITH PASSWORD 'NewSecurePassword123!';

SELECT
    usename,
    CASE
        WHEN passwd LIKE 'md5%' THEN 'md5'
        WHEN passwd LIKE 'SCRAM-SHA-256%' THEN 'scram-sha-256'
        ELSE 'unknown'
    END AS encryption_method
FROM pg_shadow
WHERE usename = 'user_md5';

-- В pg_hba.conf заменить для user_md5:
-- host    all   user_md5     127.0.0.1/32   scram-sha-256
-- host    all   user_md5     ::1/128        scram-sha-256

-- 3.3 Финальная безопасная конфигурация pg_hba.conf (пример)
-- TYPE   DATABASE  USER      ADDRESS           METHOD
-- local  all       postgres                     peer
-- local  all       all                          scram-sha-256
-- host   all       all       127.0.0.1/32      scram-sha-256
-- host   all       all       ::1/128           scram-sha-256
-- host   all       all       192.168.1.0/24    scram-sha-256
-- host   all       all       0.0.0.0/0         reject

-- -----------------------------------------------------
-- ЧАСТЬ 4. Аудит и логирование
-- -----------------------------------------------------

-- 4.1 Включение логирования подключений
SHOW log_connections;
SHOW log_disconnections;
SHOW log_line_prefix;

ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
SELECT pg_reload_conf();

-- 4.2 Проверка логирования неудачных попыток
-- Выполнить 3-5 входов с неверным паролем и проверить лог-файл.
SHOW log_directory;
SHOW log_filename;
SHOW logging_collector;

-- -----------------------------------------------------
-- Полезные проверки для отчета
-- -----------------------------------------------------
SELECT current_user, session_user;

SELECT r.rolname
FROM pg_roles r
WHERE r.rolname IN ('user_scram', 'user_md5', 'user_alice')
ORDER BY r.rolname;

-- Очистка (опционально, в конце лабораторной)
-- DROP ROLE IF EXISTS user_scram;
-- DROP ROLE IF EXISTS user_md5;
-- DROP ROLE IF EXISTS user_alice;
