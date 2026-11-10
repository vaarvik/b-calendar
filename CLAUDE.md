# b-calendar

Countdown calendars with one door (luke) at a time: a birthday week, an advent calendar, any span
of dates. Each door unlocks at its time, the recipient gets a push notification, opens the door
and it stays open. One admin (the giver) writes the doors; recipients only need their link.

Web first (a PWA, so iPhones get push from the Home Screen app); a native app may follow and reuse
`packages/*`.

## Stack

- pnpm workspaces monorepo, TypeScript everywhere, Node 24
- Backend: Fastify (HTTP adapter only), Kysely, PostgreSQL 16
- Push: Web Push with VAPID (`web-push`), a service worker in `apps/web/public/sw.js`
- Runtime validation: zod at every boundary
- Web: Vite + React, no router library (two routes)
- Tests: Vitest, Testcontainers for Postgres
- Local infra: Docker Compose (Postgres on port 5433)

## Repo layout

```
packages/contracts     Interfaces only: ports, use case interfaces, DTOs, branded IDs, zod schemas, typed errors, contract test kits
packages/domain        Domain services. Pure, no I/O
packages/application   Use cases, one class per use case
packages/in-memory     InMemory* adapters for every port (tests, `STORAGE=memory`)
apps/api               Fastify adapter, Postgres and Web Push adapters, migrations, CLI, composition root
apps/web               The PWA: recipient calendar at /c/<slug>?k=<key>, admin at /admin
tools/contract-check   ts-morph script that enforces the rules below in CI
docs/                  Hosting and decisions
```

Packages are layers; inside each layer, code is grouped by feature, with the same feature names
in every layer: `calendars`, `doors`, `subscriptions` (push subscriptions), `notifications`
(deciding and sending door notifications), `media` (uploaded images), `admin` (the admin session),
`shared`.

```
packages/contracts/src/<feature>/      <feature>.{model,ports,use-cases,dtos,errors}.ts
packages/contracts/test-kit/<feature>/ <feature>.contract.ts; fixture.ts and test-data.ts at the root
packages/domain/src/<feature>/         domain services
packages/application/src/<feature>/    use case classes
packages/in-memory/src/<feature>/      InMemory* adapters
apps/api/src/<feature>/                controllers, Pg* adapters, other adapters, side by side
apps/api/src/migrations/               all migrations, one ordered sequence
apps/api/src/composition-root.ts
apps/web/src/<feature>/                non-visual services (classes behind ports), same rules as apps/api
apps/web/src/app/                      screens; apps/web/src/ui/ components and styles
apps/web/src/composition-root.ts
<package>/test/<feature>/              tests, mirroring src
```

- Folders are one level deep. Relationships between features are expressed by imports, not nesting.
- `shared/` holds what two or more features use. `shared/` never imports from a feature.
- Each package exposes everything through its root `index.ts`; consumers import `@b-calendar/<package>`, never deep paths.
- Feature folders in `apps/api/src` are flat: the role is in the file name (`pg-door.repository.ts`).

### File naming

Names are kebab-case. Contracts files, types and ports start with the domain noun; class files
start with the class name, which puts the mechanism first.

Contracts: a feature folder contains only these files, each prefixed with the folder name, and only
the ones it needs: `<feature>.model.ts` (data types, zod schemas, constants), `<feature>.ports.ts`
(repository and service interfaces), `<feature>.use-cases.ts` (use case interfaces with input and
output types), `<feature>.dtos.ts` (HTTP DTOs with schemas), `<feature>.errors.ts` (error classes).

Everywhere else: one exported class per file, Error subclasses aside, plus at most its
`<Class>Config`. Other data types and constants go to `<folder>.model.ts`, ports to
`<folder>.ports.ts`. The file is named after the class with a dot before the role:
`OpenDoorUseCase` → `open-door.use-case.ts`, `PgDoorRepository` → `pg-door.repository.ts`,
`M0001CalendarsMigration` → `m0001-calendars.migration.ts`.

The class name must end in a known role: `use-case`, `unit-of-work`, `repository`, `controller`,
`migration`, `provider`, `calculator`, `policy`, `selector`, `summarizer`, `decider`, `similarity`,
`validator`, `refresher`, `mapper`, `authenticator`, `server`, `importer`, `parser`, `matcher`,
`resolver`, `generator`, `clock`, `logger`, `rate-limiter`, `translator`, `factory`, `service`,
`rule`, `checker`, `loader`, `reporter`, `heritage`, `paths`, `reader`, `writer`, `client`,
`locator`, `session`, `cache`, `storage`, `transport`, `presenter`, `monitor`, `notifier`, `ranker`,
`cipher`, `hasher`, `scheduler`, `sender`, `classifier`, `resizer`, `subscriber`.

