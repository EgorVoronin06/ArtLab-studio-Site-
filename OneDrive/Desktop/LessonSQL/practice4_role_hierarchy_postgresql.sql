-- =====================================================
-- Практика 4: Создание иерархии ролей
-- Проект: Corporate Task Management System
-- Роли: app_admin, app_manager, app_user
-- =====================================================

-- ВАЖНО:
-- 1) Выполнять под суперпользователем.
-- 2) CREATE DATABASE и \c запускаются в psql отдельно.

-- -----------------------------------------------------
-- ЧАСТЬ 1. Подготовка БД
-- -----------------------------------------------------
-- CREATE DATABASE corporate_tasks;
-- \c corporate_tasks

DROP SCHEMA IF EXISTS app CASCADE;

DO $$
BEGIN
    -- container roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_connect') THEN EXECUTE 'DROP ROLE app_connect'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_read_all') THEN EXECUTE 'DROP ROLE app_read_all'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_read_reference') THEN EXECUTE 'DROP ROLE app_read_reference'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_task_worker') THEN EXECUTE 'DROP ROLE app_task_worker'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_internal_comments') THEN EXECUTE 'DROP ROLE app_internal_comments'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_history_read') THEN EXECUTE 'DROP ROLE app_history_read'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_audit_read') THEN EXECUTE 'DROP ROLE app_audit_read'; END IF;

    -- main roles
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN EXECUTE 'DROP ROLE app_user'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_manager') THEN EXECUTE 'DROP ROLE app_manager'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN EXECUTE 'DROP ROLE app_admin'; END IF;

    -- test users
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dev_alice') THEN EXECUTE 'DROP ROLE dev_alice'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pm_bob') THEN EXECUTE 'DROP ROLE pm_bob'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dev_charlie') THEN EXECUTE 'DROP ROLE dev_charlie'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_diana') THEN EXECUTE 'DROP ROLE admin_diana'; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'marketing_eve') THEN EXECUTE 'DROP ROLE marketing_eve'; END IF;
END $$;

CREATE SCHEMA app;

CREATE TABLE app.departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.positions (
    position_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    description TEXT
);

