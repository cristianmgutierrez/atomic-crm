--
-- Row Level Security
-- This file declares RLS policies for all tables.
--

-- Enable RLS on all tables
alter table public.escritorios enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_notes enable row level security;
alter table public.deals enable row level security;
alter table public.deal_notes enable row level security;
alter table public.sales enable row level security;
alter table public.tags enable row level security;
alter table public.pipelines enable row level security;
alter table public.tasks enable row level security;
alter table public.configuration enable row level security;
alter table public.favicons_excluded_domains enable row level security;

-- Escritorios (somente admins podem criar/editar/excluir)
create policy "Enable read for authenticated users" on public.escritorios for select to authenticated using (true);
create policy "Enable insert for admins" on public.escritorios for insert to authenticated with check (public.is_admin());
create policy "Enable update for admins" on public.escritorios for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Enable delete for admins" on public.escritorios for delete to authenticated using (public.is_admin());

-- Companies (multi-tenant: admin vê tudo, gestor vê seu escritório, assessor vê os próprios)
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

-- Contacts (multi-tenant)
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

-- Contact Notes (multi-tenant)
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

-- Deals (multi-tenant)
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

-- Deal Notes (multi-tenant)
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

-- Sales (leitura permissiva para todos autenticados; escrita via edge function users com service role)
create policy "Enable read access for authenticated users" on public.sales for select to authenticated using (true);

-- Pipelines (compartilhados por escritório; todos os papéis podem gerenciar os funis do próprio escritório)
create policy "Pipelines select" on public.pipelines for select to authenticated using (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Pipelines insert" on public.pipelines for insert to authenticated with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Pipelines update" on public.pipelines for update to authenticated using (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
) with check (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);
create policy "Pipelines delete" on public.pipelines for delete to authenticated using (
    public.is_admin()
    or escritorio_id = public.get_my_escritorio_id()
);

-- Tags (compartilhadas por escritório; todos os papéis podem gerenciar as tags do próprio escritório)
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

-- Tasks (multi-tenant)
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

-- Configuration (admin-only para escrita; leitura para todos)
create policy "Enable read for authenticated" on public.configuration for select to authenticated using (true);
create policy "Enable insert for admins" on public.configuration for insert to authenticated with check (public.is_admin());
create policy "Enable update for admins" on public.configuration for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Favicons excluded domains (leitura aberta; escrita restrita a admins)
create policy "Favicons read" on public.favicons_excluded_domains for select to authenticated using (true);
create policy "Favicons insert" on public.favicons_excluded_domains for insert to authenticated with check (public.is_admin());
create policy "Favicons update" on public.favicons_excluded_domains for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Favicons delete" on public.favicons_excluded_domains for delete to authenticated using (public.is_admin());
