# Spring Boot Backend — Interviewer Overview

The Spring Boot service is a second implementation of the same HRIS contract used by the React frontend and NestJS backend. Switching implementations does not require frontend changes: routes, enum values, validation rules, JWT claims, response envelopes, status codes, pagination, and certificate behavior remain aligned with [the API contract](API_CONTRACT.md).

## Design

```text
HTTP -> Controller -> Service / transaction -> Spring Data repository -> PostgreSQL
```

Packages are grouped by capability: `auth`, `employee`, `competency`, `dashboard`, and `health`. Controllers handle transport concerns, Jakarta Validation checks DTO shape, services own business rules and transaction boundaries, and JPA entities model persistence. Flyway can create a new schema and can baseline an existing schema previously managed by the Node implementation.

Key implementation choices:

- Spring Boot 4.1.1 and Java 21, with constructor injection and immutable record DTOs.
- Spring Security resource server validates HS256 signature, expiry, issuer, audience, and current user status.
- Argon2id hashes remain compatible with the Node implementation.
- Employees are soft-deleted; assignment grades and certificate metadata live on the join entity.
- Certificate content is verified by magic bytes, stored under random names, and downloaded only through authenticated endpoints.
- Dashboard counts include active, non-deleted employees and use `hiredAt` for recent-hire metrics.
- PostgreSQL connections are capped at five; the container JVM and Compose service are memory constrained for WSL.

## Quality

Fast unit tests cover authentication outcomes and token lifetime parsing, employee date and assignment rules, competency CRUD behavior, certificate signature/path handling, dashboard aggregation, seed behavior, pagination, response wrapping, and sanitized error mapping. JaCoCo enforces 85% line and 70% branch coverage over executable application behavior; declarative controllers, DTOs, JPA entities, repositories, configuration, and enum-only classes are excluded.

Run the lightweight suite with:

```bash
cd backend-springboot
MAVEN_OPTS="-Xmx768m" mvn -T1 test
```

Use `docker compose -f docker-compose.springboot.yml up --build -d` for a full PostgreSQL-backed demonstration. Do not run it alongside the Node backend because both intentionally bind to port 3000.
