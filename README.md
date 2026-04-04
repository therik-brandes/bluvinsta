# 📸 Bluvinsta - Agendador de Posts Instagram

**Bluvinsta** é uma plataforma completa para agendamento de posts no Instagram com suporte a vídeos grandes (até 5GB), integração com webhook para n8n e deploy em Docker.

## ✨ Funcionalidades

- ✅ **Login seguro** com autenticação JWT
- ✅ **Dashboard** com estatísticas de posts
- ✅ **Agendamento de posts** com data e horário
- ✅ **Upload de vídeos** até 5GB (Cloudflare R2)
- ✅ **Calendário interativo** para seleção de datas
- ✅ **Configurações** com webhook para n8n
- ✅ **Banco de dados** MySQL com persistência
- ✅ **Design dark** moderno e profissional
- ✅ **Docker** pronto para produção

## 🚀 Quick Start (30 minutos)

### 1. Clonar Repositório
```bash
git clone https://github.com/seu_usuario/bluvinsta.git
cd bluvinsta
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env.production
nano .env.production
```

Preencha com seus valores:
```env
NODE_ENV=production
MYSQL_ROOT_PASSWORD=SenhaRootMuitoSegura123!@#
MYSQL_PASSWORD=SenhaUserMuitoSegura456!@#
DATABASE_URL=mysql://bluvinsta_user:SenhaUserMuitoSegura456!@#@mysql:3306/bluvinsta
JWT_SECRET=seu_jwt_secret_aleatorio_aqui
AWS_ACCESS_KEY_ID=seu_access_key_r2
AWS_SECRET_ACCESS_KEY=seu_secret_key_r2
AWS_REGION=auto
S3_BUCKET=bluvinsta-videos
S3_ENDPOINT=https://seu_account_id.r2.cloudflarestorage.com
```

### 3. Build e Deploy com Docker
```bash
docker build -t bluvinsta:latest .
docker-compose up -d
```

### 4. Aplicar Migrations
```bash
docker-compose exec app pnpm db:push
```

### 5. Acessar Aplicação
```
http://localhost:3000
```

**Login padrão:**
- Email: `admin@example.com`
- Senha: `admin123`

---

## 📋 Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| **RESUMO_EXECUTIVO.md** | Passo a passo simplificado (30 minutos) |
| **ARQUITETURA.md** | Design técnico completo |
| **DEPLOY_PASSO_A_PASSO.md** | Guia detalhado de deploy |
| **CLOUDFLARE_R2_SETUP.md** | Configuração de storage |

---

## 🏗️ Arquitetura

```
Frontend (React 19 + Tailwind)
    ↓
Backend (Node.js + Express + tRPC)
    ↓
Banco de Dados (MySQL 8.0)
    ↓
Storage (Cloudflare R2)
    ↓
Webhook (n8n)
```

### Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 19, Tailwind CSS 4, TypeScript |
| **Backend** | Node.js 22, Express, tRPC 11 |
| **Banco de Dados** | MySQL 8.0 |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Containerização** | Docker + Docker Compose |
| **Autenticação** | JWT + Cookies |

---

## 📦 Estrutura de Pastas

```
bluvinsta/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Telas (Dashboard, Schedule, Calendar, Settings)
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── lib/              # Helpers (tRPC, auth)
│   │   ├── App.tsx           # Router principal
│   │   └── index.css         # Estilos globais (dark theme)
│   ├── public/               # Assets estáticos
│   └── index.html            # HTML base
├── server/                    # Backend Node.js
│   ├── routers/              # tRPC procedures
│   │   └── posts.ts          # CRUD de posts
│   ├── db.ts                 # Queries ao banco
│   ├── storage.ts            # Helpers S3/R2
│   ├── routers.ts            # Router principal
│   └── _core/                # Framework (OAuth, context, etc)
├── drizzle/                   # Schema de banco de dados
│   ├── schema.ts             # Definição de tabelas
│   └── migrations/           # SQL migrations
├── shared/                    # Código compartilhado
├── Dockerfile                 # Container image
├── docker-compose.yml         # Orquestração
├── package.json              # Dependências
└── pnpm-lock.yaml            # Lock file
```

---

## 🗄️ Banco de Dados

### Tabelas

#### `users`
```sql
id, openId, email, name, role, webhookUrl, createdAt, updatedAt, lastSignedIn
```

#### `posts`
```sql
id, userId, videoKey, videoUrl, videoSize, videoMimeType, caption,
scheduledDate, scheduledTime, status, createdAt, updatedAt
```

