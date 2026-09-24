CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN CREATE TYPE competency_grade AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_gender AS ENUM ('MALE', 'FEMALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_position AS ENUM ('JUNIOR_PROGRAMMER', 'MID_PROGRAMMER', 'SENIOR_PROGRAMMER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employment_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL,
  password_hash varchar(255) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  grade competency_grade NOT NULL DEFAULT 'D',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_competencies_name_lower ON competencies (LOWER(name));

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  gender employee_gender NOT NULL,
  date_of_birth date NOT NULL,
  email varchar(254) NOT NULL,
  position employee_position NOT NULL,
  status employment_status NOT NULL DEFAULT 'ACTIVE',
  hired_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT ck_employees_dates CHECK (date_of_birth < hired_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_email_lower ON employees (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_employees_status_position ON employees (status, position) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_hired_at ON employees (hired_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS employee_competencies (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE RESTRICT,
  grade competency_grade NOT NULL DEFAULT 'D',
  certificate_stored_name varchar(255),
  certificate_original_name varchar(255),
  certificate_mime_type varchar(100),
  certificate_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, competency_id),
  CONSTRAINT ck_certificate_size CHECK (certificate_size IS NULL OR certificate_size > 0)
);
CREATE INDEX IF NOT EXISTS idx_employee_competencies_competency ON employee_competencies (competency_id);

INSERT INTO competencies (name, grade) VALUES ('Spring Boot', 'D'), ('ReactJS', 'D'), ('Node.js', 'D')
ON CONFLICT DO NOTHING;
