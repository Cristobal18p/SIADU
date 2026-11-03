# SIADU en producción: servidor, cliente compilado y Chromium para el PDF

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json server/package-lock.json server/prisma.config.js server/
COPY server/prisma server/prisma
RUN npm ci --prefix server --omit=dev
COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix client --include=dev
COPY shared shared
COPY client client
RUN npm run build --prefix client
COPY server server

FROM node:24-bookworm-slim
# fonts-liberation: equivalentes de Arial y Times New Roman para el PDF
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PORT=7001
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/server server
COPY --from=build /app/shared shared
COPY --from=build /app/client/dist client/dist
COPY --from=build /app/client/public client/public
USER node
EXPOSE 7001
CMD ["node", "server/bin/www"]
