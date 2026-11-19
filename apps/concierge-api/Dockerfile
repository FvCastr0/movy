# Multi-stage Hardened Dockerfile para MOVY AI Concierge Microservice
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

# Copia os artefatos compilados do builder já com permissão para o usuário não-root (evita chown -R lento em node_modules)
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# OWASP A05: Executa com usuário não-root (node) sem precisar varrer milhares de arquivos com chown -R
USER node

EXPOSE 3002

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
