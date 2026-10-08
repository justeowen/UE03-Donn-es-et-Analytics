# game-telemetry-demo

Service de télémétrie d'un jeu de tir multijoueur web (parties 1 à 2 joueurs contre bots).

## Lancer avec Docker

```bash
docker compose up -d --build   # lance toutes la stack
docker compose down            # arrête tout
```

| service | rôle | URL |
|---|---|---|
| app | service de télémétrie | http://localhost:8080/healthz |
| loadgen | générateur de charge | |
| loki | stockage des logs | |
| alloy | collecte des logs (en direct + export historique) | |
| prometheus | métriques et alertes | http://localhost:9090 |
| grafana | dashboards (admin / admin) | http://localhost:3000 |

## Structure

| dossier / fichier | rôle |
|---|---|
| `Dockerfile` | image multi-étapes, non-root |
| `.github/workflows/ci.yml` | lint, tests, build, scan Trivy|
| `alloy/` | collecte des logs |
| `prometheus/` | scraping, recording rules, alertes |
| `loki/ ` | règle d'alerte sur les logs |
| `grafana/` | datasources et provisioning des dashboards |
| `dashboards/` | les 3 dashboards (JSON) |
| `docs/` | rapport et captures |

## Lancer sans Docker

```bash
    npm ci
npm start                  # API sur :8080, logs JSON lines dans logs/telemetry.log et stdout
npm test
npm run lint
npm run loadgen -- --rps 5 --burst-every 120 --burst-rps 80
```

Variables d'environnement : `PORT`, `LOG_FILE`, `LOG_STDOUT` (0 pour couper stdout), `BUILD`, `GAMES_PER_MINUTE`, `SPEED`, `INCIDENTS` (0 pour désactiver).

## API

| méthode | route | rôle |
|---|---|---|
| GET | `/healthz` | santé |
| GET | `/metrics` | métriques Prometheus |
| GET | `/api/games` | parties en cours |
| POST | `/api/reports` | ingestion d'un rapport client `{ report, server }` |
