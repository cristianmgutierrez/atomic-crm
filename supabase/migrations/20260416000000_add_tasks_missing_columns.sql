-- Backfill de colunas que existem no schema declarativo (supabase/schemas/01_tables.sql)
-- mas não foram adicionadas em nenhuma migration anterior. Sem este backfill, a migration
-- 20260417130000_migrate_notes_to_tasks.sql falha ao inserir em tasks.attachments e ao
-- recriar a view activity_log que lê tasks.created_at.
--
-- Usamos `add column if not exists` para ser idempotente — em ambientes onde as colunas
-- já foram aplicadas manualmente (ex: schema inicial recriado a partir do declarativo),
-- esta migration é um NO-OP.

alter table public.tasks add column if not exists attachments jsonb[];
alter table public.tasks add column if not exists created_at timestamp with time zone not null default now();
