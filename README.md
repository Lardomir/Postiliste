# Poschtilischte – M324 DevOps-Prozesse

Web-App für mehrere Einkaufslisten in einem Haushalt. Umgesetzt mit **Node.js / Express, Nunjucks, PostgreSQL (Docker)**, SQLite für lokale Entwicklung und Tests, und Jenkins CI/CD. Die Gestaltung orientiert sich an den drei Screen-Mocks des Pflichtenhefts.

## Funktionalität

- Anmeldung/Abmeldung mit gehashten Passwörtern, serverseitigen Sessions und CSRF-Schutz
- **Admin**: alle Listen sichtbar/bearbeitbar, Benutzerverwaltung
- **User**: nur Listen, für die er verantwortlich oder als Mitglied eingetragen ist
- Beliebig viele Einkaufslisten mit Titel, optionalem Fälligkeitsdatum, verantwortlicher Person und Erledigt-Status
- Mehrere zugewiesene Benutzer pro Liste; Berechtigungen gelten auch direkt über URLs/HTTP-Requests
- Artikel pro Liste: Name, freie Menge, gekauft/offen-Checkbox, löschen
- Mobile-taugliche Seiten: Übersicht, Listen-Detail, Benutzerverwaltung
- E-Mail-Benachrichtigungen bei Zuweisungen und Änderungen, lokal prüfbar mit smtp4dev
- Automatische Datenbank-Migrationen, persistent gespeicherte Daten

## Schnellstart für Tester (Docker)

**Voraussetzung:** Docker Desktop oder Docker Engine mit Compose, freie Ports 3000 und 8025.

1. Projekt klonen und in den Ordner wechseln.
2. `.env.example` nach `.env` kopieren.
3. In `.env` **POSTGRES_PASSWORD**, **ADMIN_PASSWORD** (mindestens 12 Zeichen) und **SESSION_SECRET** (mindestens 32 zufällige Zeichen) individuell setzen.
4. `docker compose up --build -d` ausführen.
5. Web-App unter **http://localhost:3000** öffnen.
6. Mit `ADMIN_USERNAME` und `ADMIN_PASSWORD` anmelden (initialer Admin wird beim ersten Start erstellt).
7. Über **Benutzer** weitere Accounts mit E-Mail-Adresse anlegen.
8. Einkaufslisten erstellen, einer verantwortlichen Person zuweisen, mehrere Nutzer freischalten und Artikel abhaken.
9. Test-Mails unter **http://localhost:8025** ansehen.

Sobald bereits Benutzer in der DB bestehen, erzeugt der Start **keinen neuen Admin**; ein geänderter `ADMIN_PASSWORD`-Wert setzt das Passwort eines vorhandenen Admins nicht zurück.

Zum Prüfen der Persistenz: Liste erstellen, dann `docker compose down` und `docker compose up -d`. Die Liste bleibt im PostgreSQL-Volume bestehen. **Achtung:** `docker compose down -v` entfernt die Daten dauerhaft.

Mit `docker compose logs -f postiliste` lassen sich Serverlogs einsehen.

## Setup für Entwickler

Benötigt: **Node.js 24**, npm, Git; für CI/Docker zusätzlich Docker und Jenkins.

```sh
git clone https://github.com/Lardomir/Postiliste.git
cd Postiliste
npm install
```

Lokale SQLite-Entwicklung ohne Docker:

```sh
# In .env bzw. als lokale Umgebungsvariablen setzen:
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD=<mindestens 12 Zeichen>
# SESSION_SECRET=<mindestens 32 Zeichen>
node --env-file=.env server.js
```

**Hinweis:** Node lädt `.env` nicht automatisch in jeder Konfiguration. In Node 24 kann man für den lokalen Start `node --env-file=.env server.js` verwenden. `DATABASE_URL` für SQLite weglassen oder leer setzen; Standard-DB: `data/postiliste.db`. Eine laufende PostgreSQL-Instanz wird über `DATABASE_URL` gewählt.

## npm-Scripts

