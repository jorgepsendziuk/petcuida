# Revisão Funcional PetCuida – 09/11/2025

## 1. Funcionalidades atuais

### Web (Next.js + Ant Design)
- **Autenticação**: login/registro via Supabase Auth (`apps/web-next/src/app/(auth)`). Sessão observada pelo `AuthProvider`, com redirecionamentos automáticos no `DashboardShell`.
- **Dashboard**: estatísticas gerais (pets cadastrados, cuidados pendentes, próximo lembrete) e tabela “Próximos cuidados” alimentada pela view `vw_pet_care_status`.
- **Gestão de pets**:
  - Lista com paginação (`/pets`) e ações de detalhe/edição.
  - Formulários de criação/edição com campos de espécie, sexo, datas estimadas, peso e observações.
  - Página de detalhes agrega dados do pet e lista os tratamentos vinculados.
- **Gestão de cuidados/tratamentos**:
  - CRUD completo com associação ao pet, tipos (vacinas, vermífugo etc.), frequência, status e logs.
  - Página `/treatments/[id]` executa a RPC `log_pet_treatment` para registrar aplicações e exibe histórico.
- **Lembretes**: listagem simples de `reminders`, com marcação “entregue” (atualiza `delivered_at`).
- **Perfil**: exibe e atualiza dados da tabela `profiles`, além de permitir logout.
- **Chatbot**: interface em `/chatbot` que envia prompts para a edge function `chatbot-command` (OpenAI GPT-4.1-mini). Suporta ações `create_pet`, `create_pet_treatment`, `log_treatment` e feedback contextual.

### Mobile (Expo Router + React Native)
- Abas principais: `Home` (listagem de pets), `Reminders`, `Profile` (ver app layout).
- **Lista de pets**: fetch em Supabase, ordenação por nome, “pull to refresh”, acesso a detalhes e botão flutuante para cadastro rápido.
- **Reminders**: lista com marcação como “concluído”, sincronia com Supabase (`reminders` e `pets(name)`).
- **Perfil**: consumo dos mesmos dados da web (requere observar providers).
- **Autenticação**: compartilhada com supabase client (`lib/supabase.ts`), replicando fluxo de login/registro.

### Backend & integrações
- **Supabase**:
  - Tabelas e RLS definidas em `supabase/migrations/20251109000000_initial.sql`.
  - View `vw_pet_care_status` e função `log_pet_treatment` para simplificar o dashboard e registros.
- **Edge Function**: `supabase/edge-functions/chatbot-command` valida secret, chama OpenAI (`gpt-4.1-mini`), traduz instruções em comandos e executa operações Supabase sob o JWT do usuário.

---

## 2. Melhorias sugeridas (foco em usuários com muitos pets)

### Organização e navegação
1. **Filtros e busca avançada**:
   - Barra de busca por nome/ID de pet.
   - Filtros por espécie, status de tratamento, data próxima.
   - Salvar conjuntos de filtros favoritos (ex.: “Animais idosos”, “Vacinas em atraso”).
2. **Visões alternativas**:
   - Grade (cards menores) e tabela densa com possibilidade de esconder colunas para listas extensas.
   - Agrupamento por espécie ou tutor secundário (multi-usuário da família/ equipe).
3. **Paginação configurável**:
   - Permitir 25/50/100 linhas por página nas listagens para evitar rolagem constante.

### Ações em massa e automações
1. **Seleção múltipla** em listas de pets/tratamentos para:
   - Aplicar tags, atualizar status, configurar lembretes em lote.
   - Exportar CSV/PDF resumido.
2. **Templates e replicação**:
   - Criar “modelos de tratamento” reutilizáveis e aplicá-los a vários pets de uma vez.
   - Clonar pet/agenda para animais da mesma ninhada.
3. **Registros rápidos**:
   - Botão “Registrar dose para todos os selecionados” alimentando `log_pet_treatment`.
   - Atalhos para atualizar peso, vermífugo e antipulgas recorrentes.

### Lembretes e notificações
1. **Painel dedicado de alertas** com agrupamento por prioridade e indicação de atraso.
2. **Integração com notificações push/e-mail** configurável por pet ou por grupo.
3. **Regra de adiamento** (“snooze”) para reagendar lembretes já vencidos.

### UX e consistência de labels
1. **Traduções/terminologia**:
   - Tags de status exibem valores em inglês (`completed`, `scheduled`). Converter para PT-BR (“Concluído”, “Agendado” etc.).
   - Campo “notes” e mensagens do chatbot: garantir tom neutro e em português (“Informações adicionais” já ok).
   - Verificar placeholders do chatbot (ex.: “Ex: cadastre um pet…”), manter consistência com “Adicione”.
