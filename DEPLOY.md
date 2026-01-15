# 🚀 Deploy do Automatech API

Guia completo para deploy do sistema Automatech WhatsApp API + Dashboard na VPS.

## 📋 Pré-requisitos na VPS

- Docker instalado
- Docker Compose instalado
- Git instalado
- Nginx (opcional, se usar proxy reverso externo)
- Portas 3000 e 3001 disponíveis

## 🔧 Deploy Passo a Passo

### 1. Clone o Repositório

```bash
cd /var/www  # ou diretório de preferência
git clone https://github.com/SEU_USUARIO/automatech-api.git
cd automatech-api
```

### 2. Configure Variáveis de Ambiente (Opcional)

Se necessário, crie um arquivo `.env` na raiz:

```bash
NODE_ENV=production
PORT=3001
```

### 3. Build e Start com Docker Compose

```bash
# Build das imagens
docker-compose build

# Iniciar os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

### 4. Verificar Status

```bash
# Ver containers rodando
docker ps

# Testar API
curl http://localhost:3001/health

# Testar Dashboard
curl http://localhost:3000
```

### 5. Configurar Nginx (Reverse Proxy)

Copie a configuração fornecida em `nginx.conf` para:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/automatech
sudo ln -s /etc/nginx/sites-available/automatech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Configurar SSL (Opcional, Recomendado)

```bash
sudo certbot --nginx -d automatech.yourdomain.com
```

## 🔄 Atualização (Deploy de Novas Versões)

```bash
cd /var/www/automatech-api

# Parar containers
docker-compose down

# Atualizar código
git pull origin main

# Rebuild e restart
docker-compose build
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

## 🗂️ Estrutura de Diretórios na VPS

```
/var/www/automatech-api/
├── docker-compose.yml
├── Dockerfile (API)
├── dashboard/
│   └── Dockerfile
├── sessions/          # Persistido via volume
├── src/
└── nginx.conf
```

## 🛠️ Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f automatech-api
docker-compose logs -f automatech-dashboard

# Reiniciar apenas a API
docker-compose restart automatech-api

# Parar todos os serviços
docker-compose down

# Remover containers e volumes
docker-compose down -v

# Entrar no container da API
docker exec -it automatech-api sh
```

## 🌐 Acessos

Após o deploy:

- **Dashboard**: `http://seu-ip:3000` ou `https://automatech.yourdomain.com`
- **API**: `http://seu-ip:3001` ou `https://automatech.yourdomain.com/api`

## 🔒 Segurança

1. **Sempre use HTTPS em produção** (via Certbot)
2. **Configure firewall** (UFW):
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```
3. **Backup regular** da pasta `sessions/`

## ⚠️ Troubleshooting

### Container não inicia

```bash
docker-compose logs automatech-api
```

### Porta já em uso

```bash
sudo lsof -i :3001
# Matar processo ou mudar porta no docker-compose.yml
```

### Sessões perdidas após restart

- Verifique se o volume `./sessions:/app/sessions` está mapeado corretamente
- Faça backup regular da pasta `sessions/`

---

**Deploy bem-sucedido?** ✅ Acesse o dashboard e configure suas instâncias!
