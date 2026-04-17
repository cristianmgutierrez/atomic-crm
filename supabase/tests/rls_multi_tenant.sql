-- Teste de isolamento multi-tenant das policies RLS.
--
-- Valida que, para cada papel (admin, gestor, assessor), SELECT/INSERT/UPDATE/DELETE
-- só enxergam/afetam os registros permitidos pelas policies em 05_policies.sql.
--
-- Roda via: npx supabase test db  (ou `make test-db` se o alvo existir).
-- Requer: pgTAP instalado no banco (`create extension pgtap;`).
--
-- Tudo em uma transação que faz rollback no final — não deixa resíduo.

begin;

create extension if not exists pgtap;

select plan(24);

-- ============================================================
-- Setup: 2 escritórios × (1 gestor + 2 assessores) + 1 admin
-- ============================================================

-- IDs determinísticos para simplificar os asserts
-- Esc A = 9001, Esc B = 9002. Emails com prefixo para cleanup fácil em caso de crash.
insert into public.escritorios (id, name) values (9001, 'RLS Test A'), (9002, 'RLS Test B');

-- Criar 6 users em auth.users. O trigger handle_new_user cria sales automaticamente
-- a partir de raw_user_meta_data.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000009001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@test.local',        '', now(), jsonb_build_object('escritorio_id', 9001, 'papel', 'gestor', 'first_name', 'Admin',    'last_name', 'Test')),
  ('00000000-0000-0000-0000-000000009002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-gestor-a@test.local',     '', now(), jsonb_build_object('escritorio_id', 9001, 'papel', 'gestor', 'first_name', 'GestorA',  'last_name', 'Test')),
  ('00000000-0000-0000-0000-000000009003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-assessor-a1@test.local',  '', now(), jsonb_build_object('escritorio_id', 9001, 'papel', 'assessor', 'first_name', 'AssA1', 'last_name', 'Test')),
  ('00000000-0000-0000-0000-000000009004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-assessor-a2@test.local',  '', now(), jsonb_build_object('escritorio_id', 9001, 'papel', 'assessor', 'first_name', 'AssA2', 'last_name', 'Test')),
  ('00000000-0000-0000-0000-000000009005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-gestor-b@test.local',     '', now(), jsonb_build_object('escritorio_id', 9002, 'papel', 'gestor', 'first_name', 'GestorB',  'last_name', 'Test')),
  ('00000000-0000-0000-0000-000000009006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-assessor-b@test.local',   '', now(), jsonb_build_object('escritorio_id', 9002, 'papel', 'assessor', 'first_name', 'AssB',  'last_name', 'Test'));

-- Promover o primeiro user a admin (o trigger pode ter marcado como false se já havia sales).
update public.sales set administrator = true where user_id = '00000000-0000-0000-0000-000000009001';
update public.sales set administrator = false where user_id in (
  '00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003',
  '00000000-0000-0000-0000-000000009004','00000000-0000-0000-0000-000000009005',
  '00000000-0000-0000-0000-000000009006'
);

-- Helpers para pegar o sales.id de cada persona
create temp table rls_test_sales as
select
  user_id,
  id as sales_id
from public.sales
where user_id in (
  '00000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009002',
  '00000000-0000-0000-0000-000000009003','00000000-0000-0000-0000-000000009004',
  '00000000-0000-0000-0000-000000009005','00000000-0000-0000-0000-000000009006'
);

-- Seed: 1 contact/company/deal/task por persona-dono (5 donos: gestor A/B + 3 assessores)
-- Como rodamos como superuser, as policies não aplicam no seed — mas o trigger
-- set_escritorio_id_default usa auth.uid() que está null aqui, então precisamos passar
-- escritorio_id explicitamente.

