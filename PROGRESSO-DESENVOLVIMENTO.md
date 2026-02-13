# TGOO Visitas – Progresso de Desenvolvimento

**Data última atualização**: 13 de Fevereiro de 2026  
**Status**: Fases 1–8 completas e testadas (Setup, BD/Seed, Check-in/Check-out, Empresas, Áudio, Transcrição/IA, Vendas, Dashboards)  
**Próxima fase**: Fase 9 – PWA, Offline e Sync

**✨ Fase 8 validada e operacional**: Dashboards e páginas de gestão admin implementados com sucesso!

---

## 📋 Visão Geral do Projeto

**Objetivo**: Sistema interno PWA (mobile-first) para a equipa comercial TGOO registar visitas presenciais a clientes, com funcionalidades avançadas:

- **Check-in/out** com geolocalização GPS + timer automático de duração
- **Pesquisa/criação rápida** de empresas (base de dados interna)
- **Gravação de áudio** das conversas com clientes
- **Transcrição automática** via IA (ex: OpenAI Whisper)
- **Análise inteligente** da conversa: sentimento (positiva/negativa), tags, resumo, próximos passos sugeridos
- **Registo de vendas** por tecnologia vendida
- **Dashboards** para comerciais e admin com métricas (visitas, tempo em cliente, conversão, follow-ups)
- **Offline-first** com sincronização quando volta a ter rede
- **Entrada rápida** com biometria do dispositivo (FaceID/TouchID via Passkeys/WebAuthn)

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework**: Next.js 14 (App Router) + TypeScript
- **UI**: TailwindCSS v4 + componentes shadcn/ui (mobile-first, clean, operacional)
- **Validação**: Zod (schemas de validação client + server)
- **PWA**: Service Worker + manifest (Fase 9)

### Backend
- **Runtime**: Next.js Server Components + API Routes
- **Auth**: NextAuth v4 (Credentials provider + role-based access: ADMIN/SALES)
- **Passkeys**: WebAuthn (planeado para entrada rápida com biometria)

### Base de Dados
- **SGBD**: MySQL
- **ORM**: Prisma 6.19.2 (downgrade do Prisma 7 que tinha problemas de engine)
- **Modelos**: User, Company, Technology, Visit, Sale, Task, AuditLog

### Integrações (Planeadas)
- **Storage de áudio**: S3-compatible (Cloudflare R2 / AWS S3) ou filesystem em dev
- **IA**:
  - **Transcrição**: OpenAI Whisper (ou alternativa)
  - **Análise**: LLM (ex: GPT-4) para classificar sentimento, extrair tags, resumir e sugerir próximas ações
- **Geolocalização**: Browser Geolocation API (com permissões explícitas)
- **Observabilidade**: Logs estruturados + Audit Log (eventos críticos como check-in/out, vendas)

### Deploy
- **Ambiente dev**: `npm run dev` (localhost:3000)
- **Produção**: Preparado para Vercel (ou similar: Railway, Render, etc.)

---

## ✅ O Que Já Foi Implementado

### **FASE 1 – Setup do Projeto, Auth e Layouts** ✅

#### Inicialização do projeto
- ✅ Next.js 14 com App Router, TypeScript, `src/` habilitado
- ✅ TailwindCSS v4 configurado + tema base (cores, tipografia, dark mode)
- ✅ shadcn/ui inicializado (componentes Button, Input, Card, Badge preparados)
- ✅ Zod instalado para validação
- ✅ `.env.example` criado com variáveis necessárias

#### Estrutura de rotas
- ✅ Layout raiz (`app/layout.tsx`) com `AuthProvider` de sessão
- ✅ Redirect em `/` para `/login` (se não autenticado) ou `/app/checkin` (se autenticado)
- ✅ Layout autenticado em `app/(app)/app/layout.tsx`:
  - Protege rotas `/app/*` (apenas SALES/ADMIN)
  - Inclui `TopBar` com estado Online/Offline, utilizador e botão "Sync" (ainda stub)
- ✅ Layout admin em `app/(admin)/admin/layout.tsx`:
  - Protege rotas `/admin/*` (apenas ADMIN)
  - Usa mesmo `TopBar`
- ✅ Páginas "casca" criadas (placeholder UI):
  - `/login`, `/app/checkin`, `/app/companies`, `/app/visit/[id]`, `/app/sales`, `/app/dashboard`
  - `/admin/dashboard`, `/admin/companies`, `/admin/users`, `/admin/visits`, `/admin/sales`, `/admin/technologies`

#### Autenticação
- ✅ **NextAuth configurado**:
  - Provider: `Credentials` (email + password)
  - Callbacks personalizados para incluir `role` e `id` na sessão
  - Session strategy: JWT
- ✅ **Login UI** em `/login`:
  - Formulário com validação (zod)
  - Botão stub "Entrada rápida (Passkey / biometria)" – UI pronta, backend planeado para fase posterior
  - Aviso de consentimento para geolocalização/microfone
- ✅ **Credenciais de desenvolvimento** (fallback se `.env` não definir):
  - Email: `admin@example.com`
  - Password: `admin123`
  - Role: `ADMIN`

#### Componentes base
- ✅ `TopBar` (`src/components/top-bar.tsx`):
  - Indicador Online/Offline (via `navigator.onLine`)
  - Nome do utilizador
  - Botão "Sync" (stub, a implementar na Fase 9)
  - Botão "Sair" (logout via NextAuth)

#### Segurança & audit
- ✅ Helper de audit log em `src/lib/audit.ts`:
  - Função `logAuditEvent` para registar ações críticas (login, check-in/out, vendas)
  - Guarda userId, action, IP, userAgent e metadata (JSON)

---

### **FASE 2 – Modelos Prisma, Migrations e Seed** ✅

#### Schema Prisma (`prisma/schema.prisma`)
- ✅ Datasource: MySQL com `url = env("DATABASE_URL")`
- ✅ Generator: `prisma-client-js` (Prisma 6)
- ✅ **Enums**:
  - `UserRole` (ADMIN, SALES)
  - `TalkedToRole` (OWNER, MANAGER, EMPLOYEE)
  - `Sentiment` (POSITIVE, NEGATIVE, NEUTRAL)
  - `TaskStatus` (OPEN, DONE)
  - `TaskSource` (AI, MANUAL)

- ✅ **Modelos**:

#### `User`
```prisma
- id (cuid)
- name (String?)
- email (String @unique)
- role (UserRole, default: SALES)
- passwordHash (String)
- passkeyEnabled (Boolean, default: false)
- visits (Visit[])
- sales (Sale[])
- tasks (Task[])
- logs (AuditLog[])
- createdAt, updatedAt
```

#### `Company`
```prisma
- id (cuid)
- name (String, obrigatório)
- address, phone, email, nif (String?, opcionais)
- visits (Visit[])
- sales (Sale[])
- tasks (Task[])
- createdAt, updatedAt
```

#### `Technology`
```prisma
- id (cuid)
- name (String @unique)
- description (String?)
- active (Boolean, default: true)
- sales (Sale[])
```

