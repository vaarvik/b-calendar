# Hosting

One container (`Dockerfile`) serves the web app (`/`), the API (`/v1`) and uploaded images
(`/media`), next to a PostgreSQL 16 database. The plan is the home simple-k8s instance, like
amexbutikker.

CI publishes the image on every push to main: `ghcr.io/vaarvik/b-calendar:main` and
`:sha-<commit>`, for amd64 and arm64. GHCR packages start private: make it public, or give
simple-k8s a pull secret.

| Setting  | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Image    | `ghcr.io/vaarvik/b-calendar:main`                                  |
| Port     | `3000`; health check `GET /health`                                 |
| URL      | HTTPS is required for push and service workers, e.g. `b.johann.no` |
| Command  | `sh -c "node dist/src/migrate.js && node dist/src/server.js"`      |
| Database | Postgres 16                                                        |
| Volume   | `/app/data/media` (uploaded images; must survive restarts)         |
| Copies   | 1 (the notification job runs in the process)                       |

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
