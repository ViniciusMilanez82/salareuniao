# Contratos de API — Sala de Reunião v2

REST (JSON), Postgres no backend. Reaproveitável para qualquer implementação.

---

## 1) Padrões gerais

### 1.1 Autenticação e contexto

- **Auth:** `Authorization: Bearer <token>`
- **Workspace:** `X-Workspace-Id: <workspace_id>` (ou query/body quando aplicável)
- **Permissões:** via `workspace_members.roles` (RBAC; ver seção 5)

### 1.2 Formato padrão de erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo title é obrigatório",
    "details": { "field": "title" },
    "request_id": "req_01H..."
  }
}
```

Códigos sugeridos: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

### 1.3 Paginação (cursor)

**Query:** `?limit=50&cursor=...`

**Response:**

```json
{
  "data": [...],
  "next_cursor": "cur_01H..."
}
```

---

## 2) Playbooks

### Listar playbooks

**GET** `/v1/playbooks?category=strategy&language=pt-BR&limit=50&cursor=...`

**Response:**

```json
{
  "data": [
    {
      "id": "plb_...",
      "title": "Planejamento de Projeto",
      "category": "project",
      "language": "pt-BR",
      "turn_policy_default": "round_robin"
    }
  ],
  "next_cursor": null
}
```

### Criar playbook

**POST** `/v1/playbooks`

**Body:**

```json
{
  "title": "Negociação com Compras",
  "description": "...",
  "category": "sales",
  "language": "pt-BR",
  "turn_policy_default": "facilitator_driven",
  "default_outputs": ["summary_exec", "followup_email", "action_items"]
}
```

### Steps do playbook

**POST** `/v1/playbooks/{playbook_id}/steps`

**Body:**

```json
{
  "step_order": 1,
  "step_type": "agenda_item",
  "content": { "text": "Alinhar objetivo e BATNA" }
}
```

### Templates de agentes (por playbook)

**POST** `/v1/playbooks/{playbook_id}/agent-templates`

**Body:**

```json
{
  "name": "Comprador Agressivo",
  "role": "Compras",
  "system_prompt": "...",
  "personality": { "assertividade": 9, "empatia": 3 },
  "model": { "provider": "openai", "model": "gpt-4o-mini", "temperature": 0.7 }
}
```

---

## 3) Meetings

### Criar meeting (com playbook)

**POST** `/v1/meetings`

**Body:**

```json
{
  "title": "Plano de execução obra X",
  "type": "project",
  "objective": "Definir cronograma e responsáveis",
  "context_text": "Cliente: ... restrições: ...",
  "playbook_id": "plb_...",
  "auto_create_agents_from_playbook": true
}
```

**Response:**

```json
{
  "id": "mtg_...",
  "status": "draft",
  "title": "Plano de execução obra X"
}
```

### Atualizar status

**PATCH** `/v1/meetings/{id}`

**Body:**

```json
{
  "status": "in_progress"
}
```

### Executar “Próximo turno (IA)”

**POST** `/v1/meetings/{id}/turns/next`

**Body:**

```json
{
  "mode": "standard",
  "allow_web": true,
  "agent_id": null
}
```

**Response:**

```json
{
  "transcript": {
    "id": "tr_...",
    "seq": 12,
    "speaker_type": "agent",
    "speaker_id": "agt_...",
    "content_text": "..."
  },
  "used_web": true,
  "evidence_count": 3,
  "live_state_updated": true
}
```

- `agent_id`: opcional; se omitido, orquestrador escolhe (round-robin/facilitador).

### Listar transcrições

**GET** `/v1/meetings/{id}/transcripts?after_seq=0&limit=200`

### Live summary

**GET** `/v1/meetings/{id}/live-state`

**Response:** objeto com `content_json` do `meeting_live_state` (topics, decisions, open_questions, emerging_tasks, risks).

---

## 4) Artifacts (briefing, resumos, follow-up)

### Gerar artifact

**POST** `/v1/meetings/{id}/artifacts`

**Body:**

```json
{
  "type": "briefing",
  "template_id": null,
  "options": {
    "use_web": true,
    "tone": "objetivo"
  }
}
```

**Response:**

```json
{
  "artifact_id": "art_...",
  "type": "briefing",
  "content_md": "# Objetivo...\n...",
  "content_json": {
    "objective": "...",
    "risks": [...]
  },
  "sources": [
    { "url": "...", "title": "..." }
  ]
}
```

### Listar artifacts

**GET** `/v1/meetings/{id}/artifacts`

### Editar artifact (revisão humana)

**PATCH** `/v1/artifacts/{artifact_id}`

**Body:**

```json
{
  "content_md": "...texto revisado..."
}
```

---

## 5) Output templates

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/v1/output-templates` | Listar (filtro por workspace) |
| POST | `/v1/output-templates` | Criar |
| PATCH | `/v1/output-templates/{id}` | Atualizar |
| DELETE | `/v1/output-templates/{id}` | Remover |