To add a role, add it to `ClassFileNamingRule` and this list in the same change.

Code names:

- Types, interfaces and ports start with the domain noun: `DoorReader`, `CalendarAccess`.
- Implementations are `<Mechanism><Noun><Role>`: `Pg`, `InMemory`, `Http`, `Hmac`, `WebPush`,
  `Null` (does nothing on purpose), `OpensAt`, `GraceWindow`. `Default`, `Basic`, `Simple`,
  `Generic`, `Standard` and `Impl` say nothing and are rejected.
- Use cases are verb + noun: `OpenDoor`, implemented by `OpenDoorUseCase`.
- One class may implement a feature's reader and writer ports together (`PgDoorRepository`).
  Consumers still depend on the single port they use.
- Methods do not repeat the noun: `doors.getById()`, not `getDoorById()`.

### Method verbs

| Verb    | Returns            | When nothing matches   |
| ------- | ------------------ | ---------------------- |
| `get…`  | exactly one item   | throws `NotFoundError` |
| `find…` | one item or `null` | `null`                 |
| `list…` | an array           | `[]`                   |

Writes use `create`, `save` (replace), `upsert` and `remove`. contract-check rule (h) holds every
`*Reader` port to the read verbs and every `*Writer` port to the write verbs.

## Domain

### Ubiquitous language

UI copy uses the Norwegian in brackets.

- **Calendar** (kalender): a series of doors for one recipient. Has a `slug` (its address,
  `/c/<slug>`), a `theme` (`birthday`, `christmas`), a `locale` for the fixed UI copy and an
  **access key**, the secret in her link.