-- Helper function para setar JWT claim em testes
create or replace function __rls_test_set_user(user_uuid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', user_uuid::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_uuid::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function __rls_test_reset() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- Criar 1 company para cada persona-dono. Cada persona como "owner" (sales_id).
-- Faço isso como superuser passando escritorio_id e sales_id explicitamente.
with donos as (
  select
    (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009002') as gestor_a,
    (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009003') as assessor_a1,
    (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009004') as assessor_a2,
    (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009005') as gestor_b,
    (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009006') as assessor_b
)
insert into public.companies (name, sales_id, escritorio_id)
select 'RLS co gestor_a',   gestor_a,    9001 from donos union all
select 'RLS co assessor_a1',assessor_a1, 9001 from donos union all
select 'RLS co assessor_a2',assessor_a2, 9001 from donos union all
select 'RLS co gestor_b',   gestor_b,    9002 from donos union all
select 'RLS co assessor_b', assessor_b,  9002 from donos;

insert into public.contacts (first_name, last_name, sales_id, escritorio_id, company_id)
select 'RLS', 'gestor_a',     (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009002'), 9001, (select id from public.companies where name = 'RLS co gestor_a')    union all
select 'RLS', 'assessor_a1',  (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009003'), 9001, (select id from public.companies where name = 'RLS co assessor_a1') union all
select 'RLS', 'assessor_a2',  (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009004'), 9001, (select id from public.companies where name = 'RLS co assessor_a2') union all
select 'RLS', 'gestor_b',     (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009005'), 9002, (select id from public.companies where name = 'RLS co gestor_b')    union all
select 'RLS', 'assessor_b',   (select sales_id from rls_test_sales where user_id = '00000000-0000-0000-0000-000000009006'), 9002, (select id from public.companies where name = 'RLS co assessor_b');

insert into public.tasks (contact_id, type, text, due_date, sales_id, escritorio_id)
select c.id, 'call', 'RLS ' || c.last_name, current_date, c.sales_id, c.escritorio_id
from public.contacts c
where c.first_name = 'RLS';

-- ============================================================
-- Testes
-- ============================================================

-- Filter base: só entidades criadas por este teste (prefixo "RLS")
-- Nota: tem outros contacts/etc no DB local, por isso filtros defensivos

-- ------ admin ------
select __rls_test_set_user('00000000-0000-0000-0000-000000009001');

select is(
  (select count(*)::int from public.contacts where first_name = 'RLS'),
  5,
  'admin vê todos os 5 contacts RLS'
);
select is(
  (select count(*)::int from public.companies where name like 'RLS co %'),
  5,
  'admin vê todas as 5 companies RLS'
);
select is(
  (select count(*)::int from public.tasks where text like 'RLS %'),
  5,
  'admin vê todas as 5 tasks RLS'
);

-- ------ gestor A (escritório 9001) ------
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009002');

select is(
  (select count(*)::int from public.contacts where first_name = 'RLS'),
  3,
  'gestor A vê os 3 contacts RLS do próprio escritório'
);
select is(
  (select count(*)::int from public.contacts where first_name = 'RLS' and escritorio_id = 9002),
  0,
  'gestor A NÃO vê contacts do escritório B'
);
select is(
  (select count(*)::int from public.companies where name like 'RLS co %'),
  3,
  'gestor A vê 3 companies do próprio escritório'
);
select is(
  (select count(*)::int from public.tasks where text like 'RLS %'),
  3,
  'gestor A vê 3 tasks do próprio escritório'
);

-- ------ gestor B (escritório 9002) ------
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009005');

select is(
  (select count(*)::int from public.contacts where first_name = 'RLS'),
  2,
  'gestor B vê 2 contacts do próprio escritório'
);
select is(
  (select count(*)::int from public.contacts where first_name = 'RLS' and escritorio_id = 9001),
  0,
  'gestor B NÃO vê contacts do escritório A'
);

-- ------ assessor A1 ------
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009003');

select is(
  (select count(*)::int from public.contacts where first_name = 'RLS'),
  1,
  'assessor A1 vê apenas o próprio contact'
);
select is(
  (select last_name from public.contacts where first_name = 'RLS' limit 1),
  'assessor_a1',
  'assessor A1 vê especificamente o próprio contact (não do colega A2)'
);
select is(
  (select count(*)::int from public.companies where name like 'RLS co %'),
  1,
  'assessor A1 vê apenas a própria company'
);
select is(
  (select count(*)::int from public.tasks where text like 'RLS %'),
  1,
  'assessor A1 vê apenas a própria task'
);

-- ------ assessor A2 (mesmo escritório que A1, mas não vê dados de A1) ------
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009004');

select is(
  (select last_name from public.contacts where first_name = 'RLS' limit 1),
  'assessor_a2',
  'assessor A2 vê o próprio, não o de A1 (isolamento entre colegas)'
);

-- ------ assessor B ------
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009006');

select is(
  (select count(*)::int from public.contacts where first_name = 'RLS'),
  1,
  'assessor B vê apenas o próprio contact'
);

-- ------ Insert checks ------
-- assessor A1: tentar inserir contact com escritorio_id de B deve falhar
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009003');

select throws_ok(
  $$insert into public.contacts (first_name, last_name, sales_id, escritorio_id)
    values ('RLS_evil', 'cross_tenant', 1, 9002)$$,
  NULL,
  NULL,
  'assessor A1 NÃO pode inserir contact com escritorio_id de B'
);

-- gestor A: insert com escritorio_id próprio funciona (trigger default também preenche)
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009002');

select lives_ok(
  $$insert into public.contacts (first_name, last_name, sales_id, escritorio_id)
    values ('RLS_ins', 'gestor_a_insert',
            (select id from public.sales where user_id = '00000000-0000-0000-0000-000000009002'),
            9001)$$,
  'gestor A pode inserir contact com escritorio_id próprio'
);

-- gestor A: insert com escritorio_id de B falha
select throws_ok(
  $$insert into public.contacts (first_name, last_name, sales_id, escritorio_id)
    values ('RLS_evil', 'gestor_a_cross', 1, 9002)$$,
  NULL,
  NULL,
  'gestor A NÃO pode inserir contact com escritorio_id de B'
);

-- ------ Update / Delete checks ------
-- Postgres não permite CTEs com data-modifying dentro de subqueries.
-- Solução: UPDATE/DELETE com `returning` vira um INSERT em temp table (top-level) e
-- depois fazemos a asserção sobre o count.
create temp table __rls_affected (test_name text, cnt int);
grant insert, select on table __rls_affected to authenticated;

select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009003');

-- assessor A1 tenta atualizar contact do colega A2: policies apenas filtram — não levanta erro
with u as (
  update public.contacts set last_name = 'HACKED'
  where first_name = 'RLS' and last_name = 'assessor_a2'
  returning id
)
insert into __rls_affected select 'a1_update_a2', count(*)::int from u;

select is(
  (select cnt from __rls_affected where test_name = 'a1_update_a2'),
  0,
  'assessor A1 não consegue atualizar contact do colega A2 (0 linhas afetadas)'
);

-- gestor B tenta atualizar contact de A
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009005');

with u as (
  update public.contacts set last_name = 'HACKED'
  where first_name = 'RLS' and escritorio_id = 9001
  returning id
)
insert into __rls_affected select 'gestor_b_update_a', count(*)::int from u;

select is(
  (select cnt from __rls_affected where test_name = 'gestor_b_update_a'),
  0,
  'gestor B não consegue atualizar contacts do escritório A'
);

-- assessor A1 tenta deletar contact do colega A2
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009003');

with d as (
  delete from public.contacts
  where first_name = 'RLS' and last_name = 'assessor_a2'
  returning id
)
insert into __rls_affected select 'a1_delete_a2', count(*)::int from d;

select is(
  (select cnt from __rls_affected where test_name = 'a1_delete_a2'),
  0,
  'assessor A1 não consegue deletar contact do colega A2'
);

-- ------ get_my_* helpers ------
select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009002');
select is(public.get_my_escritorio_id(), 9001::bigint, 'get_my_escritorio_id retorna 9001 para gestor A');
select is(public.get_my_papel(), 'gestor', 'get_my_papel retorna gestor para gestor A');

select __rls_test_reset();
select __rls_test_set_user('00000000-0000-0000-0000-000000009003');
select is(public.get_my_papel(), 'assessor', 'get_my_papel retorna assessor para assessor A1');

-- ============================================================
select __rls_test_reset();
select * from finish();
rollback;
