# Build da API
FROM node:20-alpine AS api-builder

WORKDIR /app

# Copiar package.json e instalar dependências
# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Imagem final
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de produção
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copiar build
COPY --from=api-builder /app/dist ./dist

# Criar diretório de sessões com permissões corretas
RUN mkdir -p /app/sessions && \
    chown -R node:node /app/sessions && \
    chmod -R 755 /app/sessions

# Garantir que o usuário node tenha permissão em /app
RUN chown -R node:node /app

# Mudar para usuário não-root
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]

