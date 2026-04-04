# 🚀 Guia de Deploy Bluvinsta no Easypanel/Hostinger - Passo a Passo

## ⚠️ Pré-requisitos

Antes de começar, você precisa ter:

1. **VPS Hostinger com Easypanel instalado**
   - Acesso SSH ao servidor
   - Docker e Docker Compose já instalados (Easypanel fornece)

2. **Conta AWS (para S3)**
   - Access Key ID
   - Secret Access Key
   - Bucket S3 criado (ex: `bluvinsta-videos`)
   - Região configurada (ex: `us-east-1`)

3. **Git instalado no VPS**
   - Para clonar o repositório

4. **Domínio configurado** (opcional)
   - Apontado para o IP do VPS

---

## 📋 Passo 1: Preparar o Servidor VPS

### 1.1 Conectar ao VPS via SSH
```bash
ssh root@seu_ip_vps
```

### 1.2 Criar diretório do projeto
```bash
mkdir -p /opt/bluvinsta
cd /opt/bluvinsta
```

### 1.3 Clonar o repositório (ou fazer upload dos arquivos)
```bash
# Opção A: Se estiver em Git
git clone https://seu_repo.git .

# Opção B: Se estiver em arquivo ZIP
unzip bluvinsta.zip
```

### 1.4 Verificar estrutura
```bash
ls -la
# Deve conter: Dockerfile, docker-compose.yml, client/, server/, drizzle/, etc
```

---

## 🔐 Passo 2: Configurar Variáveis de Ambiente

### 2.1 Criar arquivo `.env.production`
```bash
nano /opt/bluvinsta/.env.production
```

### 2.2 Preencher com seus valores
```env
# Ambiente
NODE_ENV=production

# Banco de Dados
MYSQL_ROOT_PASSWORD=seu_senha_root_super_segura_aqui
MYSQL_USER=bluvinsta_user
MYSQL_PASSWORD=sua_senha_mysql_super_segura_aqui
DATABASE_URL=mysql://bluvinsta_user:sua_senha_mysql_super_segura_aqui@mysql:3306/bluvinsta

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro_aleatorio_aqui

# AWS S3
AWS_ACCESS_KEY_ID=sua_access_key_aqui
AWS_SECRET_ACCESS_KEY=sua_secret_key_aqui
AWS_REGION=us-east-1
S3_BUCKET=bluvinsta-videos

# Aplicação
PORT=3000
MAX_VIDEO_SIZE=5368709120
WEBHOOK_TIMEOUT=10000
```

**⚠️ IMPORTANTE:** Substitua todos os valores com dados reais e seguros!

### 2.3 Salvar arquivo
```bash
# Pressione Ctrl+X, depois Y, depois Enter
```

---

## 🐳 Passo 3: Build e Deploy com Docker

### 3.1 Construir imagem Docker
```bash
cd /opt/bluvinsta
docker build -t bluvinsta:latest .
```

**Isso pode levar 5-10 minutos na primeira vez.**

### 3.2 Iniciar containers com docker-compose
```bash
docker-compose up -d
```

### 3.3 Verificar se tudo está rodando
```bash
docker-compose ps
# Deve mostrar: app (running) e mysql (running)
```

### 3.4 Verificar logs
```bash
docker-compose logs -f app
# Procure por: "Server running on http://localhost:3000"
```

---

## 🗄️ Passo 4: Configurar Banco de Dados

### 4.1 Entrar no container MySQL
```bash
docker-compose exec mysql mysql -u root -p
# Digite a senha (MYSQL_ROOT_PASSWORD)
```

### 4.2 Executar migrations
```bash
docker-compose exec app pnpm db:push
```

### 4.3 Verificar se tabelas foram criadas
```bash
docker-compose exec mysql mysql -u bluvinsta_user -p bluvinsta -e "SHOW TABLES;"
# Digite a senha (MYSQL_PASSWORD)
# Deve mostrar: users, posts, webhook_logs
```

---

## 🌐 Passo 5: Configurar Reverse Proxy (Nginx)

### 5.1 Criar arquivo de configuração Nginx
```bash
nano /etc/nginx/sites-available/bluvinsta
```

