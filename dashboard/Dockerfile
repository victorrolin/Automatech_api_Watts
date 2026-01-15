# Build do Dashboard
FROM node:20-alpine AS dashboard-builder

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Build do Vite
RUN npm run build

# Imagem final com Nginx
FROM nginx:alpine

# Copiar build para Nginx
COPY --from=dashboard-builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx (se houver)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