#### `Visit`
```prisma
- id (cuid)
- userId (String, FK User)
- companyId (String?, FK Company opcional)
- user (User?)
- company (Company?)
- checkInAt (DateTime)
- checkOutAt (DateTime?)
- durationSeconds (Int?)
- checkInLat, checkInLng (Float?)
- checkOutLat, checkOutLng (Float?)
- talkedToRole (TalkedToRole?)
- audioUrl (String?, para ficheiro de áudio)
- transcriptText (String?, texto da transcrição)
- aiSentiment (Sentiment?)
- aiTags (Json?, array de strings)
- aiSummary (String?)
- aiNextActions (Json?, array de objetos {title, priority, dueDate?, done})
- suggestedFollowup (Json?, sugestões de follow-up)
- sales (Sale[])
- tasks (Task[])
- createdAt, updatedAt
```

#### `Sale`
```prisma
- id (cuid)
- userId, companyId, visitId?, technologyId (FKs)
- valueCents (Int?, valor em cêntimos)
- notes (String?)
- user, company, visit?, technology (relações)
- createdAt
```

#### `Task`
```prisma
- id (cuid)
- userId, companyId?, visitId? (FKs)
- title (String)
- status (TaskStatus, default: OPEN)
- dueAt (DateTime?)
- source (TaskSource, default: MANUAL)
- user, company?, visit? (relações)
- createdAt, updatedAt
```

#### `AuditLog`
```prisma
- id (cuid)
- userId (String?, FK User opcional)
- action (String, ex: "visit.checkin", "sale.create")
- ip, userAgent (String?)
- metadata (Json?)
- user (User?)
- createdAt
```

#### Migrations
- ✅ Migration inicial aplicada (`npx prisma migrate dev --name init`)
- ✅ Prisma Client gerado em `node_modules/@prisma/client`

#### Helper Prisma
- ✅ `src/lib/prisma.ts`:
  - Singleton de `PrismaClient` para evitar múltiplas instâncias em dev
  - Log level: `["error", "warn"]`

#### Seed (`prisma/seed.cjs`)
- ✅ Script CommonJS (compatível com Prisma 6)
- ✅ Carrega `.env` com `dotenv`
- ✅ Cria:
  - **1 utilizador ADMIN** (email/password de `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` ou defaults)
  - **5 tecnologias ativas**: Fibra Ótica, Internet Móvel 5G, Telefonia Fixa VoIP, Central Telefónica Virtual, Serviços Cloud
- ✅ Comando: `npm run prisma:seed`

#### Ficheiros de configuração
- ✅ `prisma.config.ts`: define datasource URL e seed command
- ✅ `package.json`: scripts `prisma:migrate`, `prisma:generate`, `prisma:seed`

---

### **FASE 3 – Check-in/Check-out com GPS e Timer** ✅

#### APIs de Visitas

##### `POST /api/visits/checkin`
**Ficheiro**: `src/app/api/visits/checkin/route.ts`  
**Auth**: Requer sessão SALES/ADMIN  
**Input** (JSON):
```typescript
{
  companyId?: string;       // ID da empresa (opcional nesta fase)
  checkInLat?: number;      // Latitude GPS
  checkInLng?: number;      // Longitude GPS
  noGpsReason?: string;     // Justificação se sem GPS (min 3 chars)
}
```
**Validações**:
- Verifica se já existe visita ativa (checkOutAt === null) para o user → erro 400
- GPS obrigatório OU justificação (noGpsReason)

**Output** (201):
```json
{
  "visit": {
    "id": "cuid_da_visita",
    "checkInAt": "2026-02-12T10:30:00.000Z",
    "companyId": "..." // se fornecido
  }
}
```
**Side effects**:
- Cria registo `Visit` com `checkInAt = now`, coordenadas GPS
- Regista em `AuditLog` com action `"visit.checkin"` + metadata (visitId, hasGps, noGpsReason)

##### `POST /api/visits/checkout`
**Ficheiro**: `src/app/api/visits/checkout/route.ts`  
**Auth**: Requer sessão SALES/ADMIN  
**Input** (JSON):
```typescript
{
  checkOutLat?: number;
  checkOutLng?: number;
  noGpsReason?: string;
}
```
**Validações**:
- Verifica se existe visita ativa do user → erro 400 se não existir
- GPS obrigatório OU justificação

**Output** (200):
```json
{
  "visit": {
    "id": "...",
    "checkInAt": "...",
    "checkOutAt": "2026-02-12T11:15:00.000Z",
    "durationSeconds": 2700  // 45 minutos
  }
}
```
**Side effects**:
- Atualiza `Visit`: `checkOutAt = now`, calcula `durationSeconds`, guarda coordenadas
- Regista em `AuditLog` com action `"visit.checkout"` + metadata

#### UI de Check-in/Check-out

##### `app/(app)/app/checkin/page.tsx` (Server Component)
- Lê sessão via `getServerSession`
- Consulta BD para verificar se há visita ativa (`checkOutAt === null`)
- Passa dados iniciais para `CheckinClient`

##### `app/(app)/app/checkin/checkin-client.tsx` (Client Component)
**Funcionalidades**:
- **Estado da visita**: mantém `activeVisit` (ou null) com ID, checkInAt, companyId
- **Timer em tempo real**:
  - Se há visita ativa, `setInterval` a cada 1 segundo
  - Calcula duração (now - checkInAt) e mostra em formato `HH:MM:SS`
- **Geolocalização**:
  - Tenta obter via `navigator.geolocation.getCurrentPosition`
  - Opções: `enableHighAccuracy: true`, timeout 15s
  - Se falhar ou não disponível: `window.prompt` pede justificação (mínimo 3 chars)
- **Botão "ENTREI NO CLIENTE (CHECK-IN)"**:
  - Verde (`bg-emerald-600`), grande, visível apenas se **não** há visita ativa
  - Ao clicar: obtém GPS → chama `POST /api/visits/checkin` → atualiza estado local
- **Botão "SAÍ DO CLIENTE (CHECK-OUT)"**:
  - Vermelho (`bg-red-600`), grande, visível apenas se **há** visita ativa
  - Ao clicar: obtém GPS → chama `POST /api/visits/checkout` → limpa estado local
- **Estados de loading** e mensagens de erro claras
- **Design mobile-first**: botões grandes (h-16), tipografia simples, espaçamento generoso

---

### **FASE 4 – Pesquisa/Criação de Empresas** ✅

#### APIs implementadas
- ✅ `GET /api/companies?query=<termo>`: pesquisa por nome (case-insensitive), paginada
  - Suporta parâmetros: `query` (opcional), `page` (default: 1), `limit` (default: 20, max: 50)
  - Retorna lista de empresas com contador de visitas e vendas
  - Ordenação alfabética por nome
- ✅ `POST /api/companies`: criar empresa (nome obrigatório, restantes campos opcionais)
  - Validação com Zod: nome obrigatório (max 255 chars), email válido, etc.
  - Verifica duplicados por nome (case-insensitive)
  - Retorna 409 se empresa já existe
  - Registra em AuditLog a criação

#### UI implementada em `/app/companies`
- ✅ Search bar com debounce (300ms)
- ✅ Lista de resultados com informações completas (nome, morada, telefone, email, NIF, contador de visitas/vendas)
- ✅ Botão "+ Nova Empresa" que abre formulário in-line
- ✅ Formulário rápido com:
  - Nome (obrigatório)
  - Morada, Telefone, NIF, Email (opcionais)
  - Validação client-side
  - Feedback de erro e sucesso
