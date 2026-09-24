# HRIS Frontend — Interviewer Overview

The HRIS frontend is a responsive Next.js 16 App Router application written in strict TypeScript. It implements login, workforce dashboard metrics, complete employee and competency management, employee proficiency grades, and authenticated certificate upload/download against the shared API contract.

## Architecture

The application uses a small Backend-for-Frontend boundary:

```text
Browser -> same-origin Next.js route handler -> HRIS REST API -> PostgreSQL
```

After login, the short-lived backend JWT is stored in an `HttpOnly`, `SameSite=Strict` cookie and is added to upstream requests only on the Next.js server. It is never exposed to client JavaScript or browser storage. The gateway permits only documented HRIS routes/methods, checks mutation origins, caps request sizes, forwards minimal headers, disables response caching, and clears invalid sessions on `401`.

Server Components provide layouts, metadata, and the protected route boundary. Focused Client Components handle filters, forms, confirmations, uploads, and refreshes. Shared TypeScript types mirror the enums, envelopes, pagination, and resources in [the API contract](API_CONTRACT.md).

## UX and implementation choices

- Clean, dependency-light interface built with reusable CSS tokens and semantic HTML.
- Responsive navigation, dashboards, tables, forms, badges, empty/loading/error states, and confirmation dialogs.
- Employee search and filters map directly to server pagination parameters.
- Employee JSON is saved before separate certificate uploads, matching the API's retry-friendly contract.
- Accessible labels, keyboard focus, live error/status regions, semantic tables, and descriptive controls.
- Date-only values are rendered in UTC to avoid timezone shifts.

The project deliberately avoids a UI framework, global state store, and client cache because the current scope does not need their complexity.

## Quality

Vitest and React Testing Library cover security helpers, API envelope/error handling, login behavior, and employee list/search integration. The enforced checks are:

```bash
npm run frontend:lint
npm run frontend:typecheck
npm run frontend:test
npm run frontend:build
```

Run the backend on port 3000, start the frontend with `npm run frontend:dev`, and open `http://localhost:3001`. The server-only `HRIS_API_URL` defaults to `http://localhost:3000/api/v1` and can be overridden through `frontend/.env.local`.
