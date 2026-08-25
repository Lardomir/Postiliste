# Postiliste – M324 DevOps project

Postiliste is a small ExpressJS web application for ICT module M324. Users can create Post-its, mark them as done/open and delete them. Data is persisted in SQLite. The project also demonstrates automated tests, linting/formatting, Git hooks, Docker and a Jenkins CI pipeline.

## Product quick guide

1. Open `http://localhost:3000`.
2. Enter a title and choose **Add**.
3. Use **Done/Reopen** to change the state of a Post-it.
4. Use **Delete** to remove it.
5. `GET /health` returns a simple health response for Docker/CI checks.

## Architecture

```text
Browser
  |
  | HTTP forms / HTML
  v
Express app (app.js)
  |
  | repository calls
  v
PostRepository (postRepository.js)
  |
  | SQL
  v
SQLite database (data/postiliste.db)
```

Nunjucks renders the HTML in `views/`. `server.js` only starts the HTTP server, while `app.js` contains the routes. Database access is isolated in `postRepository.js`; on startup it automatically applies missing schema migrations recorded in `schema_migrations`.

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

The development server runs at `http://localhost:3000` and Nodemon restarts it after code changes.

For a one-command setup that installs dependencies and verifies that the Docker image can be built:

```bash
npm run dev-setup
```

> After this branch is checked out for the first time, run `npm install` once. It installs the new developer tools and refreshes `package-lock.json`; commit the refreshed lock file so future builds can use the exact resolved versions.

## npm commands

| Command | Purpose | When to use it |
| --- | --- | --- |
| `npm start` | Start production-style Node server | Production/container runtime |
| `npm run serve` | Start with Nodemon | During development |
| `npm test` | Run Jest unit + integration tests | Before commits and in CI |
| `npm run lint` | Validate JavaScript with ESLint | While coding / before commits |
| `npm run format` | Format supported files with Prettier | When formatting is incorrect |
| `npm run format:check` | Check formatting without changing files | Before commits and in CI |
| `npm run check` | Run lint, formatting check and tests | Main local quality gate |
| `npm run dev-setup` | Install dependencies and build Docker image | After a fresh checkout |
| `npm run docker:build` | Build `postiliste:local` | Before a manual container release |
| `npm run docker:up` | Start the Compose production environment | Local production-like testing |

## Code quality and pre-commit hook

ESLint is configured in `eslint.config.js`; Prettier handles formatting. Husky installs a `.husky/pre-commit` hook through the `prepare` npm script. Every commit runs:

```bash
npm run check
```

Only commit when linting, formatting and tests are green.

## Testing setup

Install dependencies and execute:

```bash
npm test
```

`tests/encode_html.test.js` contains constructive and destructive unit tests. `tests/postRepository.integration.test.js` uses a real temporary SQLite database (not a mocked database), verifies persistence and cleans the database up afterwards.

For the complete local quality gate:

```bash
npm run check
```

## Production Docker image

Build the self-contained application image:

```bash
docker build -f docker/webapp/Dockerfile -t postiliste:1.0.0 .
```

Run it with persistent data:

```bash
docker run --rm -p 3000:3000 \
  -e DB_PATH=/app/data/postiliste.db \
  -v postiliste-data:/app/data \
  postiliste:1.0.0
```

Application source and runtime dependencies are inside the image. Only persistent application data lives in the Docker volume.

### Docker Compose

```bash
docker compose up --build -d
docker compose logs -f
docker compose down
```

To also remove persisted data intentionally:

```bash
docker compose down -v
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port used by Node |
| `DB_PATH` | `./data/postiliste.db` | SQLite database file location |
| `NODE_ENV` | development / production | Runtime environment |

`.env.example` documents the available values. Do not commit real secrets in `.env`. The current project does not require an API key.

## CI setup with Jenkins

A reproducible local Jenkins environment is included in `docker/jenkins/`.

Start it:

```bash
cd docker/jenkins
docker compose up --build -d
```

Then open `http://localhost:8080`, finish the initial Jenkins setup and create a **Pipeline from SCM** job for this GitHub repository. Configure your GitHub credentials/token in Jenkins and select `Jenkinsfile` as the pipeline script path. The job can then checkout private/public code using the configured credential.

The Jenkinsfile:

1. checks out the repository,
2. starts a clean Node 24 container,
3. installs dependencies,
4. runs `npm run check`,
5. builds the production Docker image.

Jenkins polls the repository every few minutes (`pollSCM`) so new pushes automatically trigger the pipeline. The Jenkins container mounts the host Docker socket because the pipeline builds containers; this setup is intended for the local school/dev environment, not a hardened public Jenkins server.

## Release procedure

1. Ensure all related GitHub issues meet their Definition of Done.
2. Run `npm install` and commit any intentional `package-lock.json` change.
3. Run `npm run check`.
4. Build and test the production image with `npm run docker:build` or Compose.
5. Merge the reviewed feature branch through a pull request.
6. Create a version tag, for example `v1.0.0`.
7. Build the release image using that version as its image tag.
8. For hand-in, export the image if required: `docker save postiliste:1.0.0 -o postiliste-1.0.0.tar`.

Schema migrations run automatically when the application starts, so a release can introduce future database schema changes without manual SQL steps.

## Git/GitHub workflow

Use feature branches instead of developing directly on `main`:

```bash
git switch -c feature/<issue-number>-short-description
# make changes
git add <files>
git commit -m "Implement feature (#<issue-number>)"
git push -u origin feature/<issue-number>-short-description
```

Open a pull request, request a review and merge only after the checks pass. Reference issues in commits/PRs (`#1`) and use `Closes #1` in the final PR/commit when the Definition of Done is fully satisfied so GitHub closes the issue automatically.

For M324 project management, add all requirements as granular GitHub issues and maintain them on a GitHub Project board with **Backlog**, **In Progress**, and **Done**, plus assignee, priority and target date.

## Data and backups

Local development data is stored below `data/` and is ignored by Git. Docker Compose stores production-like data in the managed volume `postiliste-data`. To back it up, use normal Docker volume backup procedures before destructive upgrades.

## Handover / tester setup

The quickest tester setup is:

```bash
git clone https://github.com/Lardomir/Postiliste.git
cd Postiliste
docker compose up --build -d
```

Open `http://localhost:3000`. No source-code volume or local Node installation is needed for the running application. Stop it with `docker compose down`.
