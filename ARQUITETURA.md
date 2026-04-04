# 🏗️ Arquitetura Bluvinsta - Planejamento Técnico

## 📋 Visão Geral

**Bluvinsta** é uma plataforma de agendamento de posts no Instagram com suporte a vídeos grandes (até 5GB), persistência em banco de dados MySQL e integração com webhooks para n8n.

### Stack Tecnológico

| Camada | Tecnologia | Justificativa |
| --- | --- | --- |
| **Frontend** | React 19 + Tailwind 4 + TypeScript | UI moderna, type-safe, componentes reutilizáveis |
| **Backend** | Node.js + Express + tRPC | APIs type-safe, autenticação JWT, suporte a streaming |
| **Banco de Dados** | MySQL 8.0 | Persistência relacional, suporte a transações |
| **Storage** | AWS S3 (ou compatível) | Upload de arquivos grandes (até 5GB) |
| **Containerização** | Docker + Docker Compose | Deploy consistente em Easypanel/VPS |
| **Autenticação** | JWT + Cookies seguros | Sessões stateless, segurança CSRF |

---

## 🗄️ Schema de Banco de Dados

### Tabela: `users`

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(320) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role ENUM('user', 'admin') DEFAULT 'user',
  webhook_url VARCHAR(2048),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_signed_in TIMESTAMP
);
```

### Tabela: `posts`

```sql
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  video_key VARCHAR(512) NOT NULL,
  video_url VARCHAR(2048),
  video_size BIGINT,
  video_mime_type VARCHAR(100),
  caption TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status ENUM('pending', 'scheduled', 'published', 'failed') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, scheduled_date)
);
```

### Tabela: `webhook_logs`

```sql
CREATE TABLE webhook_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT,
  webhook_url VARCHAR(2048),
  payload JSON,
  response_status INT,
  response_body TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
);
```

---

## 🔌 API tRPC (Backend)

### Procedures Públicas

```typescript
// auth.login(email, password) → { token, user }
// auth.register(email, password, name) → { token, user }
// auth.logout() → { success }
```

### Procedures Protegidas (Autenticadas)

```typescript
// posts.list() → Post[]
// posts.create(video, caption, date, time) → Post
// posts.update(id, caption, date, time) → Post
// posts.delete(id) → { success }
// posts.getById(id) → Post

// upload.getPresignedUrl(fileName, fileSize) → { url, key }
// upload.confirmUpload(key, fileName, fileSize) → { url }

// webhooks.setUrl(url) → { success }
// webhooks.testUrl(url) → { status, response }
// webhooks.getLogs() → WebhookLog[]

// settings.get() → Settings
// settings.update(settings) → Settings
```

---

## 📤 Fluxo de Upload de Vídeos (até 5GB)

### Estratégia: Multipart Upload com S3

1. **Frontend solicita URL pré-assinada**
  - Chama `upload.getPresignedUrl(fileName, fileSize)`
  - Backend gera URL S3 válida por 30 minutos

1. **Frontend faz upload direto para S3**
  - Usa `PUT` com progresso de upload
  - Não passa pelo servidor (economiza banda)

1. **Frontend confirma upload**
  - Chama `upload.confirmUpload(key, fileName, fileSize)`
  - Backend valida arquivo e retorna URL permanente

1. **Backend armazena referência no DB**
  - Salva `video_key` e `video_url` na tabela `posts`

### Vantagens

- ✅ Suporta arquivos até 5GB

- ✅ Progresso de upload em tempo real

- ✅ Não sobrecarrega o servidor

- ✅ Upload pode ser retomado

---

## 🔗 Integração com Webhook (n8n)

### Fluxo de Envio de Dados

1. **Usuário agenda post**
  - Frontend chama `posts.create(...)`
  - Backend cria registro no DB

1. **Backend envia dados ao webhook**
  - Se `webhook_url` configurada, faz POST
  - Payload contém: post_id, video_url, caption, scheduled_date, scheduled_time
  - Registra resposta em `webhook_logs`

1. **n8n recebe dados**
  - Processa agendamento no Instagram
  - Retorna status de sucesso/erro

1. **Webhook test**
  - Admin pode testar webhook antes de usar
  - Envia payload de teste e mostra resposta

### Payload Exemplo

```json
{
  "event": "post.scheduled",
  "post_id": 123,
  "user_email": "admin@example.com",
  "video_url": "https://s3.amazonaws.com/...",
  "video_size": 1024000000,
  "caption": "Novo post! #instagram",
  "scheduled_date": "2026-04-10",
  "scheduled_time": "14:30",
  "timestamp": "2026-04-04T12:00:00Z"
}
```

---

## 🐳 Containerização (Docker )

### Dockerfile (Multi-stage)

```
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### docker-compose.yml (Easypanel)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:pass@mysql:3306/bluvinsta
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - S3_BUCKET=${S3_BUCKET}
    depends_on:
      - mysql
    restart: always

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=bluvinsta
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: always

