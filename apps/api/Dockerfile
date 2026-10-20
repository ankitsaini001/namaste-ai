# syntax=docker/dockerfile:1
# One image for the API and the worker (System Design §19.1): the same code, two commands.
# Built from the repository root by infra/docker-compose.prod.yml, or by hand with:
#   docker build -f apps/api/Dockerfile -t mmm-api .

FROM node:24-slim AS base
# pnpm comes from Corepack, at the version in package.json ("packageManager").
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
RUN corepack enable
WORKDIR /repo

# The packages production needs, from the package lists alone, so a code change doesn't
# reinstall them. Install scripts are skipped: none of these needs one, and the repository's
# git hooks don't belong on a server.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/email-templates/package.json packages/email-templates/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@mmm/api..." --ignore-scripts

# The API and the two packages it uses; the web app is built by Vercel.
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@mmm/api..."
RUN pnpm --filter "@mmm/api..." run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
# pnpm links packages into node_modules, so each one keeps its place in the repository.
COPY --from=prod-deps /repo/package.json ./
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/packages/shared/package.json packages/shared/
COPY --from=prod-deps /repo/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=prod-deps /repo/packages/email-templates/package.json packages/email-templates/
COPY --from=prod-deps /repo/packages/email-templates/node_modules packages/email-templates/node_modules
COPY --from=build /repo/packages/email-templates/dist packages/email-templates/dist
COPY --from=prod-deps /repo/apps/api/package.json apps/api/
COPY --from=prod-deps /repo/apps/api/node_modules apps/api/node_modules
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
# The worker uses the same image with: node --enable-source-maps dist/worker.js
CMD ["node", "--enable-source-maps", "dist/main.js"]
