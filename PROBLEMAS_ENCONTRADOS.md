# Relatório de Problemas - Revisão Frontend

## Resumo por Critério

### 1. useAuthStore / workspace

### 2. Estado de loading, vazio e erro

### 3. Imports corretos

### 4. Código morto, TODO, funcionalidades incompletas

### 5. Textos em português (typos, inglês misturado)

### 6. Botões de ação (funcionam ou são apenas visuais)

---

## PROBLEMAS DETALHADOS

### src/App.tsx
| Linha | Descrição |
|-------|-----------|
| 57 | `useEffect` com dependência `[]` chama `setTheme(theme)` - efeito vazio/redundante |
| 131 | Rota `/admin` usa `AnalyticsPage` em vez de página específica de Admin Dashboard |
| 134 | Rota `/admin/audit` usa `AnalyticsPage` - deveria ter página própria |
| 135 | Rota `/admin/billing` usa `DealsPage` - deveria ter página de billing |

### src/components/shared/Sidebar.tsx
| Linha | Descrição |
|-------|-----------|
| 44 | Usa `useAuthStore` para `membership` - OK. Não usa `workspace` |
| 23 | Label "Dashboard" e "Analytics" estão em inglês - deveria ser "Painel" e "Análises" para consistência |

### src/components/shared/Header.tsx
| Linha | Descrição |
|-------|-----------|
| 40 | Campo de busca não tem funcionalidade - placeholder "Ctrl+K" mas não há handler |
| 64 | Botão "Notificações" é apenas visual - não abre dropdown/modal |
| 88 | `navigate(ROUTES.SETTINGS_PROFILE)` - rota existe em config mas SettingsPage não lê URL para ativar tab; funciona pois tab 'profile' é default |

### src/config/routes.ts
| Linha | Descrição |
|-------|-----------|
| - | Sem problemas encontrados |

### src/config/constants.ts
| Linha | Descrição |
|-------|-----------|
| - | Sem problemas encontrados |

### src/stores/useAuthStore.ts
| Linha | Descrição |
|-------|-----------|
| - | Sem problemas encontrados |

### src/app/routes/admin/integrations.tsx
| Linha | Descrição |
|-------|-----------|
| 17 | Usa `workspace` de useAuthStore - OK |
| 66-73 | Estado de loading - OK |
| - | **Falta estado de erro** ao falhar fetch; apenas faz `setIntegrations([])` em catch |
| - | **Falta estado vazio** explícito quando `integrations.length === 0` após load |

### src/app/routes/admin/users.tsx
| Linha | Descrição |
|-------|-----------|
| 16 | Usa `workspace` de useAuthStore - OK |
| 51 | Botão "Exportar" - apenas visual, sem handler |
| 52 | Botão "Convidar Usuário" - apenas visual, sem handler |
| 72 | Checkbox da tabela - sem funcionalidade |
| 115 | Botão `MoreVertical` - sem menu dropdown/actions |
| - | **Falta estado de erro** ao falhar fetch |

### src/app/routes/agents/create.tsx
| Linha | Descrição |
|-------|-----------|
| - | **Não usa useAuthStore** - deveria usar `workspace` para criar agente no workspace correto |
| 43 | Botão "Testar" - apenas visual |
| 44 | Botão "Publicar" - apenas visual, não salva/cria agente |
| - | **Sem estado de loading** ao criar |
| - | **Sem estado de erro** |
| - | Upload de Base de Conhecimento - área de drag não implementada |
| - | Botão "Fazer Upload" (avatar) - sem handler |
| - | Botão "Testar Voz" - sem handler |

### src/app/routes/agents/edit.tsx
| Linha | Descrição |
|-------|-----------|
| 21 | Usa `workspace` de useAuthStore - OK |
| 89 | Subtítulo usa "Agent Studio" em inglês - deveria ser "Editar Agente" ou similar |
| 94 | Botão "Testar" - apenas visual |
| - | Estado de loading, vazio e erro - OK (loading e toast de erro) |

### src/app/routes/agents/index.tsx
| Linha | Descrição |
|-------|-----------|
| 22 | Usa `workspace` de useAuthStore - OK |
| 37-39 | `filtered` reaplica filtro em cima de `agents` que já vem filtrado da API por `search` - redundante |
| 67 | Botão "Filtros" - apenas visual |
| 105 | Botão MoreVertical - sem menu |
| 186 | Botão "Duplicar" - sem handler/action |
| 187 | Botão "Excluir" - sem handler/action |
| 50 | Botão "Novo Agente" - funciona (navigate) |

### src/app/routes/auth/ForgotPasswordPage.tsx
| Linha | Descrição |
|-------|-----------|
| - | Não usa workspace (não precisa) |
| - | Loading, erro - OK |

### src/app/routes/auth/LoginPage.tsx
| Linha | Descrição |
|-------|-----------|
| 11 | `loginSchema` (zod) definido mas nunca usado para validação - código morto |
| 21 | Usa useAuthStore - OK |
| 100 | Texto "Admin: admin@salareuniao.local / password" em produção - credenciais hardcoded |

