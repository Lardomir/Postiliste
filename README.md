# Postiliste – M324 DevOps project

Postiliste is a small persistent **shopping list (Einkaufsliste)** built with ExpressJS for ICT module M324. Users can add products with an optional quantity, mark products as purchased/open again, and remove them from the list.

The project demonstrates project management with GitHub, automated tests, linting/formatting, Git hooks, Docker, PostgreSQL and a Jenkins CI/CD pipeline.

## Product quick guide

1. Open `http://localhost:3000`.
2. Enter a product, for example `Milch`.
3. Optionally enter a quantity, for example `2 l`.
4. Select **Hinzufügen**.
5. Select **Gekauft** when the product has been bought.
6. Use **Wieder offen** to put it back on the active shopping list.
7. Use **Entfernen** to delete it.
8. `GET /health` returns a health response for Docker/CI checks.

## Architecture

```text
Browser
  |
  | HTTP forms / HTML
  v
Express app (app.js)
  |
  | shopping-item validation
  v
Shopping repository
  |                     |
  | local/test           | Docker/production
  v                     v
SQLite              PostgreSQL container
```

- `app.js` contains the HTTP routes.
- `views/index.html` renders the shopping list with Nunjucks.
- `shoppingItem.js` validates and normalizes product name and quantity.
- `shoppingRepository.js` provides the SQLite implementation for development/integration tests.
- `postgresShoppingRepository.js` provides the PostgreSQL implementation used by Docker production.
- `repositoryFactory.js` selects PostgreSQL when `DATABASE_URL` exists; otherwise it uses SQLite.
- `server.js` starts the HTTP server.
- Database migrations run automatically during startup.

The main database entity is `shopping_items` with product name, optional quantity, purchased state and creation time.

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm
- Git
- Docker Desktop / Docker Engine for container workflows

## Developer setup

After cloning the repository:

```bash
npm install
npm run serve
```

The development server runs at `http://localhost:3000` and stores data in local SQLite by default.

For the prepared development setup:

```bash
npm run dev-setup
```

This installs the dependencies and builds the Docker environment.

## npm commands

| Command | Purpose | When to use it |
| --- | --- | --- |
| `npm start` | Start the Node server | Production/container runtime |
| `npm run serve` | Start with Nodemon | During development |
| `npm test` | Run Jest unit + integration tests | Before commits and in CI |
| `npm run lint` | Validate JavaScript with ESLint | While coding / before commits |
| `npm run format` | Format files with Prettier | After editing |
| `npm run format:check` | Check formatting without changing files | Before commits and in CI |
| `npm run check` | Run lint, formatting check and tests | Main local quality gate |
| `npm run dev-setup` | Install dependencies and build Docker | After a fresh checkout |
| `npm run docker:build` | Build `postiliste:local` | Before a manual container release |
| `npm run docker:up` | Start the Compose production environment | Production-like testing |

## Code quality and pre-commit hook

ESLint is configured in `eslint.config.js`; Prettier handles formatting. Husky installs `.husky/pre-commit` using the `prepare` npm script.

Every commit runs:

```bash
npm run check
```

Only commit when linting, formatting and tests are green.

## Testing

Run:

```bash
npm test
```

`tests/shoppingItem.test.js` fully tests the important shopping-item validation function with valid input, optional values, boundaries and invalid input.

`tests/shoppingRepository.integration.test.js` uses a real temporary SQLite database without mocking the database. It verifies that shopping items and quantities are persisted and that purchased/delete operations work correctly.

For the complete quality gate:

```bash
npm run check
```

## Data model and migrations

The application automatically creates the required schema on startup. The current shopping-list migration creates:

```text
shopping_items
- id
- name
- quantity
- purchased
- created_at
```

Schema versions are recorded in `schema_migrations`.

Migration version 2 introduces the shopping-list schema. This is intentional: earlier development builds used the wrong Post-it concept. Existing development databases can therefore be upgraded safely without manual SQL; the old table is ignored by the application.

