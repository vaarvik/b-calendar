# syntax=docker/dockerfile:1
# The API and the web app in one container: the web app at /, the API at /v1, uploads at /media.
# Build:  docker build -t b-calendar .
# Run:    docker run -p 3000:3000 --env-file .env -v b-calendar-media:/app/data/media b-calendar
# The same image runs migrations (node dist/src/migrate.js) and the CLI (node dist/src/cli.js).
#
# Both build stages run on the build machine's own architecture: their output is JavaScript and
# static files, so a multi-arch build (amd64 + arm64) needs no emulation.

FROM --platform=$BUILDPLATFORM node:24-slim AS api
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@b-calendar/api..."
RUN pnpm exec tsc -b apps/api
# A self-contained folder with production dependencies only.
RUN pnpm --filter @b-calendar/api deploy --prod --legacy /out

FROM --platform=$BUILDPLATFORM node:24-slim AS web
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@b-calendar/web..."
RUN pnpm --filter @b-calendar/web build

FROM node:24-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 STORAGE=postgres WEB_ROOT=/app/web MEDIA_DIR=/app/data/media
WORKDIR /app
COPY --from=api --chown=node:node /out .
COPY --from=web --chown=node:node /repo/apps/web/dist ./web
RUN mkdir -p /app/data/media && chown -R node:node /app/data
USER node
VOLUME /app/data/media
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
