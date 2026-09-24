FROM node:24.11.1-alpine3.22 AS dependencies
WORKDIR /workspace

RUN npm install --global npm@11.19.0

COPY package.json package-lock.json ./
COPY backend-node/package.json ./backend-node/package.json
RUN npm ci --workspace backend-node --include-workspace-root=false --no-audit --no-fund

FROM dependencies AS build
COPY backend-node ./backend-node
RUN ./node_modules/.bin/tsc --project backend-node/tsconfig.build.json

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --workspace backend-node --include-workspace-root=false

FROM node:24.11.1-alpine3.22 AS runtime
ENV NODE_ENV=production
WORKDIR /workspace/backend-node

COPY --from=production-dependencies --chown=node:node /workspace/node_modules /workspace/node_modules
COPY --from=build --chown=node:node /workspace/backend-node/dist ./dist
COPY --from=build --chown=node:node /workspace/backend-node/package.json ./package.json
COPY --from=build --chown=node:node /workspace/backend-node/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /workspace/backend-node/uploads \
  && chown node:node /workspace/backend-node/uploads \
  && chmod 750 /workspace/backend-node/uploads \
  && chmod 550 /workspace/backend-node/docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
