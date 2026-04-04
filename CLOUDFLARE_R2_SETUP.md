# 🚀 Guia Cloudflare R2 para Bluvinsta

## Por que Cloudflare R2?

| Aspecto | AWS S3 | Cloudflare R2 |
|--------|--------|---------------|
| **Preço** | $0.023/GB (egress) | Sem taxa de egress! 🎉 |
| **Compatibilidade** | Padrão S3 | 100% compatível com S3 API |
| **Configuração** | Complexa | Simples (5 minutos) |
| **Ideal para** | Grandes volumes | Startups, pequenos projetos |

---

## ⚙️ Passo 1: Criar Conta Cloudflare

1. Acesse [cloudflare.com](https://www.cloudflare.com)
2. Clique em **"Sign Up"** (canto superior direito)
3. Preencha email e senha
4. Confirme email
5. Escolha plano **Free** (gratuito, perfeito para começar)

---

## 📦 Passo 2: Criar Bucket R2

### 2.1 Acessar R2
- Faça login no Cloudflare
- No menu esquerdo, procure por **"R2"** (Storage)
- Clique em **"Create bucket"**

### 2.2 Configurar Bucket
- **Bucket name:** `bluvinsta-videos` (ou seu nome preferido)
- **Region:** Deixe como padrão (Automatic)
- Clique **"Create bucket"**

### 2.3 Obter URL Pública (opcional)
Se quiser que vídeos sejam acessíveis publicamente:
- Dentro do bucket, vá para **Settings**
- Procure por **"Public access"**
- Clique em **"Allow access"**
- Copie a URL pública (ex: `https://pub-xxxxx.r2.dev`)

---

## 🔑 Passo 3: Gerar Credenciais API

### 3.1 Criar Token API
- No painel Cloudflare, vá para **Account > API Tokens** (canto superior direito)
- Clique em **"Create Token"**
- Escolha template **"Edit Cloudflare R2"**
- Clique **"Use this template"**

### 3.2 Configurar Permissões
- **Permissions:** Deixe como padrão (Object Read/Write)
- **Resources:** Selecione seu bucket `bluvinsta-videos`
- **TTL:** Deixe como padrão (nunca expira)
- Clique **"Create Token"**

### 3.3 Copiar Credenciais
Você verá uma tela com:
- **API Token** (copie este)
- Salve em local seguro

### 3.4 Obter Account ID e Access Key
Você também precisa de:
- **Account ID:** Vá para **Account > API Tokens > Account ID** (canto inferior esquerdo)
- **Access Key ID:** Seu API Token (do passo anterior)
- **Secret Access Key:** Será mostrado uma única vez (copie!)

---

## 🔐 Passo 4: Configurar Variáveis de Ambiente

No seu VPS/Easypanel, configure:

```bash
# Cloudflare R2 (em vez de AWS)
AWS_ACCESS_KEY_ID=seu_access_key_id_aqui
AWS_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
AWS_REGION=auto
S3_BUCKET=bluvinsta-videos

# Endpoint customizado do R2
S3_ENDPOINT=https://seu_account_id.r2.cloudflarestorage.com
```

**Onde encontrar:**
- `seu_account_id`: Seu Account ID do Cloudflare
- `seu_access_key_id`: Seu API Token
- `seu_secret_access_key`: Sua Secret Key

---

## 📝 Passo 5: Atualizar Configuração de Storage

No arquivo `server/storage.ts`, adicione:

```typescript
import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  endpoint: process.env.S3_ENDPOINT, // Cloudflare R2 endpoint
});
```

---

## ✅ Passo 6: Testar Conexão

### 6.1 Upload de Teste
```bash
# No seu servidor
curl -X PUT https://seu_account_id.r2.cloudflarestorage.com/bluvinsta-videos/test.txt \
  -H "Authorization: Bearer seu_access_key_id" \
  -d "Teste de conexão"
```

### 6.2 Verificar no Painel
- Acesse seu bucket no Cloudflare
- Você deve ver o arquivo `test.txt` lá

---

## 🎬 Passo 7: Upload de Vídeos (Fluxo Completo)

### Frontend
```typescript
// 1. Solicitar presigned URL
const { url, key } = await trpc.upload.getPresignedUrl.mutate({
  fileName: "meu_video.mp4",
  fileSize: 1024000000, // 1GB
});

// 2. Upload direto para R2
await fetch(url, {
  method: "PUT",
  body: videoFile,
  headers: { "Content-Type": "video/mp4" },
});

// 3. Confirmar upload
await trpc.upload.confirmUpload.mutate({
  key,
  fileName: "meu_video.mp4",
  fileSize: 1024000000,
});
```

### Backend
```typescript
// Gera URL pré-assinada válida por 30 minutos
const presignedUrl = await getSignedUrl(
  s3Client,
  new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `videos/${userId}/${timestamp}-${fileName}`,
  }),
  { expiresIn: 30 * 60 } // 30 minutos
);
```

---

## 💰 Preços Cloudflare R2

| Item | Preço |
|------|-------|
| **Armazenamento** | $0.015/GB/mês |
| **Upload (PUT)** | $0.005/10k requisições |
| **Download (GET)** | Grátis! 🎉 |
| **Limite de bucket** | Ilimitado |

**Exemplo:** 100GB de vídeos = ~$1.50/mês (muito barato!)

---

## 🔒 Segurança

### Boas Práticas
1. **Nunca exponha credenciais** no código
2. **Use variáveis de ambiente** para tudo
3. **Crie tokens com permissões limitadas** (apenas R2)
4. **Rotacione credenciais** a cada 90 dias
5. **Monitore uso** no painel Cloudflare

### Proteger Bucket
```bash
# Deixe privado por padrão
# Apenas autorize acesso via presigned URLs
# Nunca coloque credenciais no frontend
```

---

## 🚨 Troubleshooting

### Erro: "Access Denied"
- Verifique se `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` estão corretos
- Confirme que o token tem permissão R2

### Erro: "Invalid bucket"
- Verifique se `S3_BUCKET` é o nome correto
- Confirme que o bucket existe no Cloudflare

### Vídeo não aparece no bucket
- Verifique logs: `docker-compose logs app`
- Confirme que `S3_ENDPOINT` está configurado

---

## 📊 Monitorar Uso

No painel Cloudflare R2:
- **Requests:** Quantas requisições foram feitas
- **Storage:** Quanto espaço está sendo usado
- **Bandwidth:** Dados transferidos (egress)

---

## 🎯 Próximos Passos

1. ✅ Criar conta Cloudflare
2. ✅ Criar bucket R2
3. ✅ Gerar credenciais API
4. ✅ Configurar variáveis de ambiente
5. ✅ Testar upload
6. ✅ Deploy em produção

---

**Versão:** 1.0  
**Data:** 04/04/2026  
**Status:** Pronto para usar ✅
