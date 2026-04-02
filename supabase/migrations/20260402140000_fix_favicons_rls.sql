-- Migration: Restringir escrita em favicons_excluded_domains a admins
-- Corrige aviso "RLS Policy Always True" do Supabase Advisor

drop policy if exists "Enable access for authenticated users only" on public.favicons_excluded_domains;

create policy "Favicons read" on public.favicons_excluded_domains for select to authenticated using (true);
create policy "Favicons insert" on public.favicons_excluded_domains for insert to authenticated with check (public.is_admin());
create policy "Favicons update" on public.favicons_excluded_domains for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Favicons delete" on public.favicons_excluded_domains for delete to authenticated using (public.is_admin());
