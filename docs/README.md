# HRIS Node.js Backend — Technical Overview

This page covers the Node implementation. The equivalent Java implementation is summarized in [Spring Boot Backend — Interviewer Overview](SPRING_BOOT.md).

Related documentation: [API contract](API_CONTRACT.md), [database schema and seed data](DATABASE_SCHEMA.md), and [project assumptions](ASSUMPTIONS.md).

## What is implemented

- Administrator login using email/password and short-lived JWT access tokens.
- Employee CRUD with filtering, pagination, soft deletion, status, position, hire date, and competency assignments.
- Competency CRUD and employee-specific competency proficiency grades A–D.
- Authenticated certificate upload/download for PDF, JPEG, and PNG files.
- Dashboard metrics for active headcount, position, competency, and hires in the last one/three calendar months.
- PostgreSQL migration and idempotent seed process.
- Production-style multi-stage image and a health-checked Docker Compose stack.

## Architecture

The application follows a conventional layered structure:

```text
HTTP request
  -> Controller (transport and validation)
  -> Service (use-case and transaction boundary)
  -> TypeORM Repository (persistence)
  -> PostgreSQL
```

Modules are grouped by business capability (`auth`, `employees`, `competencies`, `dashboard`) rather than technical file type. DTOs define input contracts, services hold business rules, entities define persistence, and controllers only coordinate HTTP concerns.

NestJS was selected because its dependency injection and controller/service/module model has a direct conceptual mapping to Spring Boot. TypeORM was selected over Prisma because its entity/repository/transaction model maps more directly to JPA/Hibernate.

| Node.js implementation | Spring Boot implementation |
| --- | --- |
| Nest module | Spring configuration/package boundary |
| Controller decorator | `@RestController` |
| Injectable service | `@Service` |
| TypeORM entity | JPA `@Entity` |
| TypeORM repository | Spring Data `JpaRepository` |
| DTO + class-validator | Record/class + Jakarta Validation |
| Passport JWT guard | Spring Security filter chain |
| Exception filter | `@RestControllerAdvice` |
| TypeORM migration | Flyway migration |

## Security choices

- Passwords use Argon2id; password hashes are excluded from ordinary repository selects.
- Login has a stricter rate limit and uses a dummy hash for unknown users to reduce timing leakage.
- JWT validates signature, algorithm, issuer, audience, expiry, and current user status.
- Incoming DTOs are allowlisted; unknown properties are rejected.
- Duplicate and foreign-key errors are normalized without leaking SQL details.
- Helmet security headers and an explicit CORS origin allowlist are enabled.
- Certificate size is capped, content signatures are checked, random server-side names are used, and files are never exposed as a public static directory.
- PostgreSQL is only exposed to the internal Compose network. The API binds to loopback by default.
- The API container runs as a non-root user with a read-only root filesystem, dropped Linux capabilities, and `no-new-privileges`.
- Runtime dependencies were audited with zero known vulnerabilities at implementation time.

For a production deployment, add TLS at the ingress, managed secrets, malware scanning/quarantine for uploads, centralized audit logs, object storage, backup/restore drills, and key rotation. These are deployment concerns deliberately not simulated inside this small project.

## Notable domain decisions

- `hiredAt` is explicit because “new employee in the last month” cannot be derived correctly from a record creation timestamp.
- “Current employees” means non-deleted employees with status `ACTIVE`.
- Deleting an employee is a soft delete; associated certificate files and assignments are removed.
- Competency grade represents the employee's proficiency and belongs to `employee_competencies`; the competency master only defines the skill.
- Certificate upload is a separate endpoint. A frontend can first save the employee and assignments, then upload each selected file with clear retry/error behavior.

## Quality controls

The repository includes strict TypeScript, ESLint type-aware rules, formatting, unit tests for file security, database constraints, explicit migrations, container healthchecks, and runtime readiness/liveness endpoints. The implementation was exercised end to end through Docker for authentication, authorization, CRUD, upload/download, conflict mapping, and dashboard aggregation.
