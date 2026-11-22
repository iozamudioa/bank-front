FROM node:24.15.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run pwa:check

FROM registry.ioza.dev/kingdom/tavern-host:0.0.1-SNAPSHOT
COPY --from=build --chown=kingdom:kingdom /app/dist/bank/browser/ /app/tavern/
EXPOSE 8080