| Script                 | Funktion                                   | Wann?                                                                  |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `npm start`            | Server starten                             | Produktiv oder Testlauf                                                |
| `npm run serve`        | Nodemon-Entwicklungsserver                 | Beim Programmieren                                                     |
| `npm test`             | Jest-Tests und SQLite-Integrationstests    | Vor Pull Requests / in CI                                              |
| `npm run lint`         | ESLint-Prüfung                             | Laufend und vor Commits                                                |
| `npm run format`       | Prettier formatiert Dateien                | Nach Änderungen                                                        |
| `npm run format:check` | Formatierung prüfen                        | Vor Commits / in CI                                                    |
| `npm run check`        | Lint, Formatprüfung, Tests                 | Vor Commit / im CI                                                     |
|                        | `npm run dev-setup`                        | Installs npm, generates local secrets if absent, starts Docker Compose | Fresh checkout | npm install und Docker-Build | Nach dem ersten Checkout |
| `npm run docker:build` | Produktionsimage bauen                     | Vor einem Release                                                      |
| `npm run docker:up`    | Compose-Umgebung starten                   | Test/Deployment                                                        |
| `npm run docker:test`  | CI-Testimage bauen und darin Tests starten | CI lokal nachbilden                                                    |

`package.json` beschreibt die direkten Dependencies, `package-lock.json` die aufgelösten Versionen. Nach Änderungen der Dependencies `npm install` ausführen, Lockfile mitcommitten. **Vor dem finalen Release muss das bestehende Lockfile aktualisiert und `npm run format && npm run check` ausgeführt werden.**

`npm run dev-setup` erzeugt beim ersten Aufruf eine geschützte lokale `.env` mit zufälligen Zugangsdaten, führt `npm install` aus und startet den App/DB/SMTP-Stack. Die Admin-Zugangsdaten stehen ausschliesslich in `.env`. Mit `npm run dev-setup -- --jenkins` wird auch Jenkins gestartet. Bestehende `.env`-Dateien bleiben unverändert.\n\n`.husky/pre-commit` startet die Qualitätsprüfung automatisch vor Commits.

## Architektur

```text
Browser (Responsive HTML/CSS)
       |
       v
Express / app.js
  |-- Login / Session + CSRF + Role Middleware
  |-- Übersicht / Listen / Artikel / User-Verwaltung
  |-- lib/validation.js + lib/security.js
  |-- lib/store.js (SQL / Migrations)
  |       |-- PostgreSQL (Produktion, eigener Container, Volume)
  |       `-- SQLite (lokal, Integrationstests)
  `-- lib/mailer.js ---> smtp4dev (Test-SMTP, Weboberfläche)
```

Express liefert klassische serverseitige HTML-Seiten via **Nunjucks** (`views/`) mit Styles in `public/styles.css`.

### Relationales Datenmodell

- `users`: Benutzername, E-Mail, Passwort-Hash, Rolle, Zeitstempel
- `shopping_lists`: Titel, optionales Datum, verantwortlicher Benutzer, erledigt/offen
- `list_members`: m:n-Relation zwischen Benutzern und Listen
- `list_items`: Produkte einer Liste, Menge, gekauft/offen
- `sessions`: gehashter Session-Token, Benutzer und Ablaufzeit
- `schema_migrations`: ausgeführte Migrationsversionen

Passwörter werden mit gesalzenem **scrypt** gehasht. Cookies sind `HttpOnly` und `SameSite=Lax`. Bei echtem HTTPS `COOKIE_SECURE=true` konfigurieren. Form-POSTs verwenden einen vom Session-Token abgeleiteten CSRF-Token. Berechtigungen werden **auf dem Server** für jede Listenoperation geprüft.

Bei bestehender alter Prototyp-DB legt Migration **v3** neue Tabellen an. Die frühere globale `shopping_items`-Tabelle bleibt als Legacy-Datenbestand bestehen; sie wird nicht automatisch einer neuen Liste zugeordnet. Für eine Übernahme alter Testdaten ist eine bewusste Datenmigration nötig.

### E-Mail

