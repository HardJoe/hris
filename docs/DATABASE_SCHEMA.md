# Database Schema and Seed Data

PostgreSQL stores the HRIS data. TypeORM migrations define the schema and
`backend-node/src/database/seed.ts` supplies development data.

## Tables Used by the Seed

| Table                   | Seeded records | Notes                                                                                                                                                                    |
| ----------------------- | -------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`                 |              1 | The bootstrap administrator is created only when `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are configured. The password is stored only as an Argon2id hash. |
| `competencies`          |              3 | `Spring Boot`, `ReactJS`, and `Node.js`.                                                                                                                                 |
| `employees`             |              6 | All sample employees are active and cover every supported position.                                                                                                      |
| `employee_competencies` |             11 | Each row assigns one competency and proficiency grade to an employee. One assignment includes a PDF certificate.                                                         |

## Seeded Employees

The seed uses the email address as its idempotency key. It creates an employee
only when that exact email is absent. Its known competency assignments are
upserted so their seed grades remain consistent. `hired_at` is set only when an
employee is first created and then persists as a normal date.

| Name          | Email                       | Position            | Gender   | Hired at     |
| ------------- | --------------------------- | ------------------- | -------- | ------------ |
| Avery Chen    | `avery.chen@example.com`    | `JUNIOR_PROGRAMMER` | `FEMALE` | `2026-09-10` |
| Mateo Santos  | `mateo.santos@example.com`  | `MID_PROGRAMMER`    | `MALE`   | `2026-08-10` |
| Priya Nair    | `priya.nair@example.com`    | `SENIOR_PROGRAMMER` | `FEMALE` | `2026-07-06` |
| Jordan Lee    | `jordan.lee@example.com`    | `JUNIOR_PROGRAMMER` | `MALE`   | `2026-05-07` |
| Sofia Kim     | `sofia.kim@example.com`     | `MID_PROGRAMMER`    | `FEMALE` | `2026-03-08` |
| Daniel Brooks | `daniel.brooks@example.com` | `SENIOR_PROGRAMMER` | `MALE`   | `2025-10-29` |

This spread gives the dashboard two employees in each position and meaningful
one-month and three-month new-hire counts.

## Seeded Competency Assignments

| Employee      | Spring Boot | ReactJS | Node.js |
| ------------- | ----------- | ------- | ------- |
| Avery Chen    | —           | B       | D       |
| Mateo Santos  | B           | A       | —       |
| Priya Nair    | A           | —       | A       |
| Jordan Lee    | —           | —       | B       |
| Sofia Kim     | C           | B       | —       |
| Daniel Brooks | A           | —       | A       |

The grades (`A` through `D`) belong to `employee_competencies`, not to the
competency master record. Priya Nair's Spring Boot assignment has
`priya-nair-spring-boot-certificate.pdf` (`application/pdf`, 39 bytes); its
other certificate metadata fields are populated. All other seeded assignments
have `NULL` certificate metadata.

## Running the Seed

The backend container applies migrations and then runs the seed during normal
startup. To run it explicitly from the host, use the backend's `seed` script
from a container connected to the Compose network. Ensure the database role
password stored in the existing PostgreSQL volume matches `DATABASE_URL` before
running it.
