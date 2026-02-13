# Roadmap — Sala de Reunião v2.0 (PRD + Relatório de Análise)

Referências: `PRD_SalaReuniao.md`, `Relatorio_Analise_e_Melhoria_SalaReuniao_v2.md`.

---

## Fase 1: Inteligência e Arquitetura (em andamento)

### Implementado

| Item | Descrição |
|------|------------|
| **Personalidade ativa (PRD 4.3.1)** | `personality_traits` e `behavior_settings` são lidos do banco, injetados no prompt do LLM em cada turno (`server/services/llm.ts` + `orchestrator.ts`). |
| **Segurança RS-001** | Credenciais de admin removidas da tela de login. |
| **WebSocket / Socket.IO (PRD 4.4.1)** | Servidor Socket.IO em `server/index.ts` e `server/socket.ts`. Salas por `meeting_id`. Emissão de `transcript` ao salvar fala (orquestrador e POST /transcripts) e de `meeting_status` ao encerrar reunião (POST /end). Frontend em `src/lib/supabase/realtime.ts` com `socket.io-client`. |

### Pendente Fase 1

- **Moderador (PRD 4.1.1)** — Agente que inicia/encerra e escolhe o próximo orador (não round-robin).
- **LangGraph (PRD 4.1.2)** — Orquestração modelada como grafo de estados.
- **Memória hierárquica + RAG (PRD 4.2)** — Camadas STM/episódica/semântica, embeddings, busca vetorial, re-ranking.
- **Streaming token a token** — LLM em modo stream + evento `agent_typing` via Socket.IO.
- **Eventos de estado** — `agent_thinking_started`, `agent_speech_started`, `agent_speech_finished`.

---

## Fase 2: Experiência do usuário (planejado)

- **Onboarding** — Tour guiado (Intro.js ou similar), primeira reunião demonstrativa.
- **Sala “viva”** — Indicadores de atividade nos avatares (pensando/falando), transcrição enriquecida (decisões, ações), painel de insights em tempo real (Relator).
- **TTS de alta qualidade** — Integração ElevenLabs ou OpenAI TTS (substituir `speechSynthesis`).
- **Gamificação** — XP, níveis, conquistas; like/dislike em falas; tabela `transcript_feedback` e uso em memória (RLHF).

---

## Fase 3: Robustez e expansão (planejado)

- **Segurança** — RS-002 a RS-007: JWT/segredos, CORS restritivo, rate limiting (já parcial), validação de entrada, auth do Socket, moderação de conteúdo.
- **Assistente de criação de agentes** — Chatbot guiado, geração de `system_prompt`, validação de segurança do prompt.
- **Limpeza** — Remoção de código morto e do módulo CRM (contacts/deals) se fora do escopo; implementar perfis/workspace onde faltar.
- **Relatórios pós-reunião** — Geração assíncrona (BullMQ), Markdown com resumo, decisões, itens de ação; tabela `meeting_reports`.

---

## Como testar o que foi feito

1. **Personalidade**  
   Edite um agente em Admin > Agentes: altere `personality_traits` (ex.: `humor: 10` vs `humor: 0`) e rode uma reunião; as falas devem refletir o estilo.

2. **Socket.IO / tempo real**  
   Abra uma reunião em andamento em duas abas. Em uma, execute um turno; na outra, a nova fala deve aparecer sem dar F5 (sem polling).

3. **Login**  
   A tela de login não deve mais exibir credenciais de administrador em nenhum ambiente.
