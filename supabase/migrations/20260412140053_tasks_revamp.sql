drop view if exists "public"."activity_log";

drop view if exists "public"."companies_summary";

alter table "public"."tasks" add column "deal_id" bigint;

alter table "public"."tasks" add column "end_date" timestamp with time zone;

alter table "public"."tasks" add column "end_time" text;

alter table "public"."tasks" add column "external_id" text;

alter table "public"."tasks" add column "external_url" text;

alter table "public"."tasks" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."tasks" add column "notes" text;

alter table "public"."tasks" add column "source" text default 'manual'::text;

alter table "public"."tasks" add column "start_time" text;

CREATE INDEX tasks_deal_id_idx ON public.tasks USING btree (deal_id);

CREATE UNIQUE INDEX tasks_external_id_source_idx ON public.tasks USING btree (external_id, source) WHERE (external_id IS NOT NULL);

alter table "public"."tasks" add constraint "tasks_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."tasks" validate constraint "tasks_deal_id_fkey";

set check_function_bodies = off;

create or replace view "public"."activity_log" as  SELECT (('company.'::text || c.id) || '.created'::text) AS id,
    'company.created'::text AS type,
    c.created_at AS date,
    c.id AS company_id,
    c.sales_id,
    to_json(c.*) AS company,
    NULL::json AS contact,
    NULL::json AS deal,
    NULL::json AS contact_note,
    NULL::json AS deal_note
   FROM public.companies c
UNION ALL
 SELECT (('contact.'::text || co.id) || '.created'::text) AS id,
    'contact.created'::text AS type,
    co.first_seen AS date,
    co.company_id,
    co.sales_id,
    NULL::json AS company,
    to_json(co.*) AS contact,
    NULL::json AS deal,
    NULL::json AS contact_note,
    NULL::json AS deal_note
   FROM public.contacts co
UNION ALL
 SELECT (('contactNote.'::text || cn.id) || '.created'::text) AS id,
    'contactNote.created'::text AS type,
    cn.date,
    co.company_id,
    cn.sales_id,
    NULL::json AS company,
    NULL::json AS contact,
    NULL::json AS deal,
    to_json(cn.*) AS contact_note,
    NULL::json AS deal_note
   FROM (public.contact_notes cn
     LEFT JOIN public.contacts co ON ((co.id = cn.contact_id)))
UNION ALL
 SELECT (('deal.'::text || d.id) || '.created'::text) AS id,
    'deal.created'::text AS type,
    d.created_at AS date,
    d.company_id,
    d.sales_id,
    NULL::json AS company,
    NULL::json AS contact,
    to_json(d.*) AS deal,
    NULL::json AS contact_note,
    NULL::json AS deal_note
   FROM public.deals d
UNION ALL
 SELECT (('dealNote.'::text || dn.id) || '.created'::text) AS id,
    'dealNote.created'::text AS type,
    dn.date,
    d.company_id,
    dn.sales_id,
    NULL::json AS company,
    NULL::json AS contact,
    NULL::json AS deal,
    NULL::json AS contact_note,
    to_json(dn.*) AS deal_note
   FROM (public.deal_notes dn
     LEFT JOIN public.deals d ON ((d.id = dn.deal_id)));


create or replace view "public"."companies_summary" as  SELECT c.id,
    c.created_at,
    c.name,
    c.sector,
    c.size,
    c.linkedin_url,
    c.website,
    c.phone_number,
    c.address,
    c.zipcode,
    c.city,
    c.state_abbr,
    c.sales_id,
    c.context_links,
    c.country,
    c.description,
    c.revenue,
    c.tax_identifier,
    c.logo,
    count(DISTINCT d.id) AS nb_deals,
    count(DISTINCT co.id) AS nb_contacts
   FROM ((public.companies c
     LEFT JOIN public.deals d ON ((c.id = d.company_id)))
     LEFT JOIN public.contacts co ON ((c.id = co.company_id)))
  GROUP BY c.id;


