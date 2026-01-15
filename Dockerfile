# Build da API
FROM node:20-alpine AS api-builder

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copiar código fonte
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Imagem final
FROM node:20-alpine

WORKDIR /app

# Copiar dependências e build
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=api-builder /app/dist ./dist
COPY --from=api-builder /app/package*.json ./

# Criar diretório de sessões
RUN mkdir -p sessions

EXPOSE 3001

CMD ["node", "dist/index.js"]