2. **Feedback contextual**:
   - Após criar/editar, oferecer link “Cadastrar próximo pet” ou “Voltar à lista filtrada”.
3. **Acessibilidade**:
   - Reforçar contraste em tags e botões, principalmente no mobile.
   - Permitir configurações de fonte maior para tutores com dificuldades visuais.

---

## 3. Análise específica de etiquetas e traduções

| Área | Situação atual | Ação sugerida |
| --- | --- | --- |
| Tags de status (`<Tag>{record.status}</Tag>`) | Exibem valores brutos (`scheduled`, `missed`). | Mapear para `Agendado`, `Perdido`, `Concluído`, `Cancelado`. |
| Tipo de tratamento (`record.kind`) | Mostra chave interna (`tick_flea`). | Já há `kindLabel`, garantir uso nas páginas de detalhe/log. |
| Chatbot – tags de ação | `formatAction` retorna “Cadastro de pet”, etc. | Cobrir todos os comandos futuros (“Atualizar pet”, “Criar lembrete”). |
| Placeholder do formulário do chatbot | “cadastre um pet...” | Manter coerência de capitalização (começar com maiúscula). |
| Menus e headings | PT-BR consistente (“Visão geral”, “Assistente”). | OK, apenas revisar “Cuidados” vs “Tratamentos” (usar um termo padrão). |

Sugestão geral: criar arquivo `locales/pt-BR.ts` com dicionário centralizado para reutilizar nos componentes e facilitar ajustes futuros (incluindo mobile).

---

## 4. Assistente – estado atual e próximos passos

### Estado atual
- UI web envia prompts para edge function `chatbot-command`, que:
  - Valida `x-petcuida-chatbot-secret`.
  - Usa OpenAI GPT-4.1-mini para mapear intenção → ação (`create_pet`, `create_pet_treatment`, `log_treatment`).
  - Executa operações Supabase com o token do usuário.
  - Retorna JSON com `action` e payload para a UI.
- Histórico local apenas na sessão atual (não persiste).
- Não há métricas de qualidade nem logs estruturados além do console da edge function.

### Próximos passos sugeridos
1. **Cobertura de comandos**:
   - Atualizar pet, criar lembrete, cancelar tratamento, registrar peso.
   - Permitir consultas (“Liste os pets com vacinas atrasadas”).
2. **Persistência de conversas**:
   - Registrar prompts/respostas em tabela `chatbot_logs` para auditoria e melhoria do prompt.
3. **Contexto e confirmações**:
   - Quando múltiplos pets atendem aos critérios, solicitar confirmação (“Você quis dizer Bolt ou Boltinho?”).
4. **Fallbacks e mensagens amigáveis**:
   - Templates específicos para erros de RLS, rede ou ausência de dados.
5. **Segurança**:
   - Rotacionar segredo (`NEXT_PUBLIC_PETCUIDA_CHATBOT_SECRET`) periodicamente.
   - Limitar números de ações por minuto para evitar abusos.

### Plano de testes do assistente
1. **Cenários automatizados (integration tests)**:
   - Mock da edge function com Supabase em banco de teste.
   - Garantir que cada ação (`create_pet`, etc.) retorna payload esperado.
   - Testar falhas (chave inválida, token expirado, intenção desconhecida).
2. **Testes manuais guiados**:
   - Plano de QA com casos: cadastro simples, tratamentos múltiplos, conflitos de nomes, logs de aplicação.
   - Verificar mensagens em português claro e logs sem dados sensíveis.
3. **Monitoramento em produção**:
   - Armazenar métricas (tempo de resposta, taxa de erro).
   - Painel interno com consulta aos `chatbot_logs` para avaliação contínua.

### Roadmap rápido
1. **Sprint imediato**: adicionar comandos CRUD restantes + mapa de traduções; criar testes integrados utilizando `supabase-js` com banco de staging.
2. **Sprint seguinte**: persistir histórico, implementar confirmações de ambiguidade, iniciar dicionário de sinônimos no prompt.
3. **Fase avançada**: habilitar orquestração multi-step, recomendação proativa (ex.: “Este pet está sem peso há 3 meses. Deseja atualizar?”).

---

## 5. Resumo executivo
- Produto já oferece fluxo robusto de cadastro e manutenção de cuidados tanto na web quanto no mobile, com backend centralizado em Supabase.
- Para escalar a operação de usuários com muitos animais, priorizar filtros avançados, ações em massa, automações e consistência de labels.
- Chatbot é funcional, porém restrito; ampliar escopos, registrar histórico e criar suíte de testes elevará confiabilidade antes de liberar amplamente.


