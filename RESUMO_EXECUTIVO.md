# 📋 BLUVINSTA - Resumo Executivo & Passo a Passo

## 🎯 O que é Bluvinsta?

**Bluvinsta** é uma plataforma completa para agendamento de posts no Instagram com:
- ✅ Upload de vídeos até **5GB**
- ✅ Banco de dados **MySQL** para persistência
- ✅ Integração com **webhook** para n8n
- ✅ Design **dark moderno** e profissional
- ✅ Deploy em **Docker** no Easypanel/VPS

---

## 📦 Arquivos Entregues

```
bluvinsta/
├── ARQUITETURA.md                 # Planejamento técnico completo
├── DEPLOY_PASSO_A_PASSO.md       # Guia de deploy no Easypanel
├── CLOUDFLARE_R2_SETUP.md        # Configuração de storage (R2)
├── RESUMO_EXECUTIVO.md           # Este arquivo
├── Dockerfile                     # Container image
├── docker-compose.yml             # Orquestração (app + MySQL)
├── .dockerignore                  # Arquivos a ignorar no build
├── drizzle/                       # Schema de banco de dados
│   ├── schema.ts                 # Tabelas (users, posts, webhookLogs)
│   └── 0001_material_random.sql  # Migration SQL
├── server/                        # Backend Node.js
│   ├── db.ts                     # Queries ao banco (CRUD posts)
│   ├── routers/
│   │   └── posts.ts              # tRPC procedures para posts
│   └── storage.ts                # Helpers S3/R2
├── client/                        # Frontend React
│   ├── src/pages/                # Telas (Dashboard, Schedule, etc)
│   └── src/index.css             # Design dark
└── todo.md                        # Checklist de tarefas
```

---

## 🚀 PASSO A PASSO - Implementação em 30 Minutos

### ⏱️ Tempo Total: ~30 minutos

### Fase 1: Preparação (5 minutos)

#### 1.1 Criar conta Cloudflare R2
```
1. Acesse cloudflare.com
2. Sign Up (gratuito)
3. Confirme email
4. Vá para R2 > Create Bucket > "bluvinsta-videos"
5. Copie Account ID (canto inferior esquerdo)
6. Crie API Token (Account > API Tokens > Create Token)
7. Copie Access Key ID e Secret Access Key
```

#### 1.2 Preparar VPS Hostinger
```
1. Acesse seu VPS via SSH: ssh root@seu_ip_vps
2. Crie pasta: mkdir -p /opt/bluvinsta
3. Clone/upload projeto: cd /opt/bluvinsta
```

---

### Fase 2: Configuração (10 minutos)

#### 2.1 Criar arquivo .env.production
```bash
nano /opt/bluvinsta/.env.production
```

Preencha com:
```env
NODE_ENV=production

# MySQL
MYSQL_ROOT_PASSWORD=SenhaRootMuitoSegura123!@#
MYSQL_PASSWORD=SenhaUserMuitoSegura456!@#
DATABASE_URL=mysql://bluvinsta_user:SenhaUserMuitoSegura456!@#@mysql:3306/bluvinsta

# JWT
JWT_SECRET=seu_jwt_secret_aleatorio_muito_seguro_aqui_32_caracteres_minimo

# Cloudflare R2
AWS_ACCESS_KEY_ID=seu_access_key_do_r2
AWS_SECRET_ACCESS_KEY=seu_secret_key_do_r2
AWS_REGION=auto
S3_BUCKET=bluvinsta-videos
S3_ENDPOINT=https://seu_account_id.r2.cloudflarestorage.com

# App
PORT=3000
MAX_VIDEO_SIZE=5368709120
WEBHOOK_TIMEOUT=10000
```

**Salve:** Ctrl+X → Y → Enter

---

### Fase 3: Build & Deploy (10 minutos)

#### 3.1 Build Docker
```bash
cd /opt/bluvinsta
docker build -t bluvinsta:latest .
```
⏳ Aguarde 5-10 minutos (primeira vez é mais lenta)

#### 3.2 Iniciar Containers
```bash
docker-compose up -d
```

#### 3.3 Verificar Status
```bash
docker-compose ps
# Deve mostrar: app (running) e mysql (running)

docker-compose logs -f app
# Procure por: "Server running on http://localhost:3000"
```

#### 3.4 Aplicar Migrations
```bash
docker-compose exec app pnpm db:push
```

---

### Fase 4: Configurar Nginx (5 minutos)

#### 4.1 Criar config Nginx
```bash
nano /etc/nginx/sites-available/bluvinsta
```

