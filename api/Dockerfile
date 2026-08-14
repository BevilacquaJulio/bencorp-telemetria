# syntax=docker/dockerfile:1

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
# O generate não consulta o banco, mas o Prisma 7 carrega a configuração e
# espera uma URL sintaticamente válida durante o build da imagem.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
    && npm run build

# Estágio usado somente pelo serviço one-off `migrate` do Compose. Ele mantém
# Prisma CLI, migrations e o seed, sem levá-los para o container da aplicação.
FROM build AS migrate
CMD ["npm", "run", "db:deploy"]

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3000

RUN apk add --no-cache dumb-init wget
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/saude >/dev/null || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
