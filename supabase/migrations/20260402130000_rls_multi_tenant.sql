-- Migration: RLS Multi-Tenant — adicionar escritorio_id às tabelas principais e implementar policies
-- Item 3 do roadmap Family Office CRM

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar escritorio_id às tabelas principais
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.companies     add column if not exists escritorio_id bigint;
alter table public.contacts      add column if not exists escritorio_id bigint;
alter table public.contact_notes add column if not exists escritorio_id bigint;
alter table public.deals         add column if not exists escritorio_id bigint;
alter table public.deal_notes    add column if not exists escritorio_id bigint;
alter table public.tags          add column if not exists escritorio_id bigint;
alter table public.tasks         add column if not exists escritorio_id bigint;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Foreign keys para escritorios
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.companies
    add constraint companies_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

alter table public.contacts
    add constraint contacts_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

alter table public.contact_notes
    add constraint contact_notes_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

alter table public.deals
    add constraint deals_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

alter table public.deal_notes
    add constraint deal_notes_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

alter table public.tags
    add constraint tags_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

alter table public.tasks
    add constraint tasks_escritorio_id_fkey
    foreign key (escritorio_id) references public.escritorios(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Funções helper para RLS (SECURITY DEFINER para bypass do RLS em sales)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."get_my_sales_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT id FROM public.sales WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."get_my_escritorio_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT escritorio_id FROM public.sales WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION "public"."get_my_papel"() RETURNS text
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT papel FROM public.sales WHERE user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Função e triggers para auto-popular escritorio_id no insert
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."set_escritorio_id_default"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.escritorio_id IS NULL THEN
    SELECT escritorio_id INTO NEW.escritorio_id FROM sales WHERE user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

create or replace trigger set_company_escritorio_id_trigger
    before insert on public.companies
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_contact_escritorio_id_trigger
    before insert on public.contacts
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_contact_notes_escritorio_id_trigger
    before insert on public.contact_notes
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_deal_escritorio_id_trigger
    before insert on public.deals
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_deal_notes_escritorio_id_trigger
    before insert on public.deal_notes
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_task_escritorio_id_trigger
    before insert on public.tasks
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_tag_escritorio_id_trigger
    before insert on public.tags
    for each row execute function public.set_escritorio_id_default();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Remover policies permissivas antigas
-- ─────────────────────────────────────────────────────────────────────────────

-- Companies
drop policy if exists "Enable read access for authenticated users" on public.companies;
drop policy if exists "Enable insert for authenticated users only" on public.companies;
drop policy if exists "Enable update for authenticated users only" on public.companies;
drop policy if exists "Company Delete Policy" on public.companies;

-- Contacts
drop policy if exists "Enable read access for authenticated users" on public.contacts;
drop policy if exists "Enable insert for authenticated users only" on public.contacts;
drop policy if exists "Enable update for authenticated users only" on public.contacts;
drop policy if exists "Contact Delete Policy" on public.contacts;

-- Contact Notes
drop policy if exists "Enable read access for authenticated users" on public.contact_notes;
drop policy if exists "Enable insert for authenticated users only" on public.contact_notes;
drop policy if exists "Contact Notes Update policy" on public.contact_notes;
drop policy if exists "Contact Notes Delete Policy" on public.contact_notes;

-- Deals
drop policy if exists "Enable read access for authenticated users" on public.deals;
drop policy if exists "Enable insert for authenticated users only" on public.deals;
drop policy if exists "Enable update for authenticated users only" on public.deals;
drop policy if exists "Deals Delete Policy" on public.deals;

-- Deal Notes
drop policy if exists "Enable read access for authenticated users" on public.deal_notes;
drop policy if exists "Enable insert for authenticated users only" on public.deal_notes;
drop policy if exists "Deal Notes Update Policy" on public.deal_notes;
drop policy if exists "Deal Notes Delete Policy" on public.deal_notes;

-- Tags
drop policy if exists "Enable read access for authenticated users" on public.tags;
drop policy if exists "Enable insert for authenticated users only" on public.tags;
drop policy if exists "Enable update for authenticated users only" on public.tags;
drop policy if exists "Enable delete for authenticated users only" on public.tags;

-- Tasks
drop policy if exists "Enable read access for authenticated users" on public.tasks;
drop policy if exists "Enable insert for authenticated users only" on public.tasks;
drop policy if exists "Task Update Policy" on public.tasks;
drop policy if exists "Task Delete Policy" on public.tasks;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Criar novas policies multi-tenant
-- ─────────────────────────────────────────────────────────────────────────────

-- Companies
create policy "Companies select" on public.companies for select to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
create policy "Companies insert" on public.companies for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Companies update" on public.companies for update to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Companies delete" on public.companies for delete to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);

-- Contacts
create policy "Contacts select" on public.contacts for select to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
create policy "Contacts insert" on public.contacts for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Contacts update" on public.contacts for update to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Contacts delete" on public.contacts for delete to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);

-- Contact Notes
create policy "Contact notes select" on public.contact_notes for select to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
create policy "Contact notes insert" on public.contact_notes for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Contact notes update" on public.contact_notes for update to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Contact notes delete" on public.contact_notes for delete to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);

-- Deals
create policy "Deals select" on public.deals for select to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
create policy "Deals insert" on public.deals for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Deals update" on public.deals for update to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Deals delete" on public.deals for delete to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);

-- Deal Notes
create policy "Deal notes select" on public.deal_notes for select to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
create policy "Deal notes insert" on public.deal_notes for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Deal notes update" on public.deal_notes for update to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Deal notes delete" on public.deal_notes for delete to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);

-- Tags (compartilhadas por escritório)
create policy "Tags select" on public.tags for select to authenticated using (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Tags insert" on public.tags for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Tags update" on public.tags for update to authenticated using (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Tags delete" on public.tags for delete to authenticated using (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);

-- Tasks
create policy "Tasks select" on public.tasks for select to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
create policy "Tasks insert" on public.tasks for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Tasks update" on public.tasks for update to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Tasks delete" on public.tasks for delete to authenticated using (
    public.is_admin()
    or (public.get_my_papel() = 'gestor'   and escritorio_id = public.get_my_escritorio_id())
    or (public.get_my_papel() = 'assessor' and sales_id = public.get_my_sales_id())
);