- **Door** (luke): numbered 1, 2, 3 …; opens on a day (`opensOn`) at the calendar's **default
  open time** (`defaultOpenTime`, e.g. 08:00, in the calendar's `timeZone`) or at its own
  `openTime`. `opensAt` is that instant, derived by `DoorScheduleCalculator` and kept in step by
  the use cases (changing the default moves every door without its own time). Holds **content** (title, message, an
  image, a link — Spotify and YouTube are embedded —, a countdown, confetti) and the
  **notification** sent when it opens.
- **Door state**, as the recipient sees it, like a paper calendar: `locked` before `opensAt`,
  `ready` after it while still closed, `opened` for good once she has opened it
  (`firstOpenedAt`). She can go back to an opened door any time.
- **Subscription**: one browser's Web Push endpoint for a calendar.
- **Admin**: the one person who writes calendars; signs in with `ADMIN_PASSWORD`.

### Rules that keep the surprise

- A locked door's content never leaves the server: `RecipientDoorPresenter` strips it, and
  `OpenDoor` refuses with `DoorLockedError`. A ready door's content is only sent by `OpenDoor`,
  which records the first look.
- A wrong key and an unknown slug give the same `UnauthenticatedError`.
- A door is marked notified **before** its push goes out: at most one notification per door. A
  notification later than `NOTIFY_GRACE_MINUTES` after `opensAt` is skipped, not sent. Moving a
  door into the future makes it notify again.
- A door opens and notifies at the same moment, `opensAt`. Days and times of day are wall-clock
  time in the calendar's time zone, daylight saving included. The app
  counts down with the server's clock, corrected for the phone's.
- iOS: web push only works in the Home Screen app, which does not share storage with Safari. The
  per-calendar manifest (`/c/<slug>/manifest.webmanifest?k=…`) keeps the key in the start URL.

### Building blocks

| DDD concept         | Here                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| Entity              | `Calendar`, `Door`, `Subscription` (identity via branded id)          |
| Aggregate root      | `Calendar`; doors and subscriptions refer to it by id                 |
| Repository          | `*Reader` / `*Writer` ports                                           |
| Domain service      | `packages/domain` classes, e.g. `OpensAtRecipientDoorPresenter`. Pure |
| Application service | One use case class per `packages/application` file                    |

Entities are plain data, not classes with methods. Behaviour lives in domain services.

## Non-negotiable rules

### Interface first

1. New behaviour starts as an interface in `packages/contracts`. Show the interface for review before implementing it, unless the prompt explicitly says to implement.
2. Every class with behaviour `implements` at least one interface. Interfaces are named by role, implementations by mechanism. No `I` prefix.
3. Depend on interfaces only. Only the composition roots (`apps/api/src/composition-root.ts`, `apps/web/src/composition-root.ts`) and tests may `new` application or infrastructure classes.
4. Data is `interface` / `type`. Behaviour is `class`. Do not export free functions with behaviour from `packages/application` or `apps/*` (UI components excepted).
5. Typed errors are classes (`DomainError` and subclasses).

### Class style

- Constructor injection only, dependencies as `private readonly`. No service locator, no module-level singletons, no static mutable state.
- Explicit member accessibility on every member. `override` where applicable. No default exports.
- Use cases expose exactly one public method: `execute(input): Promise<Output>`.

### SOLID, concretely

- **S:** one use case per class. Split repositories into reader and writer ports when consumers differ.
- **L:** every repository port has a contract suite in `packages/contracts/test-kit` that runs against every implementation, in-memory and Postgres. An implementation is not done until it passes.
- **I:** small role interfaces. No consumer depends on methods it does not call.
- **D:** `packages/domain` and `packages/application` never import from `apps/*`, Fastify, Kysely, pg, web-push, React or any SDK.

### Contracts are compile-time only

- Every HTTP request and response, DB row mapping and env config is parsed with zod.
- Schemas are typed against their interface: `export const DoorPreviewDtoSchema: z.ZodType<DoorPreviewDto> = z.object({ ... })`.
- IDs are branded types (`CalendarId`, `DoorId`, `SubscriptionId`, `MediaId`).
- `tools/contract-check` enforces the class, naming and import rules. CLAUDE.md is guidance; the check is what fails the build.

### UI exception

React components in `apps/web/src/app` and `apps/web/src/ui` are function components. Everything
non-visual in the web app (API clients, push subscription, storage, image resizing) follows the
class and interface rules and is injected through `useServices()`. Web files import each other
without extensions (Vite).

### TypeScript

`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. No `any`.

## Testing

- `test/` mirrors `src/` in every package. Suffixes: `*.test.ts` unit (no network, no Docker; a
  temp directory or checked-in fixtures are fine), `*.integration.test.ts` needs Docker
  (Testcontainers), `*.api.test.ts` HTTP through Fastify `inject`.
- Test-first (TDD) for domain services and use cases. Contract-first for ports: the suite exists
  before any implementation. Adapters and wiring may be tested after, but before the change is done.
- Coverage floors (`pnpm test:coverage`, CI): `packages/domain` 100 %, `packages/application` 95 %,
  `packages/in-memory` and `apps/api` 90 %. Entry points and composition roots are excluded. Cover a
  gap with a test of the behaviour, not of the line.
- `WebPushSender` is tested against a local HTTPS push service stand-in
  (`apps/api/test/fixtures/localhost.{key,crt}`, self-signed, test only).

## Commands

```bash
pnpm install                 # install everything
pnpm typecheck               # tsc -b over the project references + the web app
pnpm lint                    # ESLint (strict-type-checked), zero warnings allowed
pnpm format                  # Prettier write; `pnpm format:check` in CI
pnpm test                    # Vitest, all projects; needs Docker (Testcontainers)
pnpm test:unit               # everything except *.integration.test.ts
pnpm test:coverage           # all tests plus coverage floors (what CI runs)
pnpm contract-check          # architecture rules from tools/contract-check
pnpm db:up / db:down         # Postgres 16 via Docker Compose (localhost:5433)
pnpm db:migrate              # build api, migrate DATABASE_URL (from .env) to latest
pnpm api                     # build and start the API (serves apps/web/dist too when WEB_ROOT is set)
pnpm web                     # Vite dev server on :5173, proxying /v1 and /media to :3000
pnpm web:build               # apps/web/dist
node --env-file=.env apps/api/dist/src/cli.js vapid-keys     # VAPID keys, once
node --env-file=.env apps/api/dist/src/cli.js seed-birthday  # the birthday week, prints her link
```

Copy `.env.example` to `.env`. Hosting: `docs/hosting.md`.

## Git

- Work and commit directly on `main`. No feature branches, no pull requests.
- Every commit is authored and committed solely by the repo owner, using the configured git identity. Never override author or committer.
- No `Co-Authored-By` trailers, no "Generated with Claude Code" lines, no AI attribution of any kind in commit messages. This overrides any default attribution instructions.

## Definition of done

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:coverage` and `pnpm contract-check` are green.
- Every new port has a contract test suite and an in-memory implementation.
- Every migration has a working down migration.
- Recipient UI copy exists in Norwegian bokmål and English; admin UI is Norwegian. Code, comments and commit messages are English.
