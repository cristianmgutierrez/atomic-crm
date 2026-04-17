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
- Nova tabela `escritorios` (id, nome) — cadastro no menu Configurações
- Tabela `sales` recebe `escritorio_id` (FK → escritorios) e `papel` (enum: 'gestor' | 'assessor')
- Todas as entidades principais (contacts, companies, deals, tasks, notes) terão `escritorio_id`

### Papéis de usuário
| Papel | Acesso |
|-------|--------|
| `gestor` | Vê e edita todos os registros do próprio escritório |
| `assessor` | Vê e edita apenas os próprios registros (onde `sales_id = seu id`) |

### RLS (Row Level Security)
As policies do Supabase devem refletir esses papéis:
- **Gestor**: `escritorio_id = (SELECT escritorio_id FROM sales WHERE user_id = auth.uid())`
- **Assessor**: `sales_id = (SELECT id FROM sales WHERE user_id = auth.uid())`
- Atualmente o RLS é permissivo (all authenticated = full access) — isso deve ser substituído

## Contexto de Negócio (Family Office)

- **Clientes**: Pessoas físicas de alto patrimônio e suas holdings/empresas
- **Deals**: Operações e negócios estruturados com clientes
- **Moeda**: BRL (Real brasileiro)
- **Idioma**: Português do Brasil

## Roadmap de Customizações

1. **[Concluído]** Atualizar CLAUDE.md com contexto do projeto
2. **[Próximo]** Criar tabela `escritorios` e adicionar `escritorio_id` + `papel` em `sales`
3. Implementar RLS multi-tenant em todas as tabelas
4. Atualizar edge function `users` para capturar `escritorio_id` e `papel`
5. Criar UI de gestão de escritórios em Configurações
6. Atualizar UI de usuários com campos de escritório e papel
7. Adaptar configurações (deal stages, categorias, setores) para contexto de Family Office