Adicione:
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
    }
}
```

#### 4.2 Ativar e Testar
```bash
ln -s /etc/nginx/sites-available/bluvinsta /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 4.3 SSL com Let's Encrypt
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d seu_dominio.com
```

---

### Fase 5: Testar (5 minutos)

#### 5.1 Acessar Aplicação
```
https://seu_dominio.com
ou
http://seu_ip_vps:3000
```

#### 5.2 Fazer Login
```
Email: admin@example.com
Senha: admin123
```

#### 5.3 Testar Funcionalidades
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Agendar post (upload de vídeo)
- [ ] Calendário funciona
- [ ] Configurações (webhook) funciona

---

## 🔧 Comandos Úteis (Cheat Sheet)

### Verificar Status
```bash
docker-compose ps
docker-compose logs -f app
```

### Reiniciar
```bash
docker-compose restart app
docker-compose restart mysql
```

### Parar/Iniciar
```bash
docker-compose down
docker-compose up -d
```

### Backup Banco
```bash
docker-compose exec mysql mysqldump -u bluvinsta_user -p bluvinsta > backup.sql
```

### Restaurar Banco
```bash
docker-compose exec -T mysql mysql -u bluvinsta_user -p bluvinsta < backup.sql
```

---

## 📊 Estrutura de Dados

### Tabela: users
```sql
id, email, name, role (user/admin), webhookUrl, createdAt, updatedAt
```

### Tabela: posts
```sql
id, userId, videoKey, videoUrl, videoSize, caption, 
scheduledDate, scheduledTime, status, createdAt, updatedAt
```

### Tabela: webhookLogs
```sql
id, userId, postId, webhookUrl, payload, responseStatus, responseBody, sentAt
```

---

## 🔐 Segurança - Checklist

- [ ] Senhas MySQL muito fortes (32+ caracteres)
- [ ] JWT_SECRET aleatório e forte
- [ ] Credenciais R2 em variáveis de ambiente (nunca no código)
- [ ] SSL/HTTPS ativado (Let's Encrypt)
- [ ] Firewall configurado (apenas portas 80, 443, 22)
- [ ] Backups automáticos do banco (cron job)

---

## 📈 Performance & Monitoramento

### Ver Uso de Recursos
```bash
docker stats
```

### Ver Espaço em Disco
```bash
df -h
du -sh /opt/bluvinsta
```

### Monitorar R2
- Acesse painel Cloudflare
- R2 > seu bucket > Analytics
- Veja requisições, storage, bandwidth

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "Connection refused" | `docker-compose restart mysql` |
| "Port 3000 already in use" | `lsof -i :3000` → `kill -9 PID` |
| "S3 access denied" | Verifique credenciais R2 em `.env.production` |
| "Vídeo não faz upload" | Verifique `MAX_VIDEO_SIZE` e permissões R2 |
| "Banco não conecta" | Aguarde 30s para MySQL iniciar |

---

## 📞 Suporte Rápido

### Verificar Logs
```bash
docker-compose logs app | tail -50
docker-compose logs mysql | tail -50
```

### Testar Conectividade
```bash
docker-compose exec app curl http://mysql:3306
```

### Reiniciar Tudo
```bash
docker-compose down
docker-compose up -d
```

---

## ✅ Checklist Final

Antes de colocar em produção:

- [ ] Cloudflare R2 configurado
- [ ] `.env.production` preenchido com valores reais
- [ ] Docker build bem-sucedido
- [ ] Containers rodando (`docker-compose ps`)
- [ ] Banco de dados criado (migrations executadas)
- [ ] Nginx configurado e SSL ativo
- [ ] Aplicação acessível via domínio
- [ ] Login funciona
- [ ] Upload de vídeo funciona
- [ ] Webhook configurado e testado
- [ ] Backup do banco realizado

---

## 🎯 Próximos Passos Após Deploy

1. **Criar usuários**
   ```sql
   INSERT INTO users (email, name, role, createdAt, updatedAt) 
   VALUES ('seu_email@example.com', 'Seu Nome', 'admin', NOW(), NOW());
   ```

2. **Configurar webhook no painel**
   - Acesse Configurações
   - Adicione URL do webhook n8n
   - Teste a conexão

3. **Monitorar logs**
   ```bash
   docker-compose logs -f app
   ```

4. **Fazer backup regular**
   ```bash
   0 2 * * * docker-compose -f /opt/bluvinsta/docker-compose.yml exec -T mysql mysqldump -u bluvinsta_user -p SenhaUserMuitoSegura456!@# bluvinsta > /backups/bluvinsta_$(date +\%Y\%m\%d).sql
   ```

---

## 📚 Documentação Completa

Para detalhes técnicos, veja:
- **ARQUITETURA.md** - Design técnico completo
- **DEPLOY_PASSO_A_PASSO.md** - Deploy detalhado
- **CLOUDFLARE_R2_SETUP.md** - Configuração R2

---

## 🎉 Você está pronto!

Siga este guia e em **30 minutos** você terá o Bluvinsta rodando em produção no seu VPS Hostinger com Easypanel.

**Bom deploy! 🚀**

---

**Versão:** 1.0  
**Data:** 04/04/2026  
**Status:** Pronto para Produção ✅