Der eingebaute SMTP-Transport ist bewusst **nur für den unverschlüsselten lokalen smtp4dev-Dummy-Server** gedacht. Er unterstützt keine externe SMTP-Authentifizierung oder TLS. Kein öffentlich erreichbares E-Mail-Gateway verwenden.

Ein neuer Benutzer braucht eine E-Mail-Adresse, damit Benachrichtigungen ankommen. Benachrichtigungsfehler werden geloggt und blockieren das Speichern der Einkaufsliste nicht.

## Tests und Abnahmekriterien

`tests/validation.test.js`: valide/ungültige Eingaben, Grenzfälle (Jest Unit Tests).

`tests/security.test.js`: Passwort-Hash, Login-Verifikation, Sessions/CSRF.

`tests/fullStore.integration.test.js`: echte temporäre SQLite-Datenbank, Benutzer, Listen, Zuweisungen, Artikel, Erledigt-Status, Neustart/Persistenz und Relationseinschränkungen.

`tests/http.integration.test.js`: tatsächliche HTTP-Anfragen / Formular-POSTs gegen eine echte SQLite-Testdatenbank: Login, Session-Cookie, CSRF, Admin/User-Sperren, Listen-/Artikel-Erstellung.

Die Datenbank für Tests wird temporär angelegt und am Ende aufgeräumt; keine produktiven Credentials nötig.

Manuell prüfen:

1. Admin meldet sich an und erstellt Benutzer.
2. Benutzer A sieht Liste X, Benutzer B ohne Zuweisung nicht (auch per Direkt-URL).
3. Admin sieht jede Liste und Benutzerverwaltung.
4. Neue Liste, Titel/Fälligkeitsdatum/Verantwortliche/Mitglieder bearbeiten.
5. Artikel hinzufügen, Menge setzen, abhaken und löschen.
6. Bei Zuweisung/Änderung erscheint eine E-Mail in smtp4dev.
7. `docker compose down`, neu starten und Daten wiederfinden.
8. Leer-/Fehleingaben und nicht autorisierte POSTs werden zurückgewiesen.

## Jenkins (CI/CD)

Ein Jenkins-Compose-Setup ist in `docker/jenkins/` enthalten.

```sh
cd docker/jenkins
docker compose up --build -d
```

Unter **http://localhost:8080** Jenkins initialisieren. Einen **Pipeline from SCM** Job anlegen, das GitHub-Repository mit Zugangstoken hinterlegen und den Pfad `Jenkinsfile` setzen. Jenkins benötigt funktionierenden Docker-Zugriff, inklusive Docker-Socket-Zugriff für den lokalen Schul-Server.

Pipeline:

1. Checkout aus GitHub (SCM)
2. Eigenes Docker-**Testimage** bauen (mit Dev-Dependencies)
3. `npm run check` **im Testcontainer** ausführen, inklusive echter SQLite-Integrationstests
4. Produktionsimage mit Jenkins-Buildnummer bauen
5. Die Compose-Umgebung starten/ersetzen

**Jenkins-Credentials (Secret text, exakte IDs):** `postiliste-postgres-password`, `postiliste-admin-password`, `postiliste-session-secret`. Das Admin-Passwort muss mindestens 12 Zeichen, der Session-Schlüssel mindestens 32 Zeichen haben. GitHub-Checkout benötigt einen separat im Jenkins-Job hinterlegten Token. `withCredentials` übergibt die Deploy-Geheimnisse an Compose, ohne sie ins Git-Repository zu schreiben. Nach dem Deployment prüft Jenkins `/health`. Der Jenkins-Docker-Container nutzt den Host-Docker-Socket mit weitreichenden Rechten und eignet sich nur für eine vertrauenswürdige lokale Schul-Umgebung. Eine erfolgreiche Jenkins-Ausführung muss eigenständig dokumentiert werden; GitHub Actions ersetzen den Jenkins-Nachweis nicht.\n\nPeriodisches SCM-Polling prüft auf neue Commits. Die Pipeline kann die gesamte Umgebung aus einem Checkout wiederherstellen.

## Standalone-Image und Bind-Mount (K11)

