@AGENTS.md

# Contexto do Projeto: Family Office CRM

## Visão Geral

Este é um fork do Atomic CRM customizado para escritórios de investimentos do tipo **Family Office**. O objetivo é gerenciar o relacionamento com clientes (pessoas físicas e jurídicas), seus ativos e negócios, com isolamento completo de dados por escritório.

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
