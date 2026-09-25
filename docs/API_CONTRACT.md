# HRIS REST API Contract

This is the shared HTTP contract for `backend-node` and `backend-springboot`.
Both implementations must expose the same routes, validation, response bodies,
and status codes. The machine-readable OpenAPI document is at `/docs/openapi.json`.

## Conventions

- Base path: `/api/v1`
- JSON requests/responses use `Content-Type: application/json`.
- All business routes except `POST /auth/login` require
  `Authorization: Bearer <access-token>`; health routes are public.
- IDs are UUID v4 values. Dates use `YYYY-MM-DD`; timestamps are ISO 8601 UTC.
- `DELETE` returns no body. Certificate download returns raw file bytes.

### Success envelope

All JSON success responses use `data`:

```json
{ "data": {} }
```

Lists are paginated:

```json
{
  "data": {
    "items": [],
    "meta": { "page": 1, "limit": 20, "totalItems": 0, "totalPages": 0 }
  }
}
```

### Error envelope

Every JSON error has this shape. `message` is a string for business errors or
an array when multiple validation errors apply.

```json
{
  "error": {
    "statusCode": 400,
    "code": "BadRequestException",
    "message": ["email must be an email"],
    "timestamp": "2026-09-25T08:30:00.000Z",
    "path": "/api/v1/employees"
  }
}
```

Every protected route can also return `401 UnauthorizedException` for a
missing, invalid, or expired bearer token, and `500 INTERNAL_SERVER_ERROR` for
an unexpected error (with sanitized message). Database conflicts use these
stable errors:

| Status | Code | Message |
| --- | --- | --- |
| 409 | `DUPLICATE_RESOURCE` | `A resource with the same unique value already exists` |
| 409 | `RESOURCE_IN_USE` | `The resource is still referenced by another resource` |

### Values and pagination

| Field | Values / rules |
| --- | --- |
| `gender` | `MALE`, `FEMALE` |
| `position` | `JUNIOR_PROGRAMMER`, `MID_PROGRAMMER`, `SENIOR_PROGRAMMER` |
| `status` | `ACTIVE`, `INACTIVE`; defaults to `ACTIVE` on employee creation |
| competency `grade` | `A`, `B`, `C`, `D` |
| `page` | Integer ≥ 1; default `1` |
| `limit` | Integer 1–100; default `20` |

Employee resource shape:

```json
{
  "id": "1397e6d1-0c21-4880-b6bf-bc2137eb1b8c",
  "name": "Ayu Pratama",
  "gender": "FEMALE",
  "dateOfBirth": "1995-08-17",
  "email": "ayu@example.com",
  "position": "MID_PROGRAMMER",
  "status": "ACTIVE",
  "hiredAt": "2026-09-01",
  "competencies": [{
    "id": "4c579f55-239a-4c53-87b5-bb1fa80bc09b",
    "name": "Spring Boot",
    "grade": "A",
    "certificate": { "available": false, "originalName": null, "mimeType": null, "size": null }
  }],
  "createdAt": "2026-09-25T08:30:00.000Z",
  "updatedAt": "2026-09-25T08:30:00.000Z"
}
```

Competency resource shape:

```json
{
  "id": "4c579f55-239a-4c53-87b5-bb1fa80bc09b",
  "name": "Spring Boot",
  "createdAt": "2026-09-25T08:30:00.000Z",
  "updatedAt": "2026-09-25T08:30:00.000Z"
}
```

## Authentication

### `POST /auth/login`

Authenticates an active administrator; no bearer token is required. This route
is limited to five requests per minute.

Request:

```json
{ "email": "admin@example.com", "password": "a-secret-password" }
```

`email` must be valid and at most 254 characters; it is trimmed and lowercased.
`password` must be a string with 8–128 characters.

Success — `200 OK`:

```json
{ "data": { "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": "15m" } }
```

Errors: `400 BadRequestException` for invalid input; `401 UnauthorizedException`
for invalid credentials/inactive user; `429 ThrottlerException` for rate limiting.

## Employees