### src/app/routes/auth/RegisterPage.tsx
| Linha | Descrição |
|-------|-----------|
| 57 | `success` nunca é setado como true - fluxo de verificação de email nunca é mostrado |
| 41 | On success faz navigate direto para DASHBOARD - `if (success)` é código morto |
| 183 | Links "termos de serviço" e "política de privacidade" apontam para "#" |

### src/app/routes/contacts/index.tsx
| Linha | Descrição |
|-------|-----------|
| 14 | Usa `workspace` de useAuthStore - OK |
| 42 | Botão "Novo Contato" - apenas visual, sem handler/modal |
| - | Loading, vazio - OK |
| - | **Falta estado de erro** ao falhar fetch |

### src/app/routes/dashboard/analytics.tsx
| Linha | Descrição |
|-------|-----------|
| 9 | Usa `workspace` de useAuthStore - OK |
| 42 | Título "Analytics" em inglês - deveria ser "Análises" ou "Painel Analítico" |
| 33 | "Agentes Ativos" e "Agentes (total)" mostram o mesmo valor (agents.length) - redundante |
| 124 | Mensagem "Dados de tópicos em breve" - funcionalidade incompleta |
| 144 | `(a.average_rating ?? 0) * 20` - rating provavelmente 0-5, multiplicar por 20 não faz sentido para % |
| - | **Falta estado de erro** ao falhar fetch |
| - | Gráfico "Sessões por Semana" usa dados mock (height fixo 10%) |

### src/app/routes/dashboard/index.tsx
| Linha | Descrição |
|-------|-----------|
| 16 | Usa `user` e `workspace` - OK |
| 83 | Botão "Novo Agente" - funciona |
| 85 | Botão "Nova Sessão" - funciona |
| - | Loading, vazio - OK |
| - | **Falta estado de erro** ao falhar fetch |

### src/app/routes/deals/index.tsx
| Linha | Descrição |
|-------|-----------|
| 11 | Usa `workspace` de useAuthStore - OK |
| 46 | Botão "Novo Negócio" - apenas visual |
| 99 | Status do deal mostrado como string bruta (ex: "prospecting") - deveria usar DEAL_STATUS para label |
| - | Loading, vazio - OK |
| - | **Falta estado de erro** ao falhar fetch |

### src/app/routes/meetings/create.tsx
| Linha | Descrição |
|-------|-----------|
| 34 | Usa `workspace` de useAuthStore - OK |
| 22 | `availableAgents` é hardcoded - não busca agentes reais do workspace |
| 254 | `agent_ids: []` - comentário indica "vincular quando houver agentes na API" - funcionalidade incompleta |
| - | Loading - OK no botão Iniciar |
| - | Estado de erro - toast |

### src/app/routes/meetings/index.tsx
| Linha | Descrição |
|-------|-----------|
| 32 | Usa `workspace` de useAuthStore - OK |
| 66 | Botão "Nova Sessão" - funciona |
| 165 | Botão MoreVertical - sem menu de ações |
| - | Loading, vazio - OK |
| - | **Falta estado de erro** ao falhar fetch |

### src/app/routes/meetings/room.tsx
| Linha | Descrição |
|-------|-----------|
| - | **Não usa useAuthStore** - página de reunião pode não precisar de workspace para exibir |
| 106 | Badge: `meeting.status` exibido em raw quando não é 'in_progress' - deveria usar label traduzido |
| 174 | `sentimentColors.neutral` sempre usado - sentimentColors não é dinâmico por transcrição |
| - | Imports não usados: Hand, SkipForward, FileText, Settings, Maximize (Minimize é usado) |

### src/app/routes/sessions/archive.tsx
| Linha | Descrição |
|-------|-----------|
| 21 | Usa `workspace` de useAuthStore - OK |
| 56 | Botão "Exportar" - apenas visual |
| 88 | Botão "Replay" - apenas visual |
| 89 | Botão "Relatório" - apenas visual |
| 53 | Placeholder "Buscar nas transcrições" - busca só filtra por título, não nas transcrições |
| - | Loading, vazio - OK |
| - | **Falta estado de erro** ao falhar fetch |

### src/app/routes/settings/index.tsx
| Linha | Descrição |
|-------|-----------|
| 18 | Usa `user` e `theme` de useAuthStore - OK. Não usa `workspace` (profile é por usuário) |
| 7 | Import `Globe` não utilizado |
| 50 | Botão "Alterar Foto" - apenas visual |
| 68 | Botão "Salvar Alterações" (perfil) - sem handler, não persiste |
| 127 | Toggles de notificação usam `defaultChecked` - não controlados, não persistem |
| 151 | Botão "Atualizar Senha" - sem handler |
| 158 | Botão "Ativar 2FA" - sem handler |
| 171 | Botão "Gerar Nova Chave" - sem handler |
| - | Tab "API" - sem integração com backend |

### src/app/layouts/MainLayout.tsx
| Linha | Descrição |
|-------|-----------|
| 9 | `ml-72` fixo - quando Sidebar está colapsada (72px), o main continua com margin 288px, gerando gap |