CREATE TABLE app.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    department_id INTEGER REFERENCES app.departments(department_id),
    position_id INTEGER REFERENCES app.positions(position_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.projects (
    project_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES app.users(user_id),
    department_id INTEGER REFERENCES app.departments(department_id),
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    budget NUMERIC(12, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.tasks (
    task_id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES app.projects(project_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    assignee_id INTEGER REFERENCES app.users(user_id),
    created_by INTEGER REFERENCES app.users(user_id),
    estimated_hours NUMERIC(6, 2),
    actual_hours NUMERIC(6, 2),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.comments (
    comment_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES app.tasks(task_id),
    user_id INTEGER REFERENCES app.users(user_id),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app.task_history (
    history_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES app.tasks(task_id),
    changed_by INTEGER REFERENCES app.users(user_id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT
);

CREATE TABLE app.access_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app.users(user_id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    ip_address INET,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Тестовые данные: >=2 отдела, >=3 должности, >=5 пользователей, 2+ проекта, 10-15 задач
INSERT INTO app.departments (name, description) VALUES
('IT Department', 'Information Technology'),
('Marketing', 'Marketing and Communications'),
('Sales', 'Sales Department');

INSERT INTO app.positions (title, level, description) VALUES
('Intern', 1, 'Entry level trainee'),
('Junior Specialist', 2, 'Junior employee'),
('Specialist', 3, 'Regular specialist'),
('Senior Specialist', 4, 'Senior specialist'),
('Manager', 5, 'Team manager');

INSERT INTO app.users (username, email, password_hash, full_name, department_id, position_id) VALUES
('alice', 'alice@company.com', 'hash_alice', 'Alice Johnson', 1, 5),
('bob', 'bob@company.com', 'hash_bob', 'Bob Smith', 1, 4),
('charlie', 'charlie@company.com', 'hash_charlie', 'Charlie Brown', 1, 3),
('diana', 'diana@company.com', 'hash_diana', 'Diana Prince', 2, 3),
('eve', 'eve@company.com', 'hash_eve', 'Eve Wilson', 3, 2);

INSERT INTO app.projects (name, description, owner_id, department_id, status, budget, start_date, end_date) VALUES
('Website Redesign', 'Redesign company website', 1, 1, 'active', 50000.00, '2024-01-01', '2024-06-30'),
('Mobile App', 'Develop mobile application', 1, 1, 'planning', 100000.00, '2024-03-01', '2024-12-31'),
('Marketing Campaign', 'Q2 Marketing Campaign', 4, 2, 'active', 25000.00, '2024-04-01', '2024-06-30');

INSERT INTO app.tasks (project_id, title, description, status, priority, assignee_id, created_by, estimated_hours, due_date) VALUES
(1, 'Design homepage', 'Create new homepage design', 'in_progress', 1, 2, 1, 40.0, '2024-02-15'),
(1, 'Implement navigation', 'Add responsive navigation menu', 'todo', 2, 3, 1, 20.0, '2024-02-20'),
(1, 'Setup CI/CD', 'Configure continuous integration', 'todo', 3, 2, 1, 16.0, '2024-02-25'),
(1, 'Accessibility review', 'Run WCAG checks', 'review', 2, 3, 1, 10.0, '2024-03-01'),
(2, 'Requirements analysis', 'Gather and document requirements', 'done', 1, 1, 1, 24.0, '2024-03-15'),
(2, 'Architecture design', 'Design system architecture', 'in_progress', 1, 2, 1, 32.0, '2024-03-25'),
(2, 'Setup project structure', 'Initialize React Native project', 'todo', 2, 3, 1, 8.0, '2024-04-01'),
(2, 'Build auth screens', 'Implement login and registration UI', 'todo', 2, 2, 1, 18.0, '2024-04-05'),
(3, 'Create content plan', 'Plan content for Q2', 'in_progress', 2, 4, 1, 16.0, '2024-04-10'),
(3, 'Design banners', 'Create banner designs', 'todo', 3, 4, 1, 12.0, '2024-04-15'),
(3, 'Launch ads', 'Start targeted ad campaign', 'todo', 2, 5, 4, 20.0, '2024-04-20');

INSERT INTO app.comments (task_id, user_id, content, is_internal) VALUES
(1, 1, 'Please make sure the design is responsive', false),
(1, 2, 'Working on it, will share mockups soon', false),
(5, 1, 'Requirements approved by stakeholders', false),
(6, 2, 'Need clarification on database choice', true);

INSERT INTO app.task_history (task_id, changed_by, field_name, old_value, new_value) VALUES
(1, 2, 'status', 'todo', 'in_progress'),
(5, 1, 'status', 'in_progress', 'done');

-- Проверка целостности
SELECT COUNT(*) AS departments_count FROM app.departments;
SELECT COUNT(*) AS positions_count FROM app.positions;
SELECT COUNT(*) AS users_count FROM app.users;
SELECT COUNT(*) AS projects_count FROM app.projects;
SELECT COUNT(*) AS tasks_count FROM app.tasks;

-- -----------------------------------------------------
-- ЧАСТЬ 2/3. Иерархия ролей и реализация
-- -----------------------------------------------------
-- Контейнерные роли (NOLOGIN)
CREATE ROLE app_connect NOLOGIN;
CREATE ROLE app_read_all NOLOGIN;
CREATE ROLE app_read_reference NOLOGIN;
CREATE ROLE app_task_worker NOLOGIN;
CREATE ROLE app_internal_comments NOLOGIN;
CREATE ROLE app_history_read NOLOGIN;
CREATE ROLE app_audit_read NOLOGIN;

GRANT CONNECT ON DATABASE corporate_tasks TO app_connect;
GRANT USAGE ON SCHEMA app TO app_connect;

GRANT app_connect TO app_read_all;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_read_all;

GRANT app_connect TO app_read_reference;
GRANT SELECT ON TABLE app.departments, app.positions TO app_read_reference;

GRANT app_connect TO app_task_worker;
GRANT app_read_reference TO app_task_worker;
GRANT SELECT ON TABLE app.tasks, app.projects TO app_task_worker;
GRANT SELECT, INSERT ON TABLE app.comments TO app_task_worker;
GRANT USAGE, SELECT ON SEQUENCE app.comments_comment_id_seq TO app_task_worker;

GRANT SELECT, UPDATE (is_internal) ON TABLE app.comments TO app_internal_comments;
GRANT SELECT ON TABLE app.task_history TO app_history_read;
GRANT SELECT ON TABLE app.access_logs TO app_audit_read;

-- Пользовательские роли
CREATE ROLE app_user WITH LOGIN PASSWORD 'UserPass123!' INHERIT CONNECTION LIMIT 20;
CREATE ROLE app_manager WITH LOGIN PASSWORD 'ManagerPass456!' INHERIT CONNECTION LIMIT 50;
CREATE ROLE app_admin WITH LOGIN PASSWORD 'AdminPass789!' INHERIT CREATEDB CONNECTION LIMIT 10;

-- Иерархия
GRANT app_user TO app_manager;
GRANT app_manager TO app_admin;

-- Назначение контейнеров
GRANT app_connect TO app_user;
GRANT app_read_reference TO app_user;
GRANT app_task_worker TO app_user;
GRANT SELECT (user_id, username, email, full_name, department_id, position_id, is_active) ON TABLE app.users TO app_user;

GRANT app_internal_comments TO app_manager;
GRANT app_history_read TO app_manager;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_manager;
GRANT INSERT, UPDATE ON TABLE app.projects TO app_manager;
GRANT USAGE, SELECT ON SEQUENCE app.projects_project_id_seq TO app_manager;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.tasks TO app_manager;
GRANT USAGE, SELECT ON SEQUENCE app.tasks_task_id_seq TO app_manager;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.comments TO app_manager;
GRANT INSERT ON TABLE app.task_history TO app_manager;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO app_admin;
GRANT CREATE ON SCHEMA app TO app_admin;
GRANT app_audit_read TO app_admin;
GRANT SELECT, INSERT ON TABLE app.access_logs TO app_admin;
GRANT USAGE, SELECT ON SEQUENCE app.access_logs_log_id_seq TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.users TO app_admin;

-- -----------------------------------------------------
-- ЧАСТЬ 3.3. Конкретные пользователи
-- -----------------------------------------------------
CREATE USER dev_alice WITH PASSWORD 'AliceDev123!';
CREATE USER pm_bob WITH PASSWORD 'BobPM456!';
CREATE USER dev_charlie WITH PASSWORD 'CharlieDev789!';
CREATE USER admin_diana WITH PASSWORD 'DianaAdmin012!';
CREATE USER marketing_eve WITH PASSWORD 'EveMarket345!';

GRANT app_user TO dev_alice;
GRANT app_manager TO pm_bob;
GRANT app_user TO dev_charlie;
GRANT app_admin TO admin_diana;
GRANT app_read_all TO marketing_eve;

-- Проверка назначения ролей
SELECT
    r.rolname AS username,
    ARRAY_AGG(m.rolname ORDER BY m.rolname) AS assigned_roles
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.member
JOIN pg_roles m ON am.roleid = m.oid
WHERE r.rolname IN ('dev_alice', 'pm_bob', 'dev_charlie', 'admin_diana', 'marketing_eve')
GROUP BY r.rolname
ORDER BY r.rolname;

-- -----------------------------------------------------
-- ЧАСТЬ 4. Тестирование доступа (запускать вручную)
-- -----------------------------------------------------
-- TEST app_user (dev_alice):
-- \c corporate_tasks dev_alice
-- SELECT * FROM app.departments;                      -- success
-- SELECT * FROM app.positions;                        -- success
-- SELECT * FROM app.projects;                         -- success
-- SELECT * FROM app.tasks;                            -- success
-- INSERT INTO app.comments (task_id, user_id, content) VALUES (1, 1, 'Test comment from user'); -- success
-- UPDATE app.tasks SET status = 'done' WHERE task_id = 1;  -- expected error
-- DELETE FROM app.tasks WHERE task_id = 1;                -- expected error
-- SELECT user_id, username, email, full_name FROM app.users; -- success
-- SELECT * FROM app.access_logs;                           -- expected error

-- TEST app_manager (pm_bob):
-- \c corporate_tasks pm_bob
-- SELECT * FROM app.users;                                 -- success
-- SELECT comment_id, task_id, is_internal FROM app.comments; -- success
-- SELECT * FROM app.task_history;                          -- success
-- INSERT INTO app.projects (name, description, owner_id, department_id, budget)
-- VALUES ('Test Project', 'Testing manager rights', 1, 1, 10000.00); -- success
-- UPDATE app.tasks SET status = 'in_progress' WHERE task_id = 1; -- success
-- DELETE FROM app.tasks WHERE task_id = 2;                      -- success
-- INSERT INTO app.task_history (task_id, changed_by, field_name, old_value, new_value)
-- VALUES (1, 2, 'status', 'todo', 'in_progress');               -- success
-- SELECT * FROM app.access_logs;                                -- expected error

-- TEST app_admin (admin_diana):
-- \c corporate_tasks admin_diana
-- SELECT * FROM app.access_logs;                          -- success
-- UPDATE app.users SET is_active = false WHERE username = 'eve'; -- success
-- CREATE TABLE app.test_admin (id INT, name TEXT);       -- success
-- ALTER TABLE app.test_admin ADD COLUMN created_at TIMESTAMP DEFAULT NOW(); -- success
-- DROP TABLE app.test_admin;                             -- success
-- SELECT rolname, rolsuper, rolcreatedb FROM pg_roles WHERE rolname NOT LIKE 'pg_%'; -- success
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee IN ('app_user', 'app_manager', 'app_admin'); -- success

-- -----------------------------------------------------
-- ЧАСТЬ 5. Аудит
-- -----------------------------------------------------
SELECT
    rolname AS role_name,
    rolsuper AS superuser,
    rolcreatedb AS create_db,
    rolcreaterole AS create_role,
    rolcanlogin AS can_login,
    rolinherit AS inherit,
    rolconnlimit AS conn_limit,
    rolvaliduntil AS valid_until
FROM pg_roles
WHERE rolname LIKE 'app_%'
   OR rolname IN ('dev_alice', 'pm_bob', 'dev_charlie', 'admin_diana', 'marketing_eve')
ORDER BY rolname;

SELECT
    r.rolname AS role_name,
    m.rolname AS inherits_from,
    am.admin_option AS with_admin_option
FROM pg_roles r
JOIN pg_auth_members am ON r.oid = am.member
JOIN pg_roles m ON am.roleid = m.oid
WHERE r.rolname IN ('dev_alice', 'pm_bob', 'dev_charlie', 'admin_diana', 'marketing_eve',
                    'app_user', 'app_manager', 'app_admin')
ORDER BY r.rolname, m.rolname;

SELECT
    grantee,
    table_schema,
    table_name,
    STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE grantee LIKE 'app_%' AND table_schema = 'app'
GROUP BY grantee, table_schema, table_name
ORDER BY grantee, table_name;

SELECT
    usename AS username,
    datname AS database_name,
    client_addr AS ip_address,
    backend_start AS session_start,
    state
FROM pg_stat_activity
WHERE datname = 'corporate_tasks'
ORDER BY backend_start DESC;
