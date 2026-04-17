-- Revoga grants do role `anon` em tabelas de domínio.
--
-- Motivo: as RLS policies existentes são definidas `to authenticated`, então na prática
-- um cliente anônimo não consegue atravessar as policies. Mas um `grant all to anon`
-- mantém a superfície: se uma policy futura esquecer a cláusula de role, o anon passa.
-- Remover o grant fecha esse vetor defensivamente.
--
-- Mantemos anon apenas em `public.init_state` (consultada pré-login pela tela de boas-vindas).

-- Tabelas de domínio
revoke all on table public.companies from anon;
revoke all on table public.contacts from anon;
revoke all on table public.deals from anon;
revoke all on table public.sales from anon;
revoke all on table public.tags from anon;
revoke all on table public.tasks from anon;
revoke all on table public.configuration from anon;
revoke all on table public.favicons_excluded_domains from anon;

-- Views derivadas de tabelas de domínio
revoke all on table public.activity_log from anon;
revoke all on table public.companies_summary from anon;
revoke all on table public.contacts_summary from anon;

-- Sequences associadas
revoke all on sequence public.companies_id_seq from anon;
revoke all on sequence public.contacts_id_seq from anon;
revoke all on sequence public.deals_id_seq from anon;
revoke all on sequence public.favicons_excluded_domains_id_seq from anon;
revoke all on sequence public.sales_id_seq from anon;
revoke all on sequence public.tags_id_seq from anon;
revoke all on sequence public.tasks_id_seq from anon;

-- Default privileges futuros (para objetos criados dali em diante)
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