### `GET /employees`

Returns employees ordered by name; each employee's competencies are ordered by
competency name. Optional query parameters: `page`, `limit`, `search`,
`position`, `status`, and `competencyId`. `search` is a case-insensitive
partial match against employee name/email (max 150 chars); `competencyId` is a UUID.

Example request: `GET /api/v1/employees?page=1&limit=20&position=MID_PROGRAMMER`

Success — `200 OK`:

```json
{
  "data": {
    "items": [{ "id": "1397e6d1-0c21-4880-b6bf-bc2137eb1b8c", "name": "Ayu Pratama", "competencies": [] }],
    "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
  }
}
```

Items have the complete employee shape above. Error: `400 BadRequestException`
for invalid pagination, enum, search, or competency UUID.

### `POST /employees`

Creates an employee and optional initial competency assignments in one transaction.

Request:

```json
{
  "name": "Ayu Pratama",
  "gender": "FEMALE",
  "dateOfBirth": "1995-08-17",
  "email": "ayu@example.com",
  "position": "MID_PROGRAMMER",
  "status": "ACTIVE",
  "hiredAt": "2026-09-01",
  "competencies": [{ "competencyId": "4c579f55-239a-4c53-87b5-bb1fa80bc09b", "grade": "A" }]
}
```

Required fields: `name`, `gender`, `dateOfBirth`, `email`, `position`, and
`hiredAt`. `status` and `competencies` are optional. Name is normalized by
trimming/collapsing whitespace (2–150 characters); email is trimmed/lowercased.
Each competency ID may appear once only. Birth date must be in the past and
before hire date; hire date cannot be in the future.

Success — `201 Created`: `{ "data": <employee> }`.

Errors: `400 BadRequestException` for invalid fields/dates, duplicate assignment,
or unknown competency; `409 DUPLICATE_RESOURCE` if the email already exists.

### `GET /employees/{id}`

Returns a non-deleted employee.

Success — `200 OK`: `{ "data": <employee> }`.

Errors: `400 BadRequestException` for an invalid UUID; `404 NotFoundException`
with `Employee not found` when absent or soft-deleted.

### `PATCH /employees/{id}`

Updates only supplied fields; supplied fields use creation validation. If
`competencies` is supplied, it replaces the entire assignment set: omitted
assignments (and their certificates) are removed, existing grades are updated,
and new assignments are created. Omit it to preserve assignments.

Request:

```json
{ "position": "SENIOR_PROGRAMMER", "competencies": [{ "competencyId": "4c579f55-239a-4c53-87b5-bb1fa80bc09b", "grade": "B" }] }
```

Success — `200 OK`: `{ "data": <employee> }`.

Errors: `400 BadRequestException` for invalid ID/body/date relationship,
duplicate assignment, or unknown competency; `404 NotFoundException` with
`Employee not found`; `409 DUPLICATE_RESOURCE` if the email is already used.

### `DELETE /employees/{id}`

Soft-deletes the employee, removes all assignments, and removes attached files.

Success — `204 No Content`.

Errors: `400 BadRequestException` for invalid UUID; `404 NotFoundException`
with `Employee not found` when absent.

### `PUT /employees/{employeeId}/competencies/{competencyId}`

Creates or changes one competency assignment. Repeating an identical request is idempotent.

Request:

```json
{ "grade": "A" }
```

Success — `200 OK`: `{ "data": <employee> }`.

Errors: `400 BadRequestException` for invalid UUID/grade, or with `One or more
competencies do not exist` for an unknown competency; `404 NotFoundException`
with `Employee not found` for an absent employee.

### `DELETE /employees/{employeeId}/competencies/{competencyId}`

Removes one assignment and its certificate, if any.

Success — `204 No Content`.

Errors: `400 BadRequestException` for invalid UUID; `404 NotFoundException`
with `Employee not found` or `Employee competency assignment not found`.

### `POST /employees/{employeeId}/competencies/{competencyId}/certificate`