---

## 6) Tasks hub (Action items)

### Listar tarefas do workspace

**GET** `/v1/action-items?status=open&owner_type=user&owner_id=usr_...&meeting_id=mtg_...&limit=50&cursor=...`

### Criar tarefa vinculada à meeting

**POST** `/v1/meetings/{id}/action-items`

**Body:** campos do action_item (title, description, owner_type, owner_id, due_date, priority, tags, source_transcript_id, source_seq_range).

### Editar tarefa

**PATCH** `/v1/action-items/{id}`

### Bulk update (pós-reunião)

**POST** `/v1/action-items/bulk`

**Body:**

```json
{
  "updates": [
    {
      "id": "ai_1",
      "owner_type": "user",
      "owner_id": "usr_2",
      "due_date": "2026-02-20"
    },
    { "id": "ai_2", "status": "done" }
  ]
}
```

---

## 7) Decisions

### Extrair decisões (pós-meeting)

**POST** `/v1/meetings/{id}/decisions/extract`

**Body:**

```json
{
  "mode": "post_meeting"
}
```

### CRUD decisions

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/v1/meetings/{id}/decisions` | Listar |
| POST | `/v1/meetings/{id}/decisions` | Criar |
| PATCH | `/v1/decisions/{id}` | Atualizar |

---

## 8) Evidências (citações)

### Listar evidências de um transcript

**GET** `/v1/transcripts/{id}/evidence`

### Anexar evidência manual (opcional)

**POST** `/v1/transcripts/{id}/evidence`

**Body:**

```json
{
  "url": "...",
  "title": "...",
  "snippet": "..."
}
```

---

## 9) Fact-check

### Rodar verificador pós-meeting

**POST** `/v1/meetings/{id}/fact-check/run`

**Body:**

```json
{
  "mode": "post_meeting",
  "use_web": true
}
```

### Listar relatórios

**GET** `/v1/meetings/{id}/fact-check/reports`

---

## 10) Q&A sobre a reunião

### Perguntar

**POST** `/v1/meetings/{id}/qa/query`

**Body:**

```json
{
  "question": "O que ficou decidido sobre o prazo de entrega?",
  "options": { "include_sources": true }
}
```

**Response:**

```json
{
  "answer": "Ficou decidido que...",
  "citations": [
    {
      "transcript_id": "tr_...",
      "seq_range": { "start": 34, "end": 36 }
    },
    { "url": "...", "title": "..." }
  ]
}
```

---

## 11) Highlights

### Criar highlight

**POST** `/v1/meetings/{id}/highlights`

**Body:**

```json
{
  "title": "Decisão sobre cronograma",
  "tags": ["decisão", "cronograma"],
  "transcript_id": "tr_...",
  "seq_start": 34,
  "seq_end": 36,
  "share_scope": "workspace_only"
}
```

### Gerar link compartilhável (token)

**POST** `/v1/highlights/{id}/share`

**Body:**

```json
{
  "share_scope": "token_link",
  "expires_at": "2026-03-01T00:00:00Z"
}
```

**Response:** `{ "share_url": "...", "share_token": "...", "expires_at": "..." }`

### Visualizar por token (pública, controlada)

**GET** `/v1/public/highlights/{share_token}`

---

## 12) Webhooks

### Criar webhook

**POST** `/v1/webhooks`

**Body:**

```json
{
  "url": "https://seu-n8n-webhook/...",
  "events": [
    "meeting.completed",
    "artifact.generated",
    "action_item.updated"
  ],
  "enabled": true
}
```

### Testar webhook

**POST** `/v1/webhooks/{id}/test`

**Body:**

```json
{
  "event": "meeting.completed"
}
```

### Payload padrão de evento

```json
{
  "event": "meeting.completed",
  "workspace_id": "wsp_...",
  "occurred_at": "2026-02-12T12:34:56Z",
  "data": {
    "meeting_id": "mtg_...",
    "title": "...",
    "artifacts": ["art_1", "art_2"],
    "action_items_open": 5,
    "decisions": 2
  },
  "signature": "sha256=..."
}
```

- Assinatura: HMAC-SHA256 do body com o `secret` do webhook; header sugerido: `X-Webhook-Signature`.

---

## 13) Governança

### Políticas do workspace

**GET** `/v1/workspaces/{id}/policies`

**PATCH** `/v1/workspaces/{id}/policies`

**Body (exemplo):**

```json
{
  "retention_days": 90,
  "allow_web_research": true,
  "allow_agent_memory": true,
  "pii_redaction": false,
  "export_permission_level": "moderators"
}
```

### Audit logs

**GET** `/v1/audit-logs?entity_type=meeting&entity_id=mtg_...&limit=50&cursor=...`

---

## 14) Roleplay

### Cenários

**GET** `/v1/roleplay/scenarios`

**POST** `/v1/roleplay/scenarios`

### Iniciar meeting roleplay a partir de cenário

**POST** `/v1/roleplay/start`

**Body:**

```json
{
  "scenario_id": "scn_...",
  "title": "Ensaio: negociação desconto",
  "objective": "Reduzir desconto de 15% para 8%",
  "participants": { "human_user_id": "usr_..." }
}
```

**Response:** meeting criada (id, status, etc.).

### Gerar relatório do roleplay

**POST** `/v1/meetings/{id}/roleplay/report`

**Body:**

```json
{
  "rubric": "default",
  "include_better_responses": true
}
```

---

## 15) RBAC — Regras de permissão

| Role             | Permissões resumidas |
|------------------|----------------------|
| workspace_admin  | Tudo no workspace    |
| moderator        | Criar/rodar meetings; gerar artifacts; editar decisões/tarefas; exportar; criar highlights |
| agent_creator    | Criar/editar agentes, playbooks e templates |
| analyst          | Ver meetings e analytics, Q&A; não editar configurações sensíveis |
| integrator       | Gerir integrações e webhooks |
| observer         | Apenas leitura; sem exportar; sem share link público |

- Todas as rotas devem validar `X-Workspace-Id` (ou equivalente) e o role do usuário no workspace.
- Export e share link: respeitar `workspace_policies.export_permission_level` e role (observer não exporta).

---

## 16) Consistência de IA (JSON Schema)

Para artifacts, tasks, decisions, live-state, fact-check e roleplay report:

1. **Geração:** o LLM deve retornar JSON válido conforme `schema_json` do template (ou schema fixo do recurso).
2. **Validação no backend:**
   - Se inválido → rodar etapa de “repair” (mesmo modelo com prompt de correção).
   - Se ainda inválido → salvar como texto e marcar `artifact.status = "needs_review"` (ou equivalente).
3. **Telemetria:** registrar falhas de validação para monitorar qualidade do modelo e prompts.

Isso reduz saídas inconsistentes e bugs no front.

---

## 17) Jobs (opcional)

Para operações pesadas (pacote de outputs, fact-check, roleplay report):

- **POST** `/v1/jobs` — body: `{ "type": "artifact_generate", "input_json": { "meeting_id": "...", ... } }`  
  Response: `{ "id": "job_...", "status": "queued" }`
- **GET** `/v1/jobs/{id}` — response: `{ "id": "...", "status": "running"|"done"|"error", "output_json": {...}, "error_json": null }`

Polling ou webhook quando `status` for `done` ou `error`.