- ✅ Call-to-action "Criar empresa" quando pesquisa não retorna resultados
- ✅ Design mobile-first com cards de empresas
- ✅ Server Component que carrega top 20 empresas inicialmente

#### Integração com visitas
- ✅ Seção "Empresa a visitar" na página `/app/checkin`
- ✅ Campo de pesquisa com debounce (300ms) mostrando até 5 resultados
- ✅ Seleção de empresa antes do check-in (opcional)
- ✅ Empresa associada é enviada para API de check-in no campo `companyId`
- ✅ Link "Ver todas" para página completa de empresas
- ✅ Nota informativa: "Opcional: pode fazer check-in sem associar empresa"
- ✅ UI para alterar empresa selecionada antes do check-in
- ✅ Empresa selecionada mostrada com destaque (card verde)

#### Ficheiros criados/modificados
- ✅ `src/app/api/companies/route.ts` - APIs GET e POST
- ✅ `src/app/(app)/app/companies/page.tsx` - Server Component
- ✅ `src/app/(app)/app/companies/companies-client.tsx` - Client Component com pesquisa e formulário
- ✅ `src/app/(app)/app/checkin/checkin-client.tsx` - Adicionada integração de pesquisa de empresas

---

### **FASE 5 – Gravação de Áudio e Upload** ✅

#### Hook de Gravação de Áudio
- ✅ **`useAudioRecorder`** criado em `src/hooks/use-audio-recorder.ts`:
  - Estados: `idle`, `recording`, `finished`
  - Limite de gravação: 5 minutos (300 segundos)
  - Suporte a `MediaRecorder` API com tipos MIME automáticos (webm/mp4)
  - Timer em tempo real durante a gravação
  - Timeout automático ao atingir o limite
  - Preview de áudio antes do upload
  - Gerenciamento completo de recursos (cleanup de streams e URLs)
  - Tratamento de erros com feedback claro