#### `webhookLogs`
```sql
id, userId, postId, webhookUrl, payload, responseStatus, responseBody, sentAt
```

---

## 🔌 API tRPC

### Procedures Públicas
```typescript
auth.login(email, password)
auth.register(email, password, name)
auth.logout()
```

### Procedures Protegidas
```typescript
posts.list()
posts.getById(id)
posts.create(videoKey, videoUrl, videoSize, caption, scheduledDate, scheduledTime)
posts.update(id, caption, scheduledDate, scheduledTime, status)
posts.delete(id)
```

---

## 📤 Upload de Vídeos

### Fluxo Completo

1. **Frontend solicita presigned URL**
   ```typescript
   const { url, key } = await trpc.upload.getPresignedUrl.mutate({
     fileName: "video.mp4",
     fileSize: 1024000000
   });
   ```

2. **Frontend faz upload direto para R2**
   ```typescript
   await fetch(url, {
     method: "PUT",
     body: videoFile,
     headers: { "Content-Type": "video/mp4" }
   });
   ```

3. **Frontend confirma upload**
   ```typescript
   await trpc.upload.confirmUpload.mutate({
     key,
     fileName: "video.mp4",
     fileSize: 1024000000
   });
   ```

---

## 🔗 Webhook Integration

### Payload Enviado ao n8n
```json
{
  "event": "post.scheduled",
  "post_id": 123,
  "user_email": "admin@example.com",
  "video_url": "https://r2.example.com/video.mp4",
  "video_size": 1024000000,
  "caption": "Novo post!",
  "scheduled_date": "2026-04-10",
  "scheduled_time": "14:30",
  "timestamp": "2026-04-04T12:00:00Z"
}
```

---

## 🐳 Docker Commands

### Build
```bash
docker build -t bluvinsta:latest .
```

### Start
```bash
docker-compose up -d
```

### Stop
```bash
docker-compose down
```

### Logs
```bash
docker-compose logs -f app
docker-compose logs -f mysql
```

### Restart
```bash
docker-compose restart app
docker-compose restart mysql
```

### Backup
```bash
docker-compose exec mysql mysqldump -u bluvinsta_user -p bluvinsta > backup.sql
```

### Restore
```bash
docker-compose exec -T mysql mysql -u bluvinsta_user -p bluvinsta < backup.sql
```

---

## 🔐 Segurança

- ✅ Autenticação JWT com refresh tokens
- ✅ Senhas com hash bcrypt (salt rounds: 10)
- ✅ Validação Zod em tRPC
- ✅ CORS configurado
- ✅ Rate limiting em endpoints críticos
- ✅ SSL/HTTPS (Let's Encrypt)
- ✅ Variáveis de ambiente para credenciais

---

## 💰 Custos Estimados (Mensal)

| Serviço | Custo |
|---------|-------|
| VPS Hostinger | R$ 30-50 |
| Cloudflare R2 | R$ 2-5 (100GB) |
| Domínio | R$ 30-50 |
| **TOTAL** | **R$ 60-105** |

---

## 🛠️ Desenvolvimento Local

### Instalar Dependências
```bash
pnpm install
```

### Iniciar Dev Server
```bash
pnpm dev
```

### Verificar TypeScript
```bash
pnpm check
```

### Rodar Testes
```bash
pnpm test
```

### Build para Produção
```bash
pnpm build
```

### Iniciar Produção
```bash
pnpm start
```

---

## 🚀 Deploy no Easypanel/Hostinger

Siga o guia completo em **DEPLOY_PASSO_A_PASSO.md**

### Resumo Rápido
1. Clonar repositório no VPS
2. Configurar `.env.production`
3. `docker build -t bluvinsta:latest .`
4. `docker-compose up -d`
5. `docker-compose exec app pnpm db:push`
6. Configurar Nginx com SSL
7. Acessar via domínio

---

## 📊 Monitoramento

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

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Connection refused" | `docker-compose restart mysql` |
| "Port 3000 already in use" | `lsof -i :3000` → `kill -9 PID` |
| "S3 access denied" | Verifique credenciais R2 |
| "Vídeo não faz upload" | Verifique `MAX_VIDEO_SIZE` |
| "Banco não conecta" | Aguarde 30s para MySQL iniciar |

---

## 📞 Suporte

### Verificar Logs
```bash
docker-compose logs app | tail -50
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

## 📄 Licença

MIT License - Veja LICENSE para detalhes

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📧 Contato

Para dúvidas ou sugestões, abra uma issue no GitHub.

---

**Versão:** 1.0.0  
**Última atualização:** 04/04/2026  
**Status:** Production Ready ✅
