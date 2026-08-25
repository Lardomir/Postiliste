# Postiliste – M324 DevOps project

Postiliste is a small ExpressJS web application for ICT module M324. Users can create Post-its, mark them as done/open and delete them. Local development and integration tests use SQLite; the Docker production environment uses PostgreSQL in a separate container. The project demonstrates automated tests, dependency management, linting/formatting, Git hooks, Docker and a Jenkins CI/CD pipeline.

## Product quick guide

1. Open `http://localhost:3000`.
2. Enter a title and choose **Add**.
3. Use **Done/Reopen** to change the state of a Post-it.
4. Use **Delete** to remove it.
5. `GET /health` returns a health response for Docker/CI checks.

## Architecture

```text
Browser
  |
  | HTTP forms / HTML
  v
Express app (app.js)
  |
  v
repositoryFactory.js
  |                       |
  v                       v
SQLite repository      PostgreSQL repository
(local/tests)           (Docker production)
```

Nunjucks renders the HTML in `views/`. `server.js` starts the HTTP server and `app.js` contains the routes. `repositoryFactory.js` selects PostgreSQL whenever `DATABASE_URL` is configured; otherwise it falls back to SQLite. Both database implementations automatically create/apply the required schema and record migrations in `schema_migrations`.

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm
- Docker Desktop / Docker Engine for container workflows
- Git for Husky hooks

## Developer setup

After cloning the repository:

```bash
npm install
npm run serve
```

Without `DATABASE_URL`, local development stores data in `data/postiliste.db`.

For a one-command setup that installs dependencies and verifies the Docker build:

```bash
npm run dev-setup
```

> After checking out this branch for the first time, run `npm install` once and commit the refreshed `package-lock.json`. This is required because new dependencies were added for the M324 tooling and PostgreSQL support.

## npm commands

| Command | Purpose | When to use it |
| --- | --- | --- |
| `npm start` | Start the Node server | Production/container runtime |
| `npm run serve` | Start with Nodemon | During development |
| `npm test` | Run Jest unit + integration tests | Before commits and in CI |
| `npm run lint` | Validate JavaScript with ESLint | While coding / before commits |
| `npm run format` | Format supported files with Prettier | When formatting is incorrect |
| `npm run format:check` | Check formatting without changing files | Before commits and in CI |
| `npm run check` | Run lint, formatting check and tests | Main quality gate |
| `npm run dev-setup` | Install dependencies and build Docker image | After a fresh checkout |
| `npm run docker:build` | Build `postiliste:local` | Before a manual release |
| `npm run docker:up` | Start PostgreSQL + application | Production-like testing |

## Code quality and pre-commit hook

ESLint is configured in `eslint.config.js`; Prettier handles formatting. Husky installs `.husky/pre-commit` through the `prepare` npm script. Every commit runs:

```bash
npm run check
```

## Testing setup

```bash
npm install
npm test
```

`tests/encode_html.test.js` contains constructive and destructive unit tests. `tests/postRepository.integration.test.js` uses a real temporary SQLite database without mocking the database layer. For the complete local quality gate:

```bash
npm run check
```

## Production Docker environment

Start the complete environment:

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

Docker Compose starts two containers:

- `postiliste`: the self-contained Node/Express application image
- `postgres`: PostgreSQL 17, used as the external relational production database

PostgreSQL data is persisted in the managed Docker volume `postiliste-postgres`. The application source code is not mounted from the host.

To intentionally remove all persisted production data:

```bash
docker compose down -v
```

### Build only the application image

```bash
docker build -f docker/webapp/Dockerfile -t postiliste:1.0.0 .
```

The image contains all application source files and runtime dependencies.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port used by Node |
| `DB_PATH` | `./data/postiliste.db` | SQLite path when PostgreSQL is not configured |
| `DATABASE_URL` | empty | PostgreSQL connection string; when present PostgreSQL is used |
| `POSTGRES_PASSWORD` | `postiliste` in local Compose | Password passed to the PostgreSQL container |
| `NODE_ENV` | development / production | Runtime environment |

`.env.example` documents these values. Real passwords/API keys must not be committed. For an actual deployment, override the example PostgreSQL password.

## CI/CD setup with Jenkins

A reproducible Jenkins environment is included in `docker/jenkins/`:

```bash
cd docker/jenkins
docker compose up --build -d
```

Open `http://localhost:8080`, complete the initial Jenkins setup and create a **Pipeline from SCM** job for this repository. Configure GitHub credentials/token in Jenkins and select `Jenkinsfile` as the script path.

The pipeline:

1. checks out the repository through Jenkins SCM credentials,
2. starts a clean Node 24 container,
3. installs dependencies,
4. runs `npm run check`, including the real SQLite integration test,
5. builds the production Docker image,
6. runs `docker compose up -d --build --remove-orphans`, which starts/replaces the application and PostgreSQL production environment.

`pollSCM` checks for repository changes periodically, so pushes automatically trigger the pipeline. The local Jenkins container mounts the Docker socket because the pipeline builds/deploys containers. This is suitable for the school/dev environment, not a hardened public Jenkins installation.

## Release procedure

1. Ensure related GitHub issues meet their Definition of Done.
2. Run `npm install` and commit the refreshed `package-lock.json`.
3. Run `npm run format` followed by `npm run check`.
4. Run `docker compose up --build` and verify CRUD + persistence.
5. Let Jenkins complete the pipeline successfully.
6. Merge the reviewed feature branch through a pull request.
7. Create a version tag, for example `v1.0.0`.
8. Build the release image using that version as its image tag.
9. For hand-in, export the application image if required: `docker save postiliste:1.0.0 -o postiliste-1.0.0.tar`.

Database schema migrations run automatically when each repository backend starts.

## Git/GitHub workflow

Use feature branches instead of developing directly on `main`:

```bash
git switch -c feature/<issue-number>-short-description
# make changes
git add <files>
git commit -m "Implement feature (#<issue-number>)"
git push -u origin feature/<issue-number>-short-description
```

Open a pull request, request a second-person review and merge only after checks pass. Reference issues in commits/PRs and use `Closes #<issue>` once the Definition of Done is satisfied.

For M324 project management, put the issues on a GitHub Project board with **Backlog**, **In Progress** and **Done**, and maintain assignee, priority and target date.

## Data and backups

Local SQLite development data is stored below `data/` and ignored by Git. Docker production data is stored in `postiliste-postgres`. Back up the PostgreSQL volume/database before destructive upgrades.

## Handover / tester setup

```bash
git clone https://github.com/Lardomir/Postiliste.git
cd Postiliste
docker compose up --build -d
```

Open `http://localhost:3000`. The tester does not need a local Node installation because the application and PostgreSQL database run in containers. Stop the environment with `docker compose down`.