Das Produktionsimage enthaelt alle Dateien der Node-Web-App. Mit PostgreSQL werden Daten getrennt im Compose-Volume gespeichert. Das **identische Image** kann auch ohne `DATABASE_URL` mit SQLite und einem Host-Bind-Mount laufen.

```powershell
npm run docker:build
New-Item -ItemType Directory -Force .\\data | Out-Null
docker run --rm --name postiliste-sqlite -p 3001:3000 `
  --mount "type=bind,source=$((Get-Location).Path)\\data,target=/app/data" `
  -e NODE_ENV=production -e ADMIN_USERNAME=admin `
  -e ADMIN_PASSWORD="YourUniqueAdminPassword123" `
  -e SESSION_SECRET="UseAUniqueRandomSessionSecretLongerThan32Chars" `
  postiliste:local
```

Unter http://localhost:3001 pruefen. `data/postiliste.db` befindet sich danach auf dem Host. Derselbe Mount erhaelt die Daten bei einem Neustart. Unter Linux muss das Host-Verzeichnis fuer den nicht-root Container beschreibbar sein. Fuer echte Deployments Secret-Werte nicht in Shell-Befehlen ausgeben, sondern `--env-file` verwenden.

```sh
docker build --target production -f docker/webapp/Dockerfile -t postiliste:1.0.0 .
docker save postiliste:1.0.0 -o postiliste-1.0.0.tar
# Auf dem Abnahmegeraet:
docker load -i postiliste-1.0.0.tar
```

Der TAR-Export umfasst bewusst nicht das externe Datenbankvolume. Fuer die PostgreSQL-Variante die Compose-Datei und .env-Beispiel mitgeben, Geheimnisse separat setzen.

## Versionierung, Review und Abgabe

Entwicklung erfolgt über Issue-bezogene Feature-Branches. Jede Änderung wird per Commit dem passenden Issue zugeordnet (z.B. `feat: ... (#120)`); Pull Requests werden von einem zweiten Teammitglied reviewed. Erst nach positivem Testlauf und Review in `main` mergen.

Release-Beispiel:

```sh
git switch main
git pull
npm install
npm run format
npm run check
git tag -a v1.0.0 -m "Poschtilischte 1.0.0"
git push origin v1.0.0
docker build --target production -f docker/webapp/Dockerfile -t postiliste:1.0.0 .
docker save postiliste:1.0.0 -o postiliste-1.0.0.tar
```

Für die vollständige Demo wird die Docker-Compose-Datei mit der Datenbank-Konfiguration benötigt. **Ein einzelnes App-Image enthält bewusst nicht die PostgreSQL-Datenbank**. Die Daten liegen persistent ausserhalb des App-Containers in einem Managed Volume.

## Environment

| Variable                 | Zweck                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| `PORT`                   | HTTP-Port, Standard 3000                                                |
| `DATABASE_URL`           | PostgreSQL-Verbindungsstring; fehlt diese Variable, wird SQLite benutzt |
| `DB_PATH`                | Dateipfad der SQLite-DB bei lokaler Entwicklung                         |
| `POSTGRES_PASSWORD`      | Passwort für den PostgreSQL-Container                                   |
| `ADMIN_USERNAME`         | Benutzername des initialen Admins                                       |
| `ADMIN_PASSWORD`         | Passwort des initialen Admins, min. 12 Zeichen                          |
| `ADMIN_EMAIL`            | Optionale E-Mail des initialen Admins                                   |
| `SESSION_SECRET`         | Zufälliger Server-Schlüssel, min. 32 Zeichen                            |
| `COOKIE_SECURE`          | Bei HTTPS auf `true` setzen                                             |
| `SMTP_HOST`, `SMTP_PORT` | Nur lokaler Dummy-SMTP-Server                                           |
| `MAIL_FROM`              | Absenderadresse für Testmails                                           |
| `SMTP4DEV_WEB_PORT`      | Externer smtp4dev-Webport, Standard 8025                                |

Keine echten Geheimnisse im Git-Repository speichern. Die Beispielwerte in `.env.example` **müssen ersetzt werden**.
