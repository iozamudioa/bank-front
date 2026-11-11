FROM node:24.15.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run pwa:check

FROM nginx:stable-alpine
RUN apk add --no-cache ca-certificates
ENV BANK_API_URL=https://bank-api.ioza.dev
ENV NGINX_ENVSUBST_FILTER=^BANK_API_URL$
COPY --from=build /app/dist/bank/browser/ /usr/share/nginx/html/
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
