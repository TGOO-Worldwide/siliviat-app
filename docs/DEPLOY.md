# Deploy via GitHub Actions (SSH – Cloud Panel)

O deploy é feito pelo workflow **Deploy to Cloud Panel** ao dar push na branch `main` ou ao rodar manualmente em **Actions → Deploy to Cloud Panel → Run workflow**.

## 1. Secrets no GitHub

Em **Settings → Secrets and variables → Actions** do repositório, crie:

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `SERVER_HOST` | Sim | IP ou domínio do servidor (ex: `meuservidor.com` ou `192.168.1.10`) |
| `SERVER_USER` | Sim | Usuário SSH (ex: `root` ou usuário do Cloud Panel) |
| `SSH_PRIVATE_KEY` | Sim | Chave privada SSH (conteúdo do arquivo, sem a parte pública) |
| `SERVER_APP_PATH` | Sim | Caminho da aplicação no servidor (ex: `/home/usuario/siliviat`) |
| `SERVER_PORT` | Não | Porta SSH (padrão: `22`) |

### Gerar chave SSH para deploy

No seu computador:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
```

- Adicione **deploy_key** (conteúdo do arquivo) como secret `SSH_PRIVATE_KEY`.
- No servidor, adicione a chave pública ao `~/.ssh/authorized_keys` do usuário que fará o deploy:

```bash
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

## 2. Servidor (Cloud Panel)

### Pré-requisitos

- Node.js 18+ (ou a versão que o projeto usa)
- npm
- Git
- MySQL (ou o banco que o Prisma usar em produção)
- PM2 ou systemd (para manter o app rodando)

### Primeira vez no servidor

1. Clone o repositório no caminho que você definiu em `SERVER_APP_PATH`:

   ```bash
   git clone https://github.com/SEU_USUARIO/siliviat.git /caminho/em/SERVER_APP_PATH
   cd /caminho/em/SERVER_APP_PATH
   ```

2. Crie o `.env` com as variáveis de produção (incluindo `DATABASE_URL` para MySQL e qualquer outra que o Next/Prisma precisem). **Não** commite o `.env`.

3. Instale dependências, gere o Prisma e rode migrações:

   ```bash
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   ```

4. Inicie a aplicação com PM2 (recomendado):

   ```bash
   pm2 start npm --name siliviat -- start
   pm2 save
   pm2 startup
   ```

   Se usar systemd, crie um unit `siliviat.service` que rode `npm start` (ou `node .next/standalone/...` se usar output standalone) no `SERVER_APP_PATH`.

### Reinício automático no deploy

O workflow tenta, nesta ordem:

1. `pm2 restart siliviat --update-env`
2. Se não houver PM2: `sudo systemctl restart siliviat`
3. Se nenhum dos dois estiver configurado, apenas o build é feito; é preciso reiniciar o app manualmente.

Para que o deploy reinicie sozinho, use PM2 (como acima) ou systemd.

## 3. Resumo do que o workflow faz

1. Conecta por SSH no servidor.
2. Entra em `SERVER_APP_PATH`.
3. `git fetch` + `git reset --hard origin/main`.
4. `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`.
5. Reinicia o app (PM2 ou systemd, se configurado).

## 4. Deploy manual

Em **Actions → Deploy to Cloud Panel → Run workflow** → escolha a branch (ex: `main`) e clique em **Run workflow**.

## 5. Ambiente “production”

O job usa `environment: production`. Se quiser, em **Settings → Environments** crie o ambiente **production** e configure protection rules ou variáveis específicas desse ambiente.
