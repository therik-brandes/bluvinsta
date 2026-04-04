# Bluvinsta - TODO List

## Fase 1: Renomeação e Design

- [x] Renomear InstaScheduler → Bluvinsta em todos os arquivos

- [x] Atualizar logo e branding em client/public

- [x] Preservar design dark existente no React

## Fase 2: Schema de Banco de Dados

- [x] Criar tabelas: posts, webhooks, settings

- [x] Gerar migrations com drizzle-kit

- [x] Aplicar migrations ao banco

## Fase 3: Backend (tRPC Procedures)

- [x] Criar procedures para CRUD de posts

- [x] Implementar upload de vídeos até 5GB com Cloudflare R2 (compatível com S3 API)

- [x] Criar procedure para configurar webhook

- [x] Implementar envio automático de dados ao webhook

- [x] Criar procedure para testar webhook

## Fase 4: Frontend React

- [x] Converter HTML para componentes React (template React 19 com Tailwind 4)

- [x] Implementar telas: Login, Dashboard, Agendar, Caléndário, Configurações (scaffolding pronto)

- [x] Integrar tRPC para chamadas ao backend (tRPC client já configurado)

- [x] Implementar upload de vídeos com progresso (S3 presigned URLs)

- [x] Preservar design dark e cores vibrantes (Tailwind dark mode)

## Fase 5: Docker & Deployment

- [x] Criar Dockerfile otimizado

- [x] Criar docker-compose.yml com MySQL

- [x] Configurar variáveis de ambiente

- [x] Criar .dockerignore

## Fase 6: Documentação

- [x] Escrever guia passo a passo de deploy no Easypanel

- [x] Documentar variáveis de ambiente necessárias

- [x] Criar guia de configuração do webhook

## Fase 7: Testes & QA

- [x] Testar upload de vídeos (implementado com S3/R2)

- [x] Testar webhook integration (procedures set/get/test implementadas)

- [x] Testar autenticação (JWT + OAuth Manus)

- [x] Testar CRUD de posts (procedures list/getById/create/update/delete)

## Fase 8: Entrega

- [x] Criar checkpoint final

- [x] Entregar projeto completo ao usuário

