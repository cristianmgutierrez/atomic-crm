-- Migration: Contact Fields Expansion
-- Adds ~23 new fields for Family Office CRM compatibility
-- and renames status values to Portuguese

-- ============================================================
-- 1. Add new columns to contacts table
-- ============================================================

-- Aba 1: Informações Pessoais
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS alias text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS person_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS document text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS xp_code text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS monthly_income numeric;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS website text;

-- Aba 2: Perfil do Investidor
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS segment text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS investor_profile text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS declared_wealth numeric;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS xp_account_type text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS xp_international boolean;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS investment_horizon text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS financial_goal text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS relationship_start_date date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS xp_code_2 text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS mb_code text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS avenue_code text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS cross_sell_opportunities text[];
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS internal_notes text;

-- Aba 3: Endereço
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_number text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_complement text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_notes text;

-- ============================================================
-- 2. Rename status values (contacts)
-- ============================================================
UPDATE public.contacts SET status = 'ativo'       WHERE status = 'cold';
UPDATE public.contacts SET status = 'inativo'     WHERE status = 'warm';
UPDATE public.contacts SET status = 'prospect'    WHERE status = 'hot';
UPDATE public.contacts SET status = 'transferido' WHERE status = 'in-contract';

-- ============================================================
-- 3. Rename status values (contact_notes)
-- ============================================================
UPDATE public.contact_notes SET status = 'ativo'       WHERE status = 'cold';
UPDATE public.contact_notes SET status = 'inativo'     WHERE status = 'warm';
UPDATE public.contact_notes SET status = 'prospect'    WHERE status = 'hot';
UPDATE public.contact_notes SET status = 'transferido' WHERE status = 'in-contract';

-- ============================================================
-- 4. Update noteStatuses in configuration table (if present)
-- ============================================================
UPDATE public.configuration
SET config = jsonb_set(
    config,
    '{noteStatuses}',
    (
        SELECT jsonb_agg(
            CASE
                WHEN item->>'value' = 'cold'        THEN item || '{"value":"ativo","label":"Ativo"}'
                WHEN item->>'value' = 'warm'        THEN item || '{"value":"inativo","label":"Inativo"}'
                WHEN item->>'value' = 'hot'         THEN item || '{"value":"prospect","label":"Prospect"}'
                WHEN item->>'value' = 'in-contract' THEN item || '{"value":"transferido","label":"Transferido"}'
                ELSE item
            END
        )
        FROM jsonb_array_elements(config->'noteStatuses') AS item
    )
)
WHERE config ? 'noteStatuses';

-- ============================================================
-- 5. Recreate contacts_summary view with new columns
-- (DROP + CREATE because column order changes)
-- ============================================================
DROP VIEW IF EXISTS public.contacts_summary;
CREATE VIEW public.contacts_summary WITH (security_invoker = on) AS
SELECT
    co.id,
    co.first_name,
    co.last_name,
    co.gender,
    co.title,
    co.background,
    co.avatar,
    co.first_seen,
    co.last_seen,
    co.has_newsletter,
    co.status,
    co.tags,
    co.company_id,
    co.sales_id,
    co.linkedin_url,
    co.email_jsonb,
    co.phone_jsonb,
    co.escritorio_id,
    -- Aba 1: Informações Pessoais
    co.alias,
    co.person_type,
    co.document,
    co.date_of_birth,
    co.xp_code,
    co.monthly_income,
    co.website,
    -- Aba 2: Perfil do Investidor
    co.segment,
    co.investor_profile,
    co.declared_wealth,
    co.xp_account_type,
    co.xp_international,
    co.investment_horizon,
    co.financial_goal,
    co.relationship_start_date,
    co.xp_code_2,
    co.mb_code,
    co.avenue_code,
    co.origin,
    co.referred_by,
    co.cross_sell_opportunities,
    co.internal_notes,
    -- Aba 3: Endereço
    co.zip_code,
    co.address,
    co.address_number,
    co.address_complement,
    co.neighborhood,
    co.city,
    co.state,
    co.country,
    co.address_notes,
    -- Campos calculados
    (jsonb_path_query_array(co.email_jsonb, '$[*]."email"'))::text AS email_fts,
    (jsonb_path_query_array(co.phone_jsonb, '$[*]."number"'))::text AS phone_fts,
    c.name AS company_name,
    count(distinct t.id) FILTER (WHERE t.done_date IS NULL) AS nb_tasks
FROM public.contacts co
    LEFT JOIN public.tasks t ON co.id = t.contact_id
    LEFT JOIN public.companies c ON co.company_id = c.id
GROUP BY co.id, c.name;