## Production Docker environment

The production-like Docker setup contains two separate containers:

1. **postiliste** – the Node/Express web application.
2. **postgres** – the external PostgreSQL database.

Build and start them:

```bash
docker compose up --build -d
```

Follow logs:

```bash
docker compose logs -f
```

Open `http://localhost:3000`.

Stop the environment while preserving shopping data:

```bash
docker compose down
```

Start it again and the shopping list remains available because PostgreSQL uses a managed Docker volume.

Only delete the persistent data intentionally with:

```bash
docker compose down -v
```

### Manual production image

```bash
docker build -f docker/webapp/Dockerfile -t postiliste:1.0.0 .
```

The application source and runtime dependencies are contained in the image. No source-code bind volume is required.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port used by Node |
| `DATABASE_URL` | unset | PostgreSQL connection string; selects PostgreSQL when present |
| `DB_PATH` | `./data/postiliste.db` | SQLite file used when `DATABASE_URL` is absent |
| `NODE_ENV` | development / production | Runtime environment |
| `POSTGRES_DB` | `postiliste` in Compose | PostgreSQL database name |
| `POSTGRES_USER` | configured in Compose | PostgreSQL user |
| `POSTGRES_PASSWORD` | configured in Compose | PostgreSQL password |

`.env.example` documents configurable values. Real credentials or API keys must not be committed.

## CI/CD with Jenkins

A reproducible Jenkins environment is included in `docker/jenkins/`.

Start Jenkins:

```bash
cd docker/jenkins
docker compose up --build -d
```

Open `http://localhost:8080`, finish the initial setup and create a **Pipeline from SCM** job for this repository. Configure GitHub credentials/token in Jenkins and use `Jenkinsfile` as the pipeline script path.

The Jenkins pipeline:

1. checks out the GitHub repository,
2. starts a clean Node 24 container,
3. installs dependencies,
4. runs `npm run check`,
5. builds the production Docker image,
6. starts/replaces the local production environment with Docker Compose.

Jenkins polls the repository regularly, so pushes can trigger the pipeline automatically. The local Jenkins container mounts the Docker socket because it needs to build/start containers; this is intended for the school/dev environment.

## Release procedure

1. Ensure the related GitHub issues meet their Definition of Done.
2. Run `npm install` if dependencies changed and commit the lock-file update.
3. Run `npm run format`.
4. Run `npm run check`.
5. Run `docker compose up --build` and verify the shopping-list UI and PostgreSQL persistence.
6. Run the Jenkins pipeline successfully.
7. Merge the reviewed feature branch through a pull request.
8. Create a version tag such as `v1.0.0`.
9. Build the release image using the version as its image tag.
10. If required for hand-in, export it with `docker save postiliste:1.0.0 -o postiliste-1.0.0.tar`.

Database schema changes are applied automatically on startup.

## Git/GitHub workflow

Use feature branches instead of developing directly on `main`:

```bash
git switch -c feature/<issue-number>-short-description
# make changes
git add <files>
git commit -m "Implement feature (#<issue-number>)"
git push -u origin feature/<issue-number>-short-description
```

Open a pull request, request a review and merge only after the checks pass. Reference issues in commits/PRs and use `Closes #<number>` when the Definition of Done is fulfilled.

For M324 project management, add requirements as granular GitHub issues and maintain them on a GitHub Project board with **Backlog**, **In Progress** and **Done**, plus assignee, priority and target date.

## Persistence and handover

Local development uses SQLite. The Docker production environment stores shopping-list data in the PostgreSQL managed volume `postiliste-postgres` (Docker Compose volume name may be prefixed with the project directory name).

Tester setup:

```bash
git clone https://github.com/Lardomir/Postiliste.git
cd Postiliste
docker compose up --build -d
```

Open `http://localhost:3000`. No local Node installation or source-code volume is needed to run the Dockerized application. Stop it with `docker compose down`.
