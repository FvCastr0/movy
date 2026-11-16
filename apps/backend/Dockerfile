# Multi-stage Dockerfile para NestJS Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Instalação de dependências do build
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Compilação do código TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage de Produção enxuto
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

# Instala apenas dependências de produção
RUN npm ci --omit=dev && npm cache clean --force

# Copia os artefatos compilados do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Aplica migrations do Prisma e inicia a API NestJS
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