Uploads or replaces a certificate for an existing employee-competency assignment.
Send `multipart/form-data` with one required binary part named `certificate`;
there is no JSON body. Allowed content signatures: PDF, JPEG, PNG. Maximum
file size is server-configured (5 MiB by default); filename/MIME header alone
is not trusted.

Success — `201 Created`: `{ "data": <employee> }`. The returned assignment
sets `certificate.available` to `true` and includes original name, MIME type,
and size.

Errors: `400 BadRequestException` for missing, invalid, oversize file or invalid
UUID; `404 NotFoundException` for absent employee, competency, or assignment.

### `GET /employees/{employeeId}/competencies/{competencyId}/certificate`

Downloads raw certificate bytes for an assignment. Response includes the stored
MIME type and `Content-Disposition: attachment` header.

Success — `200 OK`: PDF, JPEG, or PNG bytes (not JSON).

Errors: `400 BadRequestException` for invalid UUID; `404 NotFoundException`
with `Employee not found` or `Certificate not found`.

## Competencies

### `GET /competencies`

Returns competencies ordered by name. Optional query parameters: `page`,
`limit`, `search`; `search` is a case-insensitive partial name match (max 100 chars).

Example request: `GET /api/v1/competencies?page=1&limit=20&search=Spring`

Success — `200 OK`:

```json
{
  "data": {
    "items": [{ "id": "4c579f55-239a-4c53-87b5-bb1fa80bc09b", "name": "Spring Boot", "createdAt": "2026-09-25T08:30:00.000Z", "updatedAt": "2026-09-25T08:30:00.000Z" }],
    "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
  }
}
```

Errors: `400 BadRequestException` for invalid pagination or search input.

### `POST /competencies`

Request:

```json
{ "name": "Spring Boot" }
```

`name` is required, normalized by trimming/collapsing whitespace, and must be
2–100 characters.

Success — `201 Created`: `{ "data": <competency> }`.

Errors: `400 BadRequestException` for invalid name; `409 DUPLICATE_RESOURCE`
when the name already exists.

### `GET /competencies/{id}`

Success — `200 OK`: `{ "data": <competency> }`.

Errors: `400 BadRequestException` for invalid UUID; `404 NotFoundException`
with `Competency not found` when absent.

### `PATCH /competencies/{id}`

Updates supplied fields only; `name` follows creation normalization/validation.

Request:

```json
{ "name": "React JS" }
```

Success — `200 OK`: `{ "data": <competency> }`.

Errors: `400 BadRequestException` for invalid ID/body; `404 NotFoundException`
with `Competency not found`; `409 DUPLICATE_RESOURCE` for an existing name.

### `DELETE /competencies/{id}`

Deletes an unreferenced competency.

Success — `204 No Content`.

Errors: `400 BadRequestException` for invalid UUID; `404 NotFoundException`
with `Competency not found`; `409 RESOURCE_IN_USE` when an employee assignment
still references it.

## Dashboard

### `GET /dashboard/summary`

Returns metrics calculated from active, non-deleted employees. Position counts
always contain all supported positions. Competency counts include every
competency, including zero-count records, sorted by name. New-hire counts use
rolling one- and three-month intervals ending today.

Success — `200 OK`:

```json
{
  "data": {
    "totalEmployees": 6,
    "employeesByPosition": { "JUNIOR_PROGRAMMER": 2, "MID_PROGRAMMER": 2, "SENIOR_PROGRAMMER": 2 },
    "employeesByCompetency": [{ "competencyId": "4c579f55-239a-4c53-87b5-bb1fa80bc09b", "name": "Spring Boot", "count": 3 }],
    "newEmployees": { "lastOneMonth": 1, "lastThreeMonths": 3 }
  }
}
```

## Health

Health endpoints are unauthenticated.

### `GET /health/live`

Success — `200 OK`:

```json
{ "data": { "status": "ok" } }
```

### `GET /health/ready`

Executes a lightweight database query.

Success — `200 OK`:

```json
{ "data": { "status": "ready" } }
```

When the database is unavailable, this returns `500 INTERNAL_SERVER_ERROR` in
the shared error envelope.