CREATE OR REPLACE FUNCTION public.get_my_escritorio_id()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT escritorio_id FROM public.sales WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_papel()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT papel FROM public.sales WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_sales_id()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id FROM public.sales WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sales_count int;
begin
  select count(id) into sales_count
  from public.sales;

  insert into public.sales (first_name, last_name, email, user_id, administrator, escritorio_id, papel)
  values (
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data -> 'custom_claims' ->> 'first_name', 'Pending'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data -> 'custom_claims' ->> 'last_name', 'Pending'),
    new.email,
    new.id,
    case when sales_count > 0 then FALSE else TRUE end,
    (new.raw_user_meta_data ->> 'escritorio_id')::bigint,
    coalesce(new.raw_user_meta_data ->> 'papel', 'assessor')
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_contacts(loser_id bigint, winner_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  winner_contact contacts%ROWTYPE;
  loser_contact contacts%ROWTYPE;
  deal_record RECORD;
  merged_emails jsonb;
  merged_phones jsonb;
  merged_tags bigint[];
  winner_emails jsonb;
  loser_emails jsonb;
  winner_phones jsonb;
  loser_phones jsonb;
  email_map jsonb;
  phone_map jsonb;
BEGIN
  -- Fetch both contacts
  SELECT * INTO winner_contact FROM contacts WHERE id = winner_id;
  SELECT * INTO loser_contact FROM contacts WHERE id = loser_id;

  IF winner_contact IS NULL OR loser_contact IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  -- 1. Reassign tasks from loser to winner
  UPDATE tasks SET contact_id = winner_id WHERE contact_id = loser_id;

  -- 2. Reassign contact notes from loser to winner
  UPDATE contact_notes SET contact_id = winner_id WHERE contact_id = loser_id;

  -- 3. Update deals - replace loser with winner in contact_ids array
  FOR deal_record IN
    SELECT id, contact_ids
    FROM deals
    WHERE contact_ids @> ARRAY[loser_id]
  LOOP
    UPDATE deals
    SET contact_ids = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(
          array_remove(deal_record.contact_ids, loser_id) || ARRAY[winner_id]
        )
      )
    )
    WHERE id = deal_record.id;
  END LOOP;

  -- 4. Merge contact data

  -- Get email arrays
  winner_emails := COALESCE(winner_contact.email_jsonb, '[]'::jsonb);
  loser_emails := COALESCE(loser_contact.email_jsonb, '[]'::jsonb);

  -- Merge emails with deduplication by email address
  -- Build a map of email -> email object, then convert back to array
  email_map := '{}'::jsonb;

  -- Add winner emails to map
  IF jsonb_array_length(winner_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_emails)-1 LOOP
      email_map := email_map || jsonb_build_object(
        winner_emails->i->>'email',
        winner_emails->i
      );
    END LOOP;
  END IF;

  -- Add loser emails to map (won't overwrite existing keys)
  IF jsonb_array_length(loser_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_emails)-1 LOOP
      IF NOT email_map ? (loser_emails->i->>'email') THEN
        email_map := email_map || jsonb_build_object(
          loser_emails->i->>'email',
          loser_emails->i
        );
      END IF;
    END LOOP;
  END IF;

  -- Convert map back to array
  merged_emails := (SELECT jsonb_agg(value) FROM jsonb_each(email_map));
  merged_emails := COALESCE(merged_emails, '[]'::jsonb);

  -- Get phone arrays
  winner_phones := COALESCE(winner_contact.phone_jsonb, '[]'::jsonb);
  loser_phones := COALESCE(loser_contact.phone_jsonb, '[]'::jsonb);

  -- Merge phones with deduplication by number
  phone_map := '{}'::jsonb;

  -- Add winner phones to map
  IF jsonb_array_length(winner_phones) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_phones)-1 LOOP
      phone_map := phone_map || jsonb_build_object(
        winner_phones->i->>'number',
        winner_phones->i
      );
    END LOOP;
  END IF;

  -- Add loser phones to map (won't overwrite existing keys)
  IF jsonb_array_length(loser_phones) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_phones)-1 LOOP
      IF NOT phone_map ? (loser_phones->i->>'number') THEN
        phone_map := phone_map || jsonb_build_object(
          loser_phones->i->>'number',
          loser_phones->i
        );
      END IF;
    END LOOP;
  END IF;

  -- Convert map back to array
  merged_phones := (SELECT jsonb_agg(value) FROM jsonb_each(phone_map));
  merged_phones := COALESCE(merged_phones, '[]'::jsonb);

  -- Merge tags (remove duplicates)
  merged_tags := ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(winner_contact.tags, ARRAY[]::bigint[]) ||
      COALESCE(loser_contact.tags, ARRAY[]::bigint[])
    )
  );

  -- 5. Update winner with merged data
  UPDATE contacts SET
    avatar = COALESCE(winner_contact.avatar, loser_contact.avatar),
    gender = COALESCE(winner_contact.gender, loser_contact.gender),
    first_name = COALESCE(winner_contact.first_name, loser_contact.first_name),
    last_name = COALESCE(winner_contact.last_name, loser_contact.last_name),
    title = COALESCE(winner_contact.title, loser_contact.title),
    company_id = COALESCE(winner_contact.company_id, loser_contact.company_id),
    email_jsonb = merged_emails,
    phone_jsonb = merged_phones,
    linkedin_url = COALESCE(winner_contact.linkedin_url, loser_contact.linkedin_url),
    background = COALESCE(winner_contact.background, loser_contact.background),
    has_newsletter = COALESCE(winner_contact.has_newsletter, loser_contact.has_newsletter),
    first_seen = LEAST(COALESCE(winner_contact.first_seen, loser_contact.first_seen), COALESCE(loser_contact.first_seen, winner_contact.first_seen)),
    last_seen = GREATEST(COALESCE(winner_contact.last_seen, loser_contact.last_seen), COALESCE(loser_contact.last_seen, winner_contact.last_seen)),
    sales_id = COALESCE(winner_contact.sales_id, loser_contact.sales_id),
    tags = merged_tags,
    -- Aba 1: Informações Pessoais
    alias = COALESCE(winner_contact.alias, loser_contact.alias),
    person_type = COALESCE(winner_contact.person_type, loser_contact.person_type),
    document = COALESCE(winner_contact.document, loser_contact.document),
    date_of_birth = COALESCE(winner_contact.date_of_birth, loser_contact.date_of_birth),
    xp_code = COALESCE(winner_contact.xp_code, loser_contact.xp_code),
    monthly_income = COALESCE(winner_contact.monthly_income, loser_contact.monthly_income),
    website = COALESCE(winner_contact.website, loser_contact.website),
    -- Aba 2: Perfil do Investidor
    segment = COALESCE(winner_contact.segment, loser_contact.segment),
    investor_profile = COALESCE(winner_contact.investor_profile, loser_contact.investor_profile),
    declared_wealth = COALESCE(winner_contact.declared_wealth, loser_contact.declared_wealth),
    xp_account_type = COALESCE(winner_contact.xp_account_type, loser_contact.xp_account_type),
    xp_international = COALESCE(winner_contact.xp_international, loser_contact.xp_international),
    investment_horizon = COALESCE(winner_contact.investment_horizon, loser_contact.investment_horizon),
    financial_goal = COALESCE(winner_contact.financial_goal, loser_contact.financial_goal),
    relationship_start_date = COALESCE(winner_contact.relationship_start_date, loser_contact.relationship_start_date),
    xp_code_2 = COALESCE(winner_contact.xp_code_2, loser_contact.xp_code_2),
    mb_code = COALESCE(winner_contact.mb_code, loser_contact.mb_code),
    avenue_code = COALESCE(winner_contact.avenue_code, loser_contact.avenue_code),
    origin = COALESCE(winner_contact.origin, loser_contact.origin),
    referred_by = COALESCE(winner_contact.referred_by, loser_contact.referred_by),
    cross_sell_opportunities = CASE
        WHEN winner_contact.cross_sell_opportunities IS NOT NULL AND loser_contact.cross_sell_opportunities IS NOT NULL
        THEN ARRAY(SELECT DISTINCT unnest(winner_contact.cross_sell_opportunities || loser_contact.cross_sell_opportunities))
        ELSE COALESCE(winner_contact.cross_sell_opportunities, loser_contact.cross_sell_opportunities)
    END,
    internal_notes = COALESCE(winner_contact.internal_notes, loser_contact.internal_notes),
    -- Aba 3: Endereço
    zip_code = COALESCE(winner_contact.zip_code, loser_contact.zip_code),
    address = COALESCE(winner_contact.address, loser_contact.address),
    address_number = COALESCE(winner_contact.address_number, loser_contact.address_number),
    address_complement = COALESCE(winner_contact.address_complement, loser_contact.address_complement),
    neighborhood = COALESCE(winner_contact.neighborhood, loser_contact.neighborhood),
    city = COALESCE(winner_contact.city, loser_contact.city),
    state = COALESCE(winner_contact.state, loser_contact.state),
    country = COALESCE(winner_contact.country, loser_contact.country),
    address_notes = COALESCE(winner_contact.address_notes, loser_contact.address_notes)
  WHERE id = winner_id;

  -- 6. Delete loser contact
  DELETE FROM contacts WHERE id = loser_id;

  RETURN winner_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_escritorio_id_default()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.escritorio_id IS NULL THEN
    SELECT escritorio_id INTO NEW.escritorio_id FROM sales WHERE user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
;