volumes:
  mysql_data:
```

---

## 🚀 Variáveis de Ambiente (Easypanel)

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `NODE_ENV` | Ambiente (production/development) | `production` |
| `DATABASE_URL` | String de conexão MySQL | `mysql://user:pass@localhost:3306/bluvinsta` |
| `JWT_SECRET` | Chave para assinar tokens JWT | `seu_secret_aleatorio_aqui` |
| `AWS_ACCESS_KEY_ID` | Chave de acesso AWS | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta AWS | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Região AWS | `us-east-1` |
| `S3_BUCKET` | Nome do bucket S3 | `bluvinsta-videos` |
| `WEBHOOK_TIMEOUT` | Timeout webhook em ms | `10000` |
| `MAX_VIDEO_SIZE` | Tamanho máximo em bytes | `5368709120` (5GB) |

---

## 📁 Estrutura de Pastas (Projeto)

```
bluvinsta/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Telas (Dashboard, Schedule, Calendar, Settings)
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── lib/              # Helpers (trpc, auth, etc)
│   │   ├── App.tsx           # Router principal
│   │   └── index.css         # Estilos globais (dark theme)
│   └── public/               # Assets estáticos
├── server/                    # Backend Node.js
│   ├── routers.ts            # tRPC procedures
│   ├── db.ts                 # Queries ao banco
│   ├── storage.ts            # Helpers S3
│   └── _core/                # Framework (OAuth, context, etc)
├── drizzle/                   # Schema e migrations
│   └── schema.ts             # Definição de tabelas
├── shared/                    # Código compartilhado
├── Dockerfile                 # Container image
├── docker-compose.yml         # Orquestração
├── .env.example              # Variáveis de exemplo
└── DEPLOY.md                 # Guia de deploy
```

---

## ✅ Checklist de Implementação

### Backend

- [ ] Criar schema MySQL (users, posts, webhook_logs)

- [ ] Implementar autenticação JWT

- [ ] Criar procedures tRPC para posts CRUD

- [ ] Implementar upload S3 com presigned URLs

- [ ] Criar webhook integration

- [ ] Adicionar validações e error handling

### Frontend

- [ ] Converter HTML para React components

- [ ] Implementar telas (Dashboard, Schedule, Calendar, Settings)

- [ ] Integrar tRPC para chamadas ao backend

- [ ] Implementar upload de vídeos com progresso

- [ ] Adicionar autenticação JWT

### DevOps

- [ ] Criar Dockerfile otimizado

- [ ] Criar docker-compose.yml

- [ ] Configurar variáveis de ambiente

- [ ] Testar build local

- [ ] Criar guia de deploy

---

## 🔐 Segurança

| Aspecto | Implementação |
| --- | --- |
| **Autenticação** | JWT com refresh tokens, cookies HttpOnly |
| **Autorização** | Role-based access (user/admin) |
| **Validação** | Zod schemas em tRPC |
| **CORS** | Configurado para origem específica |
| **Rate Limiting** | Implementado em endpoints críticos |
| **HTTPS** | Obrigatório em produção (Easypanel fornece) |
| **Senhas** | Hash com bcrypt, salt rounds = 10 |

---

## 📊 Performance

| Otimização | Implementação |
| --- | --- |
| **Cache** | Redis para sessões (opcional) |
| **Compressão** | gzip em responses |
| **Índices DB** | Em user_id, scheduled_date |
| **Paginação** | Posts listados com limite |
| **CDN** | S3 CloudFront para vídeos |
| **Lazy Loading** | Componentes React com code-splitting |

---

## 🧪 Testes

```bash
# Testes unitários (Vitest)
pnpm test

# Testes de integração
pnpm test:integration

# Build production
pnpm build

# Start production
pnpm start
```

---

## 📝 Próximos Passos

1. **Implementar schema MySQL** → Criar migrations

1. **Desenvolver backend** → tRPC procedures + S3

1. **Converter frontend** → React components

1. **Dockerizar** → Dockerfile + docker-compose

1. **Documentar deploy** → Guia passo a passo

1. **Testar em staging** → Validar tudo antes de produção

1. **Deploy em Easypanel** → Seguir guia de deploy

---

**Versão:** 1.0**Data:** 04/04/2026**Status:** Planejamento Completo ✅

