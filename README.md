# HRIS Monorepo

The repository contains a security-focused Next.js frontend and Node.js API built with NestJS, TypeORM, PostgreSQL, and Docker. Its module boundaries and API contract are intentionally designed to map cleanly to a future Spring Boot implementation.

## Quick start

Requirements: Docker Engine with Docker Compose.

```bash
cp backend-node/.env.example backend-node/.env
```

Replace every `REPLACE_WITH_...` value in `backend-node/.env`. Generate the JWT secret with, for example, `openssl rand -base64 48`. Then start the stack:

```bash
docker compose up --build -d
docker compose ps
npm install
npm run frontend:dev
```

The frontend is available at `http://localhost:3001`, and the API is available at `http://localhost:3000/api/v1`. When `SWAGGER_ENABLED=true`, Swagger UI is at `http://localhost:3000/docs`.

Useful commands:

```bash
npm install
npm run backend:build
npm run backend:lint
npm run backend:test
npm run frontend:lint
npm run frontend:typecheck
npm run frontend:test
npm run frontend:build
docker compose logs -f backend-node
docker compose down
```

Do not commit `backend-node/.env`. Use a secret manager and set `SWAGGER_ENABLED=false` outside a controlled development environment.

See [the backend interviewer overview](docs/README.md), [the frontend interviewer overview](docs/FRONTEND.md), and [the API contract](docs/API_CONTRACT.md).
