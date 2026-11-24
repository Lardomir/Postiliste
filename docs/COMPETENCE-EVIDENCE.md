# M324 Kompetenzraster: Nachweise und Demonstration

Diese Datei ist eine **Checkliste**, kein Beleg fuer bereits erfolgte persoenliche Abnahmen. Hake die Punkte erst nach echter Demonstration ab.

| Raster | GitHub-/Code-Nachweis                     | Demonstration                                                                               |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| K1     | Issues #102–#155, Beschreibungen und DoD  | Jede Pflichtenheft-Anforderung einem granularen Issue zuordnen; Kategorien zeigen           |
| K2     | GitHub Project                            | Status Backlog/In Progress/Done, Assignee, Priority, Size, Target Date kontrollieren        |
| K3     | Feature-Branch, mehrere Commits, PR #156  | git add/commit/push/pull/branch/switch, Konflikte, Review und Auto-Close via `Closes #...`  |
| K4     | ESLint, Prettier, Husky                   | npm run lint, npm run format:check und Pre-commit-Hook vorfuehren                           |
| K5     | Jest Unit-/Integrationstests              | Testfaelle, Grenzwerte, destruktive Tests und echtes DB-Speichern ueber HTTP                |
| K6     | package.json und scripts/dev-setup.js     | npm run dev-setup ab frischem Checkout, Skripte und README erlaeutern                       |
| K7     | npm-/Lockfile                             | npm install und installierte Bibliotheken im Code zeigen                                    |
| K8     | Jenkinsfile und docker/jenkins            | Jenkins inkl. Token, Auto-Trigger, Tests im Container und Image-Build demonstrieren         |
| K9     | Dockerfile, Compose, PostgreSQL           | Produktionsimage, Umgebungsvariablen, Volumes, automatische Migration und Deploy nachweisen |
| K10    | README.md                                 | Developer/Tester/Jenkins-Setup, Architektur und Release-Prozess erlaeutern                  |
| K11    | Docker-TAR, Compose und SQLite Bind-Mount | docker load/run, PostgreSQL-Persistenz, abgeschlossene Issues, Tag, Abnahme                 |

## Noch manuell nachzuweisen

- [ ] GitHub Project Felder und Status nachpruefen; keine erfundenen Done-States
- [ ] Aussagekraeftige GitHub-Labels wie feature, test, security, database und devops anlegen/zuordnen
- [ ] Fertige Aufgaben mit echten Commits/PR verknuepfen und nach erfolgreicher Abnahme schliessen
- [ ] PR #156 durch eine andere Person reviewen und genehmigen lassen
- [ ] Jenkins mit Repo-Credentials und Secret-Text-Credentials wirklich erfolgreich laufen lassen
- [ ] Merge-Konflikt bewusst demonstrieren und Git-Befehle selbst anwenden
- [ ] Erst nach Genehmigung mergen, v1.0.0 taggen und Image-TAR pruefen
- [ ] Saemtliche Kompetenzen dem Dozenten erklaeren

**Nicht behaupten, dass ein Review/Jenkins-Run/Tag erledigt ist, bevor die Aktion wirklich stattgefunden hat.**
