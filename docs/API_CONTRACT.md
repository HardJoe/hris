# HRIS REST API Contract

Base path: `/api/v1`  
Content type: `application/json`, except certificate upload/download.  
Authentication: `Authorization: Bearer <access-token>` for every business endpoint.

The running NestJS service also exposes an OpenAPI document at `/docs/openapi.json` when `SWAGGER_ENABLED=true`. The future Spring Boot service must preserve the routes, enum values, validation behavior, envelopes, and status codes described here.

## Response format

Successful JSON responses are wrapped as:

```json
{ "data": {} }
```

List responses place pagination inside `data`:

```json
{
  "data": {
    "items": [],
    "meta": { "page": 1, "limit": 20, "totalItems": 0, "totalPages": 0 }
  }
}
```

Errors use:

```json
{
  "error": {
    "statusCode": 400,
    "code": "BadRequestException",
    "message": ["validation message"],
    "timestamp": "2026-09-23T00:00:00.000Z",
    "path": "/api/v1/employees"
  }
}
```

## Enums

- Gender: `MALE`, `FEMALE`
- Position: `JUNIOR_PROGRAMMER`, `MID_PROGRAMMER`, `SENIOR_PROGRAMMER`
- Employment status: `ACTIVE`, `INACTIVE`
- Competency grade: `A`, `B`, `C`, `D`

Dates use ISO `YYYY-MM-DD`. Identifiers use UUID v4.

## Endpoints

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/auth/login` | Login with email/password | 200 |
| GET | `/employees` | Paginated/filterable employees | 200 |
| POST | `/employees` | Create employee and optional assignments | 201 |
| GET | `/employees/{id}` | Get employee | 200 |
| PATCH | `/employees/{id}` | Partially update employee | 200 |
| DELETE | `/employees/{id}` | Soft-delete employee | 204 |
| PUT | `/employees/{employeeId}/competencies/{competencyId}` | Idempotently assign competency | 200 |
| DELETE | `/employees/{employeeId}/competencies/{competencyId}` | Remove assignment and certificate | 204 |
| POST | `/employees/{employeeId}/competencies/{competencyId}/certificate` | Upload/replace `certificate` form part | 201 |
| GET | `/employees/{employeeId}/competencies/{competencyId}/certificate` | Authenticated attachment download | 200 |
| GET | `/competencies` | Paginated/filterable competencies | 200 |
| POST | `/competencies` | Create competency | 201 |
| GET | `/competencies/{id}` | Get competency | 200 |
| PATCH | `/competencies/{id}` | Partially update competency | 200 |
| DELETE | `/competencies/{id}` | Delete unreferenced competency | 204 |
| GET | `/dashboard/summary` | Aggregate current employee metrics | 200 |
| GET | `/health/live` | Process liveness | 200 |
| GET | `/health/ready` | Database readiness | 200 |

Employee list query parameters: `page`, `limit` (maximum 100), `search`, `position`, `status`, `competencyId`.

Competency list query parameters: `page`, `limit` (maximum 100), `search`, `grade`.

Create employee body:

```json
{
  "name": "Ayu Pratama",
  "gender": "FEMALE",
  "dateOfBirth": "1995-08-17",
  "email": "ayu@example.com",
  "position": "MID_PROGRAMMER",
  "status": "ACTIVE",
  "hiredAt": "2026-09-01",
  "competencyIds": ["4c579f55-239a-4c53-87b5-bb1fa80bc09b"]
}
```

Create competency body:

```json
{ "name": "Spring Boot", "grade": "A" }
```

Login body and result:

```json
{ "email": "admin@example.com", "password": "a-secret-password" }
```

```json
{
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  }
}
```

Certificate policy: one file per employee/competency assignment, maximum configured size (5 MiB by default), allowed content signatures PDF/JPEG/PNG. Sending only a misleading filename or MIME header is rejected.

Common failure codes: `400` invalid request/file, `401` invalid or missing credentials, `404` missing resource, `409` duplicate/in-use resource, `429` rate limited, `500` sanitized internal error.

