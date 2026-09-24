# HRIS

## Language

- Always use English for communication, source-code identifiers, comments, documentation, commit messages, API descriptions, validation messages, and newly created project content.
- Preserve an external system's required literal values when changing them would break compatibility, but explain those values in English.

## Modules

This is a simple HRIS application with the following modules:

1. Login module using email and password.
2. Master data module:
   - Employees (CRUD).
     Form fields: name, gender, date of birth, email, position, and competencies, including competency selection and certificate upload.
   - Competencies (CRUD).
     Form fields: competency name and grade (`A`, `B`, `C`, or `D`).
3. Dashboard:
   - Current employee count.
   - Employee counts for specific positions: Junior Programmer, Mid-level Programmer, and Senior Programmer.
   - Employee counts for specific competencies such as Spring Boot, ReactJS, and Node.js.
   - Number of new employees within the last 1 and 3 months

## Technology

- Use separate frontend and backend applications.
- Provide two backend implementations: Node.js and Spring Boot.
- Use ReactJS for the frontend.
- Use PostgreSQL for the database.

## Project Structure and Development Plan

- Use one repository—a monorepo—so the frontend, both backend implementations, database schema, and API documentation remain aligned.
- Recommended directory structure:

  ```text
  hris/
  ├── frontend/            # ReactJS application
  ├── backend-node/        # Node.js API implementation
  ├── backend-springboot/  # Spring Boot API implementation
  ├── database/            # PostgreSQL schema, migrations, and seed data
  ├── docs/                # API contract and project documentation
  ├── docker-compose.yml   # Optional: PostgreSQL and supporting services
  └── README.md
  ```

- Both backends must provide the same API contract: endpoints, authentication, validation, and request/response formats. Store the contract in `docs/`; OpenAPI/Swagger is recommended.
- Keep each application's dependencies in its own directory. Node.js and Spring Boot must not share dependencies or build configuration.
- During development, run the frontend and only one backend at a time. Node.js and Spring Boot do not need to run simultaneously except when comparing the implementations.
- Run the entire project in WSL. Keep the source code in the WSL Linux filesystem—for example, `~/compnet/hris`—use VS Code Remote - WSL from Windows, and access applications in a Windows browser through `localhost`.
- With 16 GB of RAM, limit WSL resources if necessary and avoid running both backends simultaneously. PostgreSQL, the React frontend, and one backend are sufficient for everyday development.
