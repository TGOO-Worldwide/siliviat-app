# Testes de Funcionalidade Offline - Fase 9

## Como Testar o Modo Offline

### 1. Iniciar a Aplicação

```bash
npm run dev
# ou para testar build de produção:
npm run build && npm run start
```

### 2. Fazer Login

- Aceder a `http://localhost:3000/login`
- Email: `admin@example.com`
- Password: `admin123`

### 3. Verificar Service Worker

1. Abrir DevTools (F12)
2. Ir para o painel "Application" (Chrome) ou "Storage" (Firefox)
3. Verificar "Service Workers" - deve aparecer `sw.js` registado
4. Console deve mostrar: `[PWA] Service Worker registado: http://localhost:3000/`

### 4. Testar Check-in Offline

#### Preparação:
1. Navegar para `/app/checkin`
2. Abrir DevTools → Network → Selecionar "Offline" ou "Slow 3G"
3. Verificar que o indicador no TopBar mudou para "Offline" (bolinha cinza)

#### Teste:
1. (Opcional) Selecionar uma empresa
2. Clicar em "ENTREI NO CLIENTE (CHECK-IN)"
3. Permitir acesso ao GPS (ou fornecer justificação)
4. **Resultado esperado**:
   - Mensagem verde: "✓ Check-in guardado offline. Será sincronizado quando voltar online."
   - Timer inicia a contar
   - Botão muda para "SAÍ DO CLIENTE (CHECK-OUT)"

#### Verificar IndexedDB:
1. DevTools → Application → IndexedDB → `tgoo-offline-db` → `pendingEvents`
2. Deve aparecer 1 evento do tipo "checkin"
3. Badge vermelho no botão "Sync" deve mostrar "1"

### 5. Testar Check-out Offline

1. Ainda em modo offline, clicar em "SAÍ DO CLIENTE (CHECK-OUT)"
2. **Resultado esperado**:
   - Mensagem verde: "✓ Check-out guardado offline. Será sincronizado quando voltar online."
   - Timer para
   - Botão volta para "ENTREI NO CLIENTE (CHECK-IN)"
3. IndexedDB deve ter 2 eventos agora (checkin + checkout)
4. Badge no botão "Sync" deve mostrar "2"

### 6. Testar Sincronização Manual

#### Voltar Online:
1. DevTools → Network → Selecionar "No throttling" (ou desmarcar Offline)
2. TopBar deve mostrar "Online" (bolinha verde)

#### Sincronização Automática:
- Ao voltar online, a sincronização deve disparar **automaticamente**
- Console deve mostrar: "Voltou online, sincronizando automaticamente..."
- Após alguns segundos:
  - Badge desaparece (contador volta a 0)
  - Mensagem temporária: "✓ 2 evento(s) sincronizado(s)"

#### Verificar no Banco de Dados:
1. Abrir outro terminal
2. `npx prisma studio`
3. Navegar para a tabela `Visit`
4. Deve aparecer a visita criada offline com:
   - `checkInAt` e `checkOutAt` preenchidos
   - Coordenadas GPS (se fornecidas)
   - `durationSeconds` calculado

### 7. Testar Sincronização Manual (Botão)

1. Repetir passos 4-5 (criar eventos offline)
2. Voltar online
3. **NÃO esperar** sincronização automática
4. Clicar no botão "Sync" manualmente
5. **Resultado esperado**: igual à sincronização automática

### 8. Testar PWA (Instalação)

#### Chrome/Edge:
1. Navegar para a aplicação
2. Barra de endereço deve mostrar ícone "Instalar" (➕)
3. Clicar para instalar
4. Aplicação abre em janela standalone (sem barra de navegador)

#### Android (via Chrome):
1. Menu → "Adicionar ao ecrã principal"
2. Ícone aparece no launcher
3. Abre como app nativa

#### iOS (Safari):
1. Botão "Partilhar" → "Adicionar ao ecrã principal"
2. Ícone aparece no home screen

### 9. Testar Cache de Assets

1. Com Service Worker registado e online:
   - Navegar entre páginas (`/app/checkin`, `/app/companies`, etc.)
   - DevTools → Network: ver requests sendo servidos pelo SW
2. Ficar offline
3. Navegar entre páginas já visitadas
4. **Resultado esperado**: páginas carregam instantaneamente do cache

### 10. Testar Casos de Erro

#### Erro de Rede (API):
1. Online, fazer check-in normal
2. Simular erro de rede durante a request
3. **Resultado esperado**: mensagem de erro clara

#### Limite de Retry:
1. Criar evento offline
2. Modificar `MAX_RETRIES` em `src/lib/sync.ts` para 1
3. Simular erro na API (ex: desligar servidor)
4. Voltar online e tentar sincronizar 3x
5. **Resultado esperado**: após 3 tentativas, evento é removido com mensagem de erro

## Checklist de Funcionalidades

- [x] Service Worker registado
- [x] Manifest PWA configurado
- [x] Ícones PWA criados
- [x] IndexedDB armazena eventos offline
- [x] Check-in offline funciona
- [x] Check-out offline funciona
- [x] Indicador Online/Offline atualiza
- [x] Badge de contador de eventos pendentes
- [x] Sincronização manual (botão)
- [x] Sincronização automática (ao voltar online)
- [x] Feedback visual de sincronização
- [x] Mensagens de sucesso/erro
- [x] Cache de assets estáticos
- [x] Instalação PWA (Chrome/Edge)
- [x] App funciona offline após instalação

## Observações

### Limitações Conhecidas:
1. **Áudio offline**: Não implementado (gravação de áudio requer servidor)
2. **Criação de empresas offline**: Implementado em código mas não testado extensivamente
3. **Vendas offline**: Implementado em código mas requer empresa e tecnologia já cacheadas

### Melhorias Futuras:
1. Background Sync API para sincronização mais robusta
2. Push Notifications para lembretes de follow-up
3. Indicador de progresso durante sincronização
4. Log de erros de sincronização visível ao usuário
5. Opção de limpar cache manualmente
6. Versão do cache com estratégia de invalidação

## Troubleshooting

### Service Worker não registra:
- Verificar se está usando HTTPS (ou localhost)
- Limpar cache do navegador
- Verificar console por erros

### Eventos não sincronizam:
- Verificar IndexedDB no DevTools
- Verificar se APIs estão funcionando (testar online primeiro)
- Verificar console por erros de rede

### Badge não atualiza:
- Verificar se `countPendingEvents()` está sendo chamado
- Verificar intervalo de atualização (10s)
- Forçar reload da página

### PWA não instala:
- Verificar se manifest está acessível (`/manifest.webmanifest`)
- Verificar se ícones existem
- Alguns navegadores exigem HTTPS
