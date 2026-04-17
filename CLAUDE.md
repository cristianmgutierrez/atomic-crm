@AGENTS.md

# Contexto do Projeto: Family Office CRM

## Visão Geral

Este é um fork do Atomic CRM customizado para escritórios de investimentos do tipo **Family Office**. O objetivo é gerenciar o relacionamento com clientes (pessoas físicas e jurídicas), seus ativos e negócios, com isolamento completo de dados por escritório.

## Princípios de Engenharia

Estes princípios são obrigatórios em qualquer mudança neste projeto. Quando houver conflito entre conveniência e princípio, o princípio vence.

### Fonte única de verdade
- Cada dado de domínio tem UM lugar canônico. Exemplo: status do contato vive em `contacts.status` e só pode ser alterado pelo cadastro de contato — não por efeito colateral de outras telas.
- Cópias de dados só são aceitáveis como denormalizações explícitas em views (read-only) ou em registros imutáveis (logs/auditoria) — nunca como campos editáveis paralelos.
- Mudanças em entidades devem passar pela tela/API canônica daquela entidade.

### DRY entre camadas
- Regras de negócio (ex: atualizar `last_seen` em interações com o cliente) vivem em UMA camada. Para invariantes de dados, preferir triggers/functions no Postgres; código frontend deve apenas orquestrar a UI.
- Se a mesma lógica aparece em frontend e backend, consolidar no backend.

### Activity log unificado
- Toda interação relevante (criação de entidades, conclusão de tarefas) deve aparecer na view `activity_log`.
- Adicionar nova entidade interativa = UNION ALL na view `activity_log` ([supabase/schemas/03_views.sql](supabase/schemas/03_views.sql)) + handler em [ActivityLogIterator.tsx](src/components/atomic-crm/activity/ActivityLogIterator.tsx) + constante em [src/components/atomic-crm/consts.ts](src/components/atomic-crm/consts.ts).

### Validação no boundary
- Validar entrada no formulário canônico da entidade. Não confiar em "ninguém vai alterar isso por outro caminho" — projetar para que não haja outro caminho.
- Se uma regra precisa valer para todos os caminhos de mutação, expressar como constraint do banco ou trigger, não como verificação no frontend.

## Arquitetura Multi-Escritório (Multi-Tenant)

### Modelo de dados
- Tabela `escritorios` (id, nome) — cadastro no menu Configurações
- Tabela `sales` tem `escritorio_id` (FK → escritorios) e `papel` (enum: 'gestor' | 'assessor')
- Entidades principais (contacts, companies, deals, tasks, tags, pipelines) têm `escritorio_id`, preenchido automaticamente via trigger `set_escritorio_id_default` a partir do usuário autenticado ([04_triggers.sql](supabase/schemas/04_triggers.sql))

### Papéis de usuário
| Papel | Acesso |
|-------|--------|
| admin (`sales.administrator = true`) | Acesso total (bypass de RLS via `is_admin()`); gestão de usuários e escritórios |
| `gestor` | Vê e edita todos os registros do próprio escritório |
| `assessor` | Vê e edita apenas os próprios registros (onde `sales_id = seu id`) |

### RLS (Row Level Security)
Policies canônicas em [05_policies.sql](supabase/schemas/05_policies.sql), baseadas nos helpers SQL de [02_functions.sql](supabase/schemas/02_functions.sql): `is_admin()`, `get_my_papel()`, `get_my_escritorio_id()`, `get_my_sales_id()`.
- **Admin**: bypassa via `is_admin()` — acesso total
- **Gestor**: `escritorio_id = get_my_escritorio_id()` — tudo do próprio escritório
- **Assessor**: `sales_id = get_my_sales_id()` — apenas os próprios registros
- Inserts exigem `escritorio_id = get_my_escritorio_id()` (trigger preenche automaticamente)
- Views (`activity_log`, `contacts_summary`, `companies_summary`) usam `security_invoker = on` para herdar as policies das tabelas subjacentes

## Contexto de Negócio (Family Office)

- **Clientes**: Pessoas físicas de alto patrimônio e suas holdings/empresas
- **Deals**: Operações e negócios estruturados com clientes
- **Moeda**: BRL (Real brasileiro)
- **Idioma**: Português do Brasil

## Roadmap de Customizações

1. **[Concluído]** Atualizar CLAUDE.md com contexto do projeto
2. **[Concluído]** Criar tabela `escritorios` e adicionar `escritorio_id` + `papel` em `sales`
3. **[Concluído]** Implementar RLS multi-tenant em todas as tabelas
4. **[Concluído]** Atualizar edge function `users` para capturar `escritorio_id` e `papel`
5. **[Concluído]** Criar UI de gestão de escritórios em Configurações
6. **[Concluído]** Atualizar UI de usuários com campos de escritório e papel
7. **[Em curso]** Adaptar configurações (deal stages, categorias, setores) para contexto de Family Office
8. **[Pendente]** Isolar attachments no storage por escritório (bucket privado + prefixo de path + signed URLs)
9. **[Pendente]** Endurecer grants: revogar `anon` das tabelas de domínio
10. **[Pendente]** Suíte pgTAP validando isolamento RLS por papel/escritório