### 5.2 Adicionar configuração
```nginx
server {
    listen 80;
    server_name seu_dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.3 Ativar site
```bash
ln -s /etc/nginx/sites-available/bluvinsta /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5.4 Configurar SSL (HTTPS) com Let's Encrypt
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d seu_dominio.com
```

---

## ✅ Passo 6: Testar a Aplicação

### 6.1 Acessar a aplicação
```
https://seu_dominio.com
ou
http://seu_ip_vps:3000
```

### 6.2 Fazer login
- Email: `admin@example.com`
- Senha: `admin123`

### 6.3 Testar funcionalidades
- [ ] Login/Logout funciona
- [ ] Dashboard carrega
- [ ] Consegue agendar post
- [ ] Upload de vídeo funciona
- [ ] Calendário funciona
- [ ] Configurações (webhook) funciona

---

## 🔧 Passo 7: Monitoramento e Manutenção

### 7.1 Ver logs em tempo real
```bash
docker-compose logs -f app
```

### 7.2 Reiniciar aplicação
```bash
docker-compose restart app
```

### 7.3 Parar aplicação
```bash
docker-compose down
```

### 7.4 Backup do banco de dados
```bash
docker-compose exec mysql mysqldump -u bluvinsta_user -p bluvinsta > backup_$(date +%Y%m%d).sql
# Digite a senha (MYSQL_PASSWORD)
```

### 7.5 Restaurar backup
```bash
docker-compose exec -T mysql mysql -u bluvinsta_user -p bluvinsta < backup_20260404.sql
# Digite a senha (MYSQL_PASSWORD)
```

---

## 🐛 Troubleshooting

### Problema: "Connection refused" ao conectar ao banco
**Solução:**
```bash
# Aguarde 30 segundos para MySQL iniciar
docker-compose logs mysql
# Reinicie se necessário
docker-compose restart mysql
```

### Problema: "S3 access denied"
**Solução:**
- Verifique AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY
- Confirme que a chave tem permissão S3
- Verifique se o bucket existe e está na região correta

### Problema: "Port 3000 already in use"
**Solução:**
```bash
# Encontre o processo
lsof -i :3000
# Mate o processo
kill -9 PID
```

### Problema: Vídeo não faz upload
**Solução:**
- Verifique se MAX_VIDEO_SIZE está correto (5GB = 5368709120 bytes)
- Confirme que S3 bucket tem permissão de escrita
- Verifique logs: `docker-compose logs app`

---

## 📊 Monitoramento Contínuo

### Verificar uso de recursos
```bash
docker stats
```

### Verificar espaço em disco
```bash
df -h
```

### Verificar espaço do MySQL
```bash
docker-compose exec mysql du -sh /var/lib/mysql
```

---

## 🔄 Atualizar a Aplicação

### 1. Parar containers
```bash
docker-compose down
```

### 2. Fazer backup
```bash
docker-compose exec mysql mysqldump -u bluvinsta_user -p bluvinsta > backup_antes_update.sql
```

### 3. Atualizar código
```bash
git pull origin main
# ou fazer upload dos novos arquivos
```

### 4. Reconstruir imagem
```bash
docker build -t bluvinsta:latest .
```

### 5. Iniciar novamente
```bash
docker-compose up -d
```

### 6. Executar migrations (se houver)
```bash
docker-compose exec app pnpm db:push
```

---

## 🎯 Checklist Final de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Docker build bem-sucedido
- [ ] Containers rodando (`docker-compose ps`)
- [ ] Banco de dados criado e migrations executadas
- [ ] Nginx configurado e SSL ativo
- [ ] Aplicação acessível via domínio
- [ ] Login funciona
- [ ] Upload de vídeo funciona
- [ ] Webhook configurado e testado
- [ ] Backup do banco de dados realizado
- [ ] Monitoramento ativo

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs:**
   ```bash
   docker-compose logs app
   docker-compose logs mysql
   ```

2. **Verifique conectividade:**
   ```bash
   docker-compose exec app curl http://mysql:3306
   ```

3. **Reinicie tudo:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

**Versão:** 1.0  
**Data:** 04/04/2026  
**Status:** Pronto para Deploy ✅
