# Hosting

One container (`Dockerfile`) serves the web app (`/`), the API (`/v1`) and uploaded images
(`/media`), next to a PostgreSQL database. It runs on the home simple-k8s at
https://calendar.johann.no (app `b-calendar-copy` on `johann-no-cluster-hetzner`).

Deploys follow `main`: simple-k8s's workflow (`.github/workflows/simple-k8s-*.yml`, written by
simple-k8s) builds the image on every push and simple-k8s rolls it out. `ci.yml` only checks:
typecheck, lint, tests and that the image starts. The database is an in-cluster Postgres
connected to the app, which sets `DATABASE_URL`.

| Setting  | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Image    | Built by simple-k8s from `main` (`Dockerfile` at the root)           |
| Port     | `3000`; health check `GET /health`                                   |
| URL      | `calendar.johann.no`; HTTPS is required for push and service workers |
| Command  | The image default: migrate, then serve. No override needed           |
| Database | Postgres 16                                                          |
| Volume   | `/app/data/media` (uploaded images; must survive restarts)           |
| Copies   | 1 (the notification job runs in the process)                         |

## Environment

| Variable                  | Value                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`            | Postgres connection string                                               |
| `ADMIN_PASSWORD`          | Secret, 12+ characters. Signs in at `/admin`                             |
| `SESSION_SECRET`          | Secret, 32+ random characters. Changing it signs the admin out           |
| `VAPID_PUBLIC_KEY`        | From `node dist/src/cli.js vapid-keys`, once                             |
| `VAPID_PRIVATE_KEY`       | Secret, same run. Changing the pair breaks every existing subscription   |
| `VAPID_SUBJECT`           | `https://<the app's host>` or a `mailto:` address push services may use  |
| `TRUST_PROXY`             | `true` behind the cluster's proxy                                        |
| `NOTIFY_GRACE_MINUTES`    | Optional, default 180: later than this, a door's notification is skipped |
| `NOTIFY_INTERVAL_SECONDS` | Optional, default 30                                                     |

## First calendar

```bash
node dist/src/cli.js seed-birthday --name Ida --origin https://b.johann.no
```

prints her link and the admin link. Then, on her iPhone: open the link in Safari → Share → Add to
Home Screen → open it from the Home Screen → "Slå på varsler". In `/admin`, "Send testvarsel"
checks that pushes reach the phone.
