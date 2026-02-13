## TGOO Visitas – MVP Interno

Aplicação interna para equipa comercial TGOO em formato PWA (mobile-first) para registo de visitas presenciais, vendas e follow-ups, com áudio + IA.

> **📋 Para contexto completo do projeto e progresso de desenvolvimento, consulta [`PROGRESSO-DESENVOLVIMENTO.md`](./PROGRESSO-DESENVOLVIMENTO.md)**

**Status Atual**: Fases 1–4 completas ✅  
- ✅ Setup do projeto + Auth + Layouts
- ✅ Prisma + MySQL + Seed
- ✅ Check-in/Check-out com GPS e timer
- ✅ Pesquisa e criação de empresas

### Stack
- **Framework**: Next.js 14 (App Router) + TypeScript  
- **UI**: TailwindCSS v4 + shadcn/ui (design mobile-first)  
- **Auth**: NextAuth (Credenciais, com Passkeys/WebAuthn planeados)  
- **BD**: MySQL via Prisma  
- **Outros**: bcrypt, zod

---

## Setup de Desenvolvimento

### 1. Dependências

```bash
npm install
```

### 2. Configurar base de dados MySQL

Crie uma base de dados MySQL local (por exemplo `siliviat`).

Exemplo de URL:

```bash
export DATABASE_URL="mysql://user:password@localhost:3306/siliviat"
```

Defina `DATABASE_URL` no seu `.env` (ou via ambiente) antes de correr as migrations.

### 3. Variáveis de ambiente básicas

Crie um `.env` baseado em `.env.example` com pelo menos:

```bash
DATABASE_URL="mysql://user:password@localhost:3306/siliviat"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="algum-segredo-seguro"
DEV_ADMIN_EMAIL="admin@example.com"
DEV_ADMIN_PASSWORD="admin123"
```

### 4. Prisma – migrations e seed

Aplicar o schema à base de dados e gerar cliente:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Popular utilizador admin e tecnologias iniciais:

```bash
npm run prisma:seed
```

---

## Correr o projeto

```bash
npm run dev
```

Abra `http://localhost:3000` no browser.

- Login de desenvolvimento (após seed):  
  - **Email**: valor de `DEV_ADMIN_EMAIL`  
  - **Password**: valor de `DEV_ADMIN_PASSWORD`

- Ao entrar, será redirecionado para `/app/checkin`.  
- Área de administração em `/admin/dashboard` (necessita role `ADMIN`).

---

## Roadmap de Fases (resumo)

- **Fase 1**: Setup, auth básica, layouts `/app` e `/admin` e páginas shell.  
- **Fase 2**: Modelos Prisma (User, Company, Technology, Visit, Sale, Task, AuditLog), migrations e seed.  
- **Fase 3**: Check-in/out com GPS e timer.
- **Fase 4**: Pesquisa e criação de empresas + integração com check-in.
- **Fase 5+**: Áudio + upload, IA (transcrição/análise), vendas, dashboards e PWA/offline.