#### API de Upload de Áudio
- ✅ **`POST /api/visits/[id]/audio`** criada em `src/app/api/visits/[id]/audio/route.ts`:
  - Validação de autenticação (sessão SALES/ADMIN)
  - Validação de ownership (apenas dono da visita ou ADMIN)
  - Upload via `FormData`
  - Validação de tipo de ficheiro (audio/*)
  - Validação de tamanho (máx 50MB)
  - Conversão de File para Buffer
  - Integração com storage helper
  - Atualização do campo `audioUrl` na visita
  - Registro em `AuditLog` com metadata completa

#### Storage Local (Desenvolvimento)
- ✅ **Helper de storage** criado em `src/lib/storage.ts`:
  - Função `saveAudioFile` para guardar áudio
  - Geração de nomes únicos com timestamp + ID aleatório
  - Detecção automática de extensão por MIME type
  - Suporte a formatos: webm, mp4, mp3, wav, ogg
  - Armazenamento em `public/uploads/audio/`
  - Retorno de URL relativo para acesso via browser
  - Preparado para migração futura para S3/R2

#### UI de Gravação
- ✅ **Componente `AudioRecorder`** criado em `src/app/(app)/app/visit/[id]/audio-recorder.tsx`:
  - Botão "Iniciar Gravação" (estado idle)
  - Indicador visual de gravação ativa (ponto vermelho pulsante)
  - Timer formatado (mm:ss) durante gravação
  - Botão "Parar Gravação"
  - Preview de áudio com player HTML5
  - Botões "Regravar" e "Guardar Áudio"
  - Estados de loading durante upload
  - Mensagens de erro e sucesso
  - Suporte a regravação se áudio já existe
  - Aviso: "Este áudio é para registo interno"
  - Design mobile-first com cores e espaçamento adequados

#### Página de Detalhe da Visita
- ✅ **Página `/app/visit/[id]`** completamente implementada:
  - Server Component que busca visita do banco de dados
  - Validação de autenticação e permissões
  - Informações da visita: empresa, comercial, horários, duração, estado
  - Integração do componente `AudioRecorder`
  - Placeholders para Fase 6 (Transcrição/IA) e Fase 7 (Vendas)
  - Tratamento de erros (visita não encontrada, sem permissão)
  - Formatação de datas e durações em português

#### Configurações e Segurança
- ✅ Diretório `public/uploads/audio/` criado com `.gitkeep`
- ✅ Ficheiros de áudio adicionados ao `.gitignore`
- ✅ Permissões validadas server-side (ownership + role)
- ✅ Audit log completo para uploads de áudio
- ✅ Validações robustas (tamanho, tipo, existência da visita)

#### Ficheiros criados/modificados
- ✅ `src/hooks/use-audio-recorder.ts` - Hook de gravação
- ✅ `src/lib/storage.ts` - Helper de armazenamento
- ✅ `src/app/api/visits/[id]/audio/route.ts` - API de upload
- ✅ `src/app/(app)/app/visit/[id]/page.tsx` - Página de detalhe (refatorada)
- ✅ `src/app/(app)/app/visit/[id]/audio-recorder.tsx` - Componente UI
- ✅ `public/uploads/audio/.gitkeep` - Marcador de diretório
- ✅ `.gitignore` - Exclusão de ficheiros de áudio

#### Testes Realizados
- ✅ Navegação para página de visita
- ✅ Renderização correta do componente de gravação
- ✅ Gravação de áudio com microfone real
- ✅ Preview de áudio antes do upload
- ✅ Upload completo para o servidor
- ✅ Armazenamento em filesystem local
- ✅ Persistência do `audioUrl` no banco de dados
- ✅ Tratamento de erros de permissão de microfone
- ✅ Validação de API com Prisma
- ✅ Teste end-to-end completo (gravar → preview → upload → sucesso)

#### Bugs Corrigidos
1. ✅ **Import do Prisma** (linha 4 de `route.ts` e `page.tsx`):
   - Problema: `import prisma from "@/lib/prisma"` (default import incorreto)
   - Solução: `import { prisma } from "@/lib/prisma"` (named export)
   - Causa: Prisma é exportado como `export const prisma`, não default export

2. ✅ **Async params no Next.js 15+** (página de visita):
   - Problema: `params.id` acessado diretamente causava erro
   - Solução: `const { id } = await params;` antes de usar
   - Causa: Next.js 15+ retorna `params` como Promise em rotas dinâmicas

3. ✅ **Async params na API de áudio**:
   - Problema: `context.params.id` acessado diretamente
   - Solução: `const { id: visitId } = await context.params;`
   - Erro original: "Erro interno ao processar áudio"

4. ✅ **Fallback para prompt() em navegadores headless**:
   - Problema: `window.prompt()` não suportado em testes automatizados
   - Solução: Verificação `typeof window.prompt === "function"` com fallback

#### Notas Técnicas
- MediaRecorder API requer permissão explícita do navegador
- Em produção, configurar variáveis de ambiente para S3/R2
- Áudios não são versionados (sobrescrevem se regravar)
- Formato de áudio depende do suporte do navegador (webm preferencial)
- Cleanup automático de recursos para evitar memory leaks
- **Importante**: Next.js 15+ trata `params` como Promise - sempre fazer `await`
- Diretório `public/uploads/audio/` tem permissões corretas (drwxrwxr-x)

---

### **FASE 6 – Transcrição e Análise IA** ✅

#### Helpers de IA
- ✅ **Helper de transcrição** criado em `src/lib/ai/transcribe.ts`:
  - Integração com OpenAI Whisper API
  - Suporte a múltiplos formatos de áudio (webm, mp4, mp3, wav, ogg)
  - Modo de desenvolvimento com transcrição simulada (quando OPENAI_API_KEY não configurada)
  - Conversão de ficheiros do filesystem para API
  - Retorno estruturado com texto, duração e idioma
  - Tratamento robusto de erros

- ✅ **Helper de análise** criado em `src/lib/ai/analyze.ts`:
  - Integração com OpenAI GPT (gpt-4o-mini)
  - Schema Zod para validação estruturada do output
  - Prompt system profissional e contextualizado
  - Extração automática de:
    - Sentimento (POSITIVE/NEGATIVE/NEUTRAL)
    - Tags relevantes (máximo 10)
    - Resumo objetivo (100-500 caracteres)
    - Próximas ações (até 5, com prioridade e data)
    - Sugestão de follow-up (canal e mensagem)
  - Modo de desenvolvimento com análise simulada
  - Response format JSON forçado para consistência
  - Validação Zod do output da IA

#### API de Transcrição e Análise
- ✅ **`POST /api/visits/[id]/transcribe-analyze`** criada:
  - Fluxo completo de 12 passos:
    1. Autenticação (SALES/ADMIN)
    2. Obtenção do ID da visita (await params)
    3. Busca da visita com relacionamentos
    4. Validação de ownership (dono ou ADMIN)
    5. Verificação de áudio disponível
    6. Check de re-análise (permite forçar com ?force=true)
    7. Transcrição via Whisper
    8. Análise via LLM
    9. Persistência no modelo Visit
    10. Criação automática de Tasks (source=AI)
    11. Registro em AuditLog
    12. Resposta estruturada
  - Validações robustas em cada etapa
  - Tratamento de erros detalhado
  - Logging console para debugging
  - Metadata completa no audit log

#### UI de Transcrição e Análise
- ✅ **Componente `TranscriptionAnalysis`** criado:
  - Estado: idle → processing → finished
  - Botão "Transcrever e Analisar" (aparece se há áudio)
  - Loading state com mensagem "pode demorar 30s-2min"
  - Renderização completa dos resultados:
    - **Badge de sentimento** colorido (verde/vermelho/cinza)
    - **Tags** como chips clicáveis
    - **Resumo** em card destacado
    - **Próximas ações** com checklist:
      - Título da ação
      - Badge de prioridade (Alta/Média/Baixa)
      - Data de vencimento (se houver)
    - **Sugestão de follow-up**:
      - Canal (email/phone/whatsapp/meeting)
      - Mensagem pré-formatada (se disponível)
    - **Transcrição completa** (colapsável)
  - Botão "Re-analisar" para forçar nova análise
  - Design mobile-first com cores e espaçamento adequados
  - Tratamento de erros com feedback visual

#### Integração com Página de Visita
- ✅ **Página `/app/visit/[id]` atualizada**:
  - Import do componente TranscriptionAnalysis
  - Passagem de dados iniciais (transcriptText, aiSentiment, etc.)
  - Check de áudio disponível (hasAudio)
  - Carregamento de dados do servidor (se já analisado)
  - Substituição do placeholder da Fase 5

#### Configurações e Tipos
- ✅ **Arquivo `src/types/next-auth.d.ts`** criado:
  - Extensões de tipos para NextAuth
  - Interfaces User e Session customizadas
  - Suporte a campos id e role
  
- ✅ **Arquivo `src/lib/auth.ts` atualizado**:
  - Export do tipo AppSession para reutilização
  - Correção de NextAuthConfig → NextAuthOptions

- ✅ **Correções de tipos TypeScript**:
  - Type assertions em todos os layouts e páginas server
  - Uso consistente de AppSession em APIs
  - Correção de logAuditEvent (req ao invés de ip/userAgent)
  - Fix em metadata do Prisma (cast as any)
  - Correção de ZodError.issues (não errors)
  - Fix de suggestedFollowup nullable no Prisma

- ✅ **Página de login com Suspense**:
  - Componente LoginForm separado
  - Wrapper com Suspense para evitar warning de useSearchParams
  - Build production sem erros

#### Ficheiros criados/modificados
- ✅ `src/lib/ai/transcribe.ts` - Helper de transcrição
- ✅ `src/lib/ai/analyze.ts` - Helper de análise com schema Zod
- ✅ `src/app/api/visits/[id]/transcribe-analyze/route.ts` - API endpoint
- ✅ `src/app/(app)/app/visit/[id]/transcription-analysis.tsx` - Componente UI
- ✅ `src/app/(app)/app/visit/[id]/page.tsx` - Integração do componente
- ✅ `src/types/next-auth.d.ts` - Tipos globais NextAuth
- ✅ `src/lib/auth.ts` - Export AppSession
- ✅ Correções em múltiplos arquivos de API e páginas server

#### Testes Realizados
- ✅ Build de produção completo sem erros TypeScript
- ✅ Compilação de todos os componentes e APIs
- ✅ Validação de tipos em todo o projeto
- ✅ Verificação de schemas Zod
- ✅ Correção de erros de Suspense na página de login

#### Bugs Corrigidos
1. ✅ **Tipos do NextAuth** (múltiplos arquivos):
   - Problema: TypeScript não reconhecia session.user
   - Solução: Type assertion `as AppSession | null` em todos os usos
   - Arquivos: layouts, páginas, APIs

2. ✅ **logAuditEvent API signature**:
   - Problema: Passagem incorreta de ip/userAgent como parâmetros diretos
   - Solução: Passar req como parâmetro, a função extrai ip/userAgent
   - Causa: Mudança na assinatura da função

3. ✅ **Metadata do Prisma**:
   - Problema: Tipo AuditMetadata não compatível com InputJsonValue
   - Solução: Cast `as any` no metadata do audit log

4. ✅ **ZodError.errors vs ZodError.issues**:
   - Problema: Zod usa `issues`, não `errors`
   - Solução: Corrigir referência em analyze.ts

5. ✅ **suggestedFollowup nullable**:
   - Problema: Prisma não aceita null diretamente em campos Json
   - Solução: Usar `|| undefined` para converter null em undefined

6. ✅ **NextAuthConfig vs NextAuthOptions**:
   - Problema: NextAuth v4 usa NextAuthOptions, não NextAuthConfig
   - Solução: Corrigir import e tipo em auth.ts

7. ✅ **useSearchParams sem Suspense**:
   - Problema: Warning de useSearchParams na página de login
   - Solução: Wrapper com Suspense no componente default

8. ✅ **Companies createdAt tipo Date**:
   - Problema: Prisma retorna Date, mas componente espera string
   - Solução: Conversão .toISOString() antes de passar para client

9. ✅ **prisma.config.ts DATABASE_URL**:
   - Problema: process.env.DATABASE_URL pode ser undefined
   - Solução: Fallback para string vazia `|| ""`

10. ✅ **visit.user nullable**:
    - Problema: TypeScript alerta que visit.user pode ser null
    - Solução: Uso de optional chaining `visit.user?.name`

#### Notas Técnicas
- **Modo de desenvolvimento**: Ambos os helpers têm fallbacks simulados quando OPENAI_API_KEY não está configurada
- **Modelo LLM**: Usa gpt-4o-mini por ser eficiente e barato (pode ser alterado para gpt-4)
- **Temperature**: 0.3 para respostas consistentes (baixa criatividade)
- **JSON forçado**: response_format json_object garante output estruturado
- **Tasks automáticas**: Criadas com source=AI para distinguir de manuais
- **Re-análise**: Suportada com query param ?force=true
- **Tipos globais**: next-auth.d.ts garante tipos consistentes em todo o projeto
- **Build**: Passou sem erros TypeScript ou warnings críticos

---

### **FASE 7 – Registo de Vendas** ✅

#### API de Vendas
- ✅ **`POST /api/sales`** criada em `src/app/api/sales/route.ts`:
  - Validação com Zod (visitId opcional, companyId e technologyId obrigatórios)
  - Verificação de tecnologia ativa
  - Verificação de empresa existente
  - Validação de ownership se visitId fornecido (dono ou ADMIN)
  - Criação de registo Sale com relacionamentos
  - Registro em AuditLog com metadata completa
  - Retorno estruturado com dados completos da venda
  
- ✅ **`GET /api/sales`** criada no mesmo ficheiro:
  - Autenticação obrigatória (SALES vê apenas suas, ADMIN vê todas)
  - Paginação (page, limit)
  - Filtro por tecnologia (technologyId)
  - Ordenação por data (mais recentes primeiro)
  - Retorno com dados completos (company, technology, visit, user)
  - Metadata de paginação (total, totalPages)

- ✅ **`GET /api/admin/technologies`** criada:
  - Lista tecnologias para selecção em formulários
  - Filtro activeOnly (default: true)
  - Ordenação alfabética por nome
  - Usado pelo componente de registo de vendas

#### UI de Registo de Vendas
- ✅ **Componente `SaleForm`** criado em `src/app/(app)/app/visit/[id]/sale-form.tsx`:
  - Modal customizado com Tailwind CSS
  - Carregamento automático de tecnologias
  - Select de tecnologia (obrigatório)
  - Input de valor em euros (opcional, convertido para cêntimos)
  - Textarea de notas (opcional, max 1000 chars)
  - Validação client-side
  - Estados de loading e sucesso
  - Feedback de erros claro
  - Auto-close após sucesso
  - Callback onSuccess para reload da página

- ✅ **Integração na página da visita**:
  - Botão "✅ Fechou Venda" em destaque
  - Apenas visível se visita tem empresa associada
  - Nota informativa se não há empresa
  - Listagem de vendas já registadas nesta visita
  - Cards coloridos para vendas existentes (verde)
  - Exibição de tecnologia, valor, notas e data
  - Auto-reload após registo bem-sucedido

#### Página de Listagem de Vendas
- ✅ **Página `/app/sales`** criada:
  - Server Component em `src/app/(app)/app/sales/page.tsx`
  - Client Component `SalesClient` em `sales-client.tsx`
  - Lista completa de vendas do comercial (ou todas se ADMIN)
  - Filtro por tecnologia
  - Paginação completa (anterior/seguinte)
  - Card de estatísticas:
    - Total de vendas
    - Valor total em euros
  - Cards individuais por venda:
    - Empresa e tecnologia
    - Valor formatado em euros
    - Notas (se existirem)
    - Data e hora formatadas
    - Link para a visita associada
  - Design mobile-first com cores e espaçamento adequados
  - Loading states e tratamento de erros

#### Modelo de Dados
- ✅ Modelo `Sale` já existente no schema Prisma:
  - userId (FK para User)
  - companyId (FK para Company)
  - visitId (FK opcional para Visit)
  - technologyId (FK para Technology)
  - valueCents (Int opcional, em cêntimos)
  - notes (String opcional)
  - createdAt (timestamp automático)
  - Relacionamentos completos definidos

#### Ficheiros criados/modificados
- ✅ `src/app/api/sales/route.ts` - APIs POST e GET
- ✅ `src/app/api/admin/technologies/route.ts` - API para listar tecnologias
- ✅ `src/app/(app)/app/visit/[id]/sale-form.tsx` - Componente de registo
- ✅ `src/app/(app)/app/visit/[id]/page.tsx` - Integração do formulário e listagem
- ✅ `src/app/(app)/app/sales/page.tsx` - Página de listagem (server)
- ✅ `src/app/(app)/app/sales/sales-client.tsx` - Componente de listagem (client)

#### Testes Realizados
- ✅ Build de produção completo sem erros TypeScript
- ✅ Compilação de todos os componentes e APIs
- ✅ Validação de schemas Zod
- ✅ Verificação de rotas (todas aparecem no build)
- ✅ Integração completa entre componentes

#### Funcionalidades Implementadas
1. ✅ Registo de vendas associadas a visitas
2. ✅ Registo de vendas com empresa (obrigatório)
3. ✅ Seleção de tecnologia vendida
4. ✅ Valor opcional em euros (com validação)
5. ✅ Notas opcionais (max 1000 caracteres)
6. ✅ Listagem de vendas do comercial
7. ✅ Filtro por tecnologia
8. ✅ Paginação de resultados
9. ✅ Estatísticas agregadas (total vendas, valor total)
10. ✅ Link para visita associada
11. ✅ Formatação de moeda em português
12. ✅ Formatação de datas em português
13. ✅ Audit log de criação de vendas
14. ✅ Validação de permissões (ownership + role)
15. ✅ Design mobile-first responsivo

#### Notas Técnicas
- **Conversão de valores**: Frontend trabalha em euros, backend em cêntimos (x100)
- **Validação dupla**: Client-side (UX) + server-side (segurança)
- **Tecnologias ativas**: Apenas tecnologias com `active: true` aparecem no select
- **Ownership**: SALES só vê suas vendas, ADMIN vê todas
- **Paginação**: Limite de 20 vendas por página (configurável)
- **Relacionamentos**: Sale inclui dados completos de company, technology, visit, user
- **Modal nativo**: Não usa biblioteca externa, apenas Tailwind CSS
- **Auto-reload**: Após criar venda, página recarrega para mostrar dados atualizados

---

### **FASE 8 – Dashboards e Métricas** ✅

#### API de Métricas
- ✅ **`GET /api/dashboard`** criada em `src/app/api/dashboard/route.ts`:
  - **Para SALES** (métricas do próprio comercial):
    - Total de visitas, duração total e média
    - Visitas por semana (últimas 8 semanas)
    - Breakdown de sentimentos (positivo/negativo/neutro)
    - Total de vendas e valor em euros
    - Vendas por tecnologia
    - Tarefas pendentes (com lista detalhada)
    - Follow-ups recentes
  - **Para ADMIN** (métricas globais):
    - Totais gerais (visitas, vendas, users, empresas)
    - Taxa de conversão (visitas → vendas)
    - Ranking de comerciais (visitas, vendas, tempo)
    - Visitas recentes (últimas 20)
    - Vendas recentes (últimas 20)
    - Tecnologias mais vendidas
    - Breakdown de sentimentos global
  - Agregações complexas com Prisma
  - Helper para cálculo de semanas do ano

#### Dashboard do Comercial (`/app/dashboard`)
- ✅ **Página completa** implementada:
  - **Cards de KPIs**: visitas, tempo total, sentimento positivo (%), vendas + valor
  - **Gráfico de barras**: visitas por semana (últimas 8 semanas) com altura proporcional
  - **Vendas por tecnologia**: cards com tecnologia, contador e valor total
  - **Tarefas pendentes**: lista com checkboxes (desabilitados), badges por fonte (IA/Manual), empresa, data de vencimento
  - **Follow-ups**: lista de visitas recentes com empresas para acompanhamento
  - **Botão atualizar**: recarrega métricas via API
  - Formatação de moeda em português (€)
  - Formatação de duração (Xh Ymin)
  - Server Component que busca dados iniciais
  - Client Component para interatividade

#### Dashboard Admin (`/admin/dashboard`)
- ✅ **Página completa** implementada:
  - **Cards de visão geral**: total visitas, vendas, comerciais, taxa de conversão
  - **Breakdown de sentimentos**: 3 cards coloridos (verde/vermelho/cinza)
  - **Ranking de comerciais**: lista ordenada por visitas com #posição, nome, visitas, tempo, vendas
  - **Tecnologias mais vendidas**: top 5 com contador e valor total
  - **Visitas recentes**: tabela com comercial, empresa, data, duração, link para ver
  - **Vendas recentes**: tabela com comercial, empresa, tecnologia, valor, data
  - Links para páginas de gestão
  - Botão atualizar métricas

#### Página de Gestão de Empresas (`/admin/companies`)
- ✅ **CRUD completo** implementado:
  - **API**: `GET/POST /api/companies`, `GET/PUT/DELETE /api/companies/[id]`
  - **Lista**: tabela com nome, telefone, email, NIF, contadores de visitas/vendas
  - **Pesquisa**: busca por nome com debounce (300ms)
  - **Paginação**: navegação entre páginas (20 por página)
  - **Criar**: modal com formulário (nome obrigatório, outros opcionais)
  - **Editar**: modal com dados pré-preenchidos
  - **Remover**: confirmação, apenas se sem visitas/vendas
  - Validação de duplicados (nome único)
  - Audit log de todas as operações
  - Apenas ADMIN pode editar/remover

#### Página de Gestão de Usuários (`/admin/users`)
- ✅ **CRUD completo** implementado:
  - **API**: `GET/POST /api/admin/users`, `GET/PUT/DELETE /api/admin/users/[id]`
  - **Lista**: tabela com nome, email, role (badge colorido), visitas, vendas
  - **Filtro**: por role (ADMIN/SALES/Todos)
  - **Paginação**: navegação entre páginas
  - **Criar**: modal com nome, email, password (min 6 chars), role
  - **Editar**: modal com dados, password opcional (deixar em branco para manter)
  - **Remover**: confirmação, não permite remover próprio user, apenas se sem dados associados
  - Hash de password com bcrypt (10 rounds)
  - Validação de duplicados (email único)
  - Audit log de todas as operações
  - Apenas ADMIN

#### Página de Listagem de Visitas (`/admin/visits`)
- ✅ **Página de listagem** implementada:
  - **API**: `GET /api/admin/visits` com filtros
  - **Lista**: tabela com comercial, empresa, check-in, duração, sentimento (badge), vendas
  - **Filtro**: por status (Todas/Em Curso/Concluídas)
  - **Paginação**: navegação entre páginas
  - Link para ver detalhes da visita
  - Formatação de duração e datas em português
  - Badge de sentimento colorido (verde/vermelho/cinza)
  - Apenas ADMIN

#### Página de Listagem de Vendas (`/admin/sales`)
- ✅ **Página de listagem** implementada:
  - **API**: reutiliza `GET /api/sales` (já existente, suporta ADMIN)
  - **Lista**: tabela com comercial, empresa, tecnologia (badge), valor (€), data, notas
  - **Filtro**: por tecnologia (dropdown com todas as tecnologias ativas)
  - **Paginação**: navegação entre páginas
  - **Card de resumo**: total de valor das vendas da página atual
  - Formatação de moeda em português
  - Truncamento de notas longas (30 chars)
  - Apenas ADMIN

#### Página de Gestão de Tecnologias (`/admin/technologies`)
- ✅ **CRUD completo** implementado:
  - **API**: atualizada `GET/POST /api/admin/technologies`, nova `GET/PUT/DELETE /api/admin/technologies/[id]`
  - **Lista**: tabela com nome, descrição (truncada), status (badge Ativa/Inativa), vendas
  - **Criar**: modal com nome, descrição (opcional), checkbox ativa
  - **Editar**: modal com dados pré-preenchidos
  - **Remover**: confirmação, apenas se sem vendas associadas
  - Validação de duplicados (nome único)
  - Audit log de todas as operações
  - Campo active para ativar/desativar sem remover
  - Apenas ADMIN

#### Ficheiros criados/modificados
- ✅ `src/app/api/dashboard/route.ts` - API de métricas (SALES + ADMIN)
- ✅ `src/app/(app)/app/dashboard/page.tsx` - Server component do dashboard comercial
- ✅ `src/app/(app)/app/dashboard/dashboard-client.tsx` - Client component com KPIs e gráficos
- ✅ `src/app/(admin)/admin/dashboard/page.tsx` - Server component do dashboard admin
- ✅ `src/app/(admin)/admin/dashboard/dashboard-client.tsx` - Client component com métricas globais
- ✅ `src/app/api/companies/[id]/route.ts` - APIs GET/PUT/DELETE para empresas individuais
- ✅ `src/app/(admin)/admin/companies/page.tsx` - Server component de gestão de empresas
- ✅ `src/app/(admin)/admin/companies/companies-admin-client.tsx` - Client component com CRUD
- ✅ `src/app/api/admin/users/route.ts` - APIs GET/POST para usuários
- ✅ `src/app/api/admin/users/[id]/route.ts` - APIs GET/PUT/DELETE para usuários individuais
- ✅ `src/app/(admin)/admin/users/page.tsx` - Server component de gestão de usuários
- ✅ `src/app/(admin)/admin/users/users-admin-client.tsx` - Client component com CRUD
- ✅ `src/app/api/admin/visits/route.ts` - API GET para visitas com filtros
- ✅ `src/app/(admin)/admin/visits/page.tsx` - Server component de listagem de visitas
- ✅ `src/app/(admin)/admin/visits/visits-admin-client.tsx` - Client component com filtros
- ✅ `src/app/(admin)/admin/sales/page.tsx` - Server component de listagem de vendas
- ✅ `src/app/(admin)/admin/sales/sales-admin-client.tsx` - Client component com filtros
- ✅ `src/app/api/admin/technologies/route.ts` - Atualizada com POST
- ✅ `src/app/api/admin/technologies/[id]/route.ts` - APIs GET/PUT/DELETE para tecnologias
- ✅ `src/app/(admin)/admin/technologies/page.tsx` - Server component de gestão de tecnologias
- ✅ `src/app/(admin)/admin/technologies/technologies-admin-client.tsx` - Client component com CRUD

#### Testes Realizados
- ✅ Build de produção completo sem erros TypeScript
- ✅ Compilação de todos os componentes, páginas e APIs
- ✅ Validação de rotas (todas aparecem no build)
- ✅ Verificação de tipos em todas as páginas e APIs

#### Funcionalidades Implementadas
1. ✅ API de métricas com diferenciação SALES/ADMIN
2. ✅ Dashboard comercial com KPIs, gráfico de visitas e tarefas
3. ✅ Dashboard admin com visão geral, rankings e tabelas
4. ✅ CRUD completo de empresas (apenas ADMIN)
5. ✅ CRUD completo de usuários (apenas ADMIN)
6. ✅ Listagem e filtros de visitas (apenas ADMIN)
7. ✅ Listagem e filtros de vendas (apenas ADMIN)
8. ✅ CRUD completo de tecnologias (apenas ADMIN)
9. ✅ Paginação em todas as listagens
10. ✅ Modais para criação e edição (UX melhorada)
11. ✅ Validações client-side e server-side
12. ✅ Mensagens de erro e sucesso
13. ✅ Audit log de todas as operações críticas
14. ✅ Formatação de moeda e datas em português
15. ✅ Design mobile-first consistente

#### Notas Técnicas
- **Agregações complexas**: Uso de Prisma `groupBy`, `_count`, `_sum` para métricas
- **Performance**: Queries otimizadas com `select` específicos e limites
- **Segurança**: Validação de role em todas as APIs admin
- **UX**: Loading states, feedback de erro/sucesso, confirmações de remoção
- **Paginação**: Implementada com cursor e contador total
- **Filtros**: Uso de query params com defaults sensatos
- **Modais**: Implementados com Tailwind CSS puro (sem biblioteca externa)
- **Gráfico de visitas**: Implementado com CSS puro (sem biblioteca de gráficos)
- **Campos JSON**: Prisma tem limitações em queries de campos Json, removido filtro complexo de suggestedFollowup

---


## 🔄 O Que Falta Implementar

### **FASE 9 – PWA, Offline e Sync**

#### PWA Setup
- **Manifest** (`app/manifest.webmanifest`):
  - name, short_name, icons (vários tamanhos), theme_color, background_color
  - display: "standalone"
  - start_url: "/"
- **Ícones**: gerar em vários tamanhos (192x192, 512x512, etc.)
- **Service Worker** (via Next.js plugin ou manual):
  - Cache de assets estáticos (JS, CSS, imagens)
  - Estratégia: Cache-First para assets, Network-First para APIs

#### Offline Data
- **IndexedDB** (`src/lib/offline-store.ts`):
  - Tabela `pendingEvents`: id, type (checkin/checkout/company/audio), payload, timestamp
  - Métodos: `addEvent`, `getAllPending`, `removeEvent`
- **Lógica client**:
  - Se `!navigator.onLine`: guardar evento em IndexedDB + mostrar UI "A guardar offline"
  - Listener `window.addEventListener('online', ...)`: trigger sync automático

#### Mecanismo de Sync
- **Botão "Sync" na `TopBar`**:
  - Lê eventos pendentes de IndexedDB
  - Envia para APIs na ordem correta
  - Remove de IndexedDB após sucesso
  - Atualiza UI (re-fetch visitas ativas, etc.)
- **Background Sync** (opcional, via Service Worker):
  - Sincroniza automaticamente quando volta online
  - Fallback para botão manual se browser não suportar

#### Testes de offline
- Simular com DevTools (Network → Offline)
- Verificar que:
  - Check-in offline guarda localmente
  - Ao voltar online, sync envia para servidor
  - Não perde dados

---

## 📂 Estrutura de Ficheiros Atual

```
/home/junior/projetos/tgoo/siliviat/
├── .env                          # Variáveis de ambiente (gitignored)
├── .env.example                  # Template de variáveis
├── README.md                     # Instruções de setup
├── PROGRESSO-DESENVOLVIMENTO.md  # Este documento
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── prisma.config.ts              # Config Prisma (datasource URL, seed)
│
├── prisma/
│   ├── schema.prisma             # Modelos, enums, datasource
│   ├── seed.cjs                  # Script de seed (CommonJS)
│   └── migrations/               # Migrations aplicadas
│       └── YYYYMMDD_init/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Layout raiz + AuthProvider
│   │   ├── page.tsx              # Redirect para /login ou /app/checkin
│   │   ├── globals.css           # TailwindCSS imports
│   │   │
│   │   ├── (auth)/               # Grupo de rotas não autenticadas
│   │   │   └── login/
│   │   │       └── page.tsx      # Página de login
│   │   │
│   │   ├── (app)/                # Grupo de rotas autenticadas (SALES/ADMIN)
│   │   │   └── app/
│   │   │       ├── layout.tsx    # Layout com TopBar
│   │   │       ├── page.tsx      # Redirect para /app/checkin
│   │   │       ├── checkin/
│   │   │       │   ├── page.tsx         # Server component (busca visita ativa)
│   │   │       │   └── checkin-client.tsx  # Client component (UI + timer)
│   │   │       ├── companies/
│   │   │       │   ├── page.tsx         # Server component (lista inicial)
│   │   │       │   └── companies-client.tsx  # Client component (pesquisa, formulário)
│   │   │       ├── visit/
│   │   │       │   └── [id]/
│   │   │       │       ├── page.tsx            # Página de detalhe da visita
│   │   │       │       ├── audio-recorder.tsx  # Componente de gravação (Fase 5)
│   │   │       │       ├── transcription-analysis.tsx  # Componente IA (Fase 6)
│   │   │       │       └── sale-form.tsx       # Formulário de vendas (Fase 7)
│   │   │       ├── sales/
│   │   │       │   ├── page.tsx                # Página de listagem de vendas
│   │   │       │   └── sales-client.tsx        # Componente cliente de listagem
│   │   │       └── dashboard/
│   │   │           └── page.tsx         # Placeholder (Fase 8)
│   │   │
│   │   ├── (admin)/              # Grupo de rotas admin (só ADMIN)
│   │   │   └── admin/
│   │   │       ├── layout.tsx    # Layout com check de role
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── companies/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── visits/page.tsx
│   │   │       ├── sales/page.tsx
│   │   │       └── technologies/page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts                    # NextAuth handler
│   │       ├── admin/
│   │       │   └── technologies/
│   │       │       └── route.ts                    # GET tecnologias
│   │       ├── companies/
│   │       │   └── route.ts                        # GET (pesquisa) e POST (criar)
│   │       ├── sales/
│   │       │   └── route.ts                        # POST e GET vendas (Fase 7)
│   │       └── visits/
│   │           ├── [id]/
│   │           │   ├── audio/
│   │           │   │   └── route.ts                # POST upload áudio (Fase 5)
│   │           │   └── transcribe-analyze/
│   │           │       └── route.ts                # POST transcrição/IA (Fase 6)
│   │           ├── checkin/
│   │           │   └── route.ts                    # POST check-in
│   │           └── checkout/
│   │               └── route.ts                    # POST check-out
│   │
│   ├── components/
│   │   ├── auth-provider.tsx     # SessionProvider wrapper
│   │   └── top-bar.tsx           # Componente da top bar (Online/Offline, Sync, Sair)
│   │
│   ├── lib/
│   │   ├── auth.ts               # authConfig do NextAuth + types de sessão
│   │   ├── prisma.ts             # Singleton PrismaClient
│   │   ├── audit.ts              # Helper logAuditEvent
│   │   ├── storage.ts            # Helper de armazenamento de áudio (Fase 5)
│   │   └── ai/
│   │       ├── transcribe.ts     # Helper de transcrição Whisper (Fase 6)
│   │       └── analyze.ts        # Helper de análise LLM (Fase 6)
│   │
│   └── types/
│       └── next-auth.d.ts        # Tipos globais NextAuth (Fase 6)
│
├── public/                       # Assets estáticos
└── node_modules/
```

---

## 🔑 Credenciais e Configurações

### Variáveis de Ambiente (`.env`)

```env
# Base de dados MySQL
DATABASE_URL="mysql://root:123456@localhost:3306/siliviat"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="algum-segredo-seguro"

# Utilizador de desenvolvimento (seed)
DEV_ADMIN_EMAIL="admin@example.com"
DEV_ADMIN_PASSWORD="admin123"

# Storage (a configurar na Fase 5)
STORAGE_ENDPOINT=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET=""

# IA (a configurar na Fase 6)
OPENAI_API_KEY=""
```

### Login de Desenvolvimento
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: `ADMIN`

---

## 🚀 Comandos Úteis

### Desenvolvimento
```bash
npm run dev              # Iniciar dev server (localhost:3000)
npm run build            # Build de produção
npm run start            # Correr build de produção
npm run lint             # ESLint
```

### Prisma
```bash
npx prisma generate                  # Gerar Prisma Client
npx prisma migrate dev --name <nome> # Criar e aplicar migration
npm run prisma:seed                  # Executar seed
npx prisma studio                    # Abrir Prisma Studio (GUI da BD)
npx prisma db push                   # Push schema sem migration (dev rápido)
```

### Git (não inicializado ainda)
```bash
git init
git add .
git commit -m "feat: Fases 1-3 completas (setup, BD, check-in/out)"
```

---

## 📊 Estado Atual da Base de Dados

### Registos criados pelo seed
- **1 User** (ADMIN):
  - email: `admin@example.com`
  - role: `ADMIN`
  - passwordHash: bcrypt hash de `admin123`

- **5 Technologies** (todas ativas):
  1. Fibra Ótica
  2. Internet Móvel 5G
  3. Telefonia Fixa VoIP
  4. Central Telefónica Virtual
  5. Serviços Cloud

### Tabelas vazias (preenchidas em runtime)
- `Company` (será preenchida na Fase 4)
- `Visit` (preenchida quando comerciais fazem check-in/out)
- `Sale` (preenchida na Fase 7)
- `Task` (preenchida na Fase 6 com ações sugeridas por IA)
- `AuditLog` (preenchida a cada ação crítica)

---

## ⚠️ Problemas Conhecidos Resolvidos

### Prisma 7 → Prisma 6
- **Problema**: Prisma 7 tinha incompatibilidades com engine "client" (exigia `adapter` ou `accelerateUrl`)
- **Solução**: Downgrade para Prisma 6.19.2 (estável e funcional)
- **Impacto**: Nenhum (Prisma 6 tem todas as features necessárias)

### Seed com TypeScript
- **Problema**: `ts-node` não resolvia imports de `@/generated/prisma` corretamente
- **Solução**: Converter seed para CommonJS (`seed.cjs`) com require nativo
- **Ficheiro**: `prisma/seed.cjs` (carrega `.env` com `dotenv`, usa `@prisma/client` padrão)

---

## 🎯 Próximos Passos Imediatos

### Antes de começar Fase 4
1. ✅ Testar fluxo completo de check-in/out no browser
2. ✅ Verificar que audit logs estão a ser criados
3. ✅ Confirmar que timer funciona corretamente
4. ✅ Testar cenário sem GPS (com justificação)

### Iniciar Fase 4
1. Criar `GET /api/companies` com pesquisa por nome (Prisma `where: { name: { contains: query } }`)
2. Criar `POST /api/companies` com validação zod (nome obrigatório)
3. Implementar UI de pesquisa em `/app/companies` com debounce
4. Adicionar botão "Associar empresa" na página de check-in ou visita
5. Testar criação e associação de empresa a visita

---

## 📝 Notas de Desenvolvimento

### Convenções de Código
- **TypeScript estrito**: evitar `any`, usar types/interfaces explícitos
- **Validação**: sempre usar Zod para inputs de APIs
- **Error handling**: try/catch em todas as operações async, retornar erros estruturados
- **Audit log**: registar todas as ações críticas (check-in/out, vendas, transcrições, alterações de users/empresas)
- **Commits**: mensagens descritivas no formato `tipo: descrição` (ex: `feat: adiciona API de check-in`)

### Design Patterns
- **Server Components por defeito**: usar "use client" apenas quando necessário (estado, eventos, browser APIs)
- **API Routes**: sempre validar sessão no início, retornar JSON estruturado
- **Componentes**: pequenos, single-responsibility, reutilizáveis
- **Hooks custom**: para lógica complexa (ex: `useAudioRecorder`, `useGeolocation`)

### Performance
- **Lazy loading**: componentes pesados (dashboards, gráficos)
- **Paginação**: todas as listagens com >20 items
- **Índices na BD**: adicionar para queries frequentes (ex: `Visit.userId`, `Visit.companyId`)
- **Cache**: usar `revalidate` em Server Components para dados pouco voláteis (tecnologias, empresas)

### Segurança
- **HTTPS obrigatório** em produção
- **Roles verificados** server-side em todas as APIs
- **Inputs sanitizados**: Zod + Prisma previnem SQL injection
- **Secrets no .env**: nunca commitar `.env`, usar `.env.example`
- **Rate limiting**: considerar adicionar (ex: express-rate-limit) em produção

---

## 🔗 Referências e Documentação

- **Next.js 14 (App Router)**: https://nextjs.org/docs
- **Prisma 6**: https://www.prisma.io/docs
- **NextAuth**: https://next-auth.js.org/
- **TailwindCSS**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Zod**: https://zod.dev/
- **WebAuthn/Passkeys**: https://webauthn.guide/

---

## 📞 Contexto para Novos Agentes IA

Se estás a continuar o desenvolvimento deste projeto num novo chat:

1. **Lê este documento completo** para entender o que já foi feito
2. **Verifica o estado dos TODOs** no ficheiro de plano (se existir)
3. **Confirma que o ambiente está funcional**:
   - `npm install` (se node_modules não existir)
   - `npx prisma generate` (se Prisma Client não estiver gerado)
   - `npm run dev` (deve arrancar sem erros)
4. **Testa o fluxo básico**:
   - Login com `admin@example.com` / `admin123`
   - Check-in em `/app/checkin`
   - Check-out
   - Verifica BD com `npx prisma studio`
5. **Identifica a próxima fase** a implementar (provavelmente Fase 4) e segue o plano detalhado acima
6. **Mantém este documento atualizado** após completar cada fase
7. **Faz commits pequenos e frequentes** para não perder progresso

Boa sorte e bom código! 🚀
