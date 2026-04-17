-- Migrate contact_notes and deal_notes into tasks (type='observation') and drop the
-- legacy "notes" entities. After this migration:
--   * tasks absorb every interaction (open or completed)
--   * contacts.status is the single source of truth for the contact's status
--   * activity_log derives observations from tasks (no more contact_notes / deal_notes)
--
-- Order matters: data must be preserved BEFORE the tables are dropped, and any view or
-- function that depends on the dropped tables must be replaced first.

-- 1. Preserve final contact status from the latest contact_notes.status (if the
-- contact's status field is still null). Notes used to be the only path for status
-- mutation, so we promote that value to the canonical column before discarding it.
update public.contacts c
set status = sub.status
from (
    select distinct on (cn.contact_id) cn.contact_id, cn.status
    from public.contact_notes cn
    where cn.status is not null
    order by cn.contact_id, cn.date desc nulls last, cn.id desc
) sub
where c.id = sub.contact_id and c.status is null;

-- 2. Copy contact_notes into tasks as completed observations.
insert into public.tasks (
    contact_id, type, notes, done_date, sales_id, attachments, escritorio_id, source
)
select
    cn.contact_id,
    'observation',
    cn.text,
    coalesce(cn.date, now()),
    cn.sales_id,
    cn.attachments,
    cn.escritorio_id,
    'migrated_note'
from public.contact_notes cn;

-- 3. Copy deal_notes into tasks. tasks.contact_id is NOT NULL, so we attach each deal
-- observation to the deal's first contact. Deals without contacts are skipped (rare
-- edge case; logged via RAISE NOTICE).
do $$
declare
    skipped_count int;
begin
    insert into public.tasks (
        contact_id, deal_id, type, notes, done_date, sales_id, attachments, escritorio_id, source
    )
    select
        d.contact_ids[1],
        dn.deal_id,
        'observation',
        dn.text,
        coalesce(dn.date, now()),
        dn.sales_id,
        dn.attachments,
        dn.escritorio_id,
        'migrated_note'
    from public.deal_notes dn
    join public.deals d on d.id = dn.deal_id
    where d.contact_ids is not null and array_length(d.contact_ids, 1) > 0;

    select count(*)
    into skipped_count
    from public.deal_notes dn
    join public.deals d on d.id = dn.deal_id
    where d.contact_ids is null or array_length(d.contact_ids, 1) is null;

    if skipped_count > 0 then
        raise notice 'Skipped % deal_notes whose deals have no contacts', skipped_count;
    end if;
end $$;

-- 4. Drop the activity_log view (will be recreated without contact_note/deal_note).
drop view if exists public.activity_log;

-- 5. Recreate merge_contacts without the contact_notes block (tasks already cover it).
create or replace function public.merge_contacts(loser_id bigint, winner_id bigint) returns bigint
    language plpgsql
    set search_path to 'public'
    as $$
declare
  winner_contact contacts%rowtype;
  loser_contact contacts%rowtype;
  deal_record record;
  merged_emails jsonb;
  merged_phones jsonb;
  merged_tags bigint[];
  winner_emails jsonb;
  loser_emails jsonb;
  winner_phones jsonb;
  loser_phones jsonb;
  email_map jsonb;
  phone_map jsonb;
begin
  select * into winner_contact from contacts where id = winner_id;
  select * into loser_contact from contacts where id = loser_id;

  if winner_contact is null or loser_contact is null then
    raise exception 'Contact not found';
  end if;

  -- Reassign tasks (which now include observations) from loser to winner.
  update tasks set contact_id = winner_id where contact_id = loser_id;

  -- Replace loser with winner in deal contact arrays, deduplicating.
  for deal_record in
    select id, contact_ids from deals where contact_ids @> array[loser_id]
  loop
    update deals
    set contact_ids = (
      select array(
        select distinct unnest(
          array_remove(deal_record.contact_ids, loser_id) || array[winner_id]
        )
      )
    )
    where id = deal_record.id;
  end loop;

  winner_emails := coalesce(winner_contact.email_jsonb, '[]'::jsonb);
  loser_emails := coalesce(loser_contact.email_jsonb, '[]'::jsonb);

  email_map := '{}'::jsonb;
  if jsonb_array_length(winner_emails) > 0 then
    for i in 0..jsonb_array_length(winner_emails)-1 loop
      email_map := email_map || jsonb_build_object(
        winner_emails->i->>'email', winner_emails->i
      );
    end loop;
  end if;
  if jsonb_array_length(loser_emails) > 0 then
    for i in 0..jsonb_array_length(loser_emails)-1 loop
      if not email_map ? (loser_emails->i->>'email') then
        email_map := email_map || jsonb_build_object(
          loser_emails->i->>'email', loser_emails->i
        );
      end if;
    end loop;
  end if;
  merged_emails := coalesce((select jsonb_agg(value) from jsonb_each(email_map)), '[]'::jsonb);

  winner_phones := coalesce(winner_contact.phone_jsonb, '[]'::jsonb);
  loser_phones := coalesce(loser_contact.phone_jsonb, '[]'::jsonb);

  phone_map := '{}'::jsonb;
  if jsonb_array_length(winner_phones) > 0 then
    for i in 0..jsonb_array_length(winner_phones)-1 loop
      phone_map := phone_map || jsonb_build_object(
        winner_phones->i->>'number', winner_phones->i
      );
    end loop;
  end if;
  if jsonb_array_length(loser_phones) > 0 then
    for i in 0..jsonb_array_length(loser_phones)-1 loop
      if not phone_map ? (loser_phones->i->>'number') then
        phone_map := phone_map || jsonb_build_object(
          loser_phones->i->>'number', loser_phones->i
        );
      end if;
    end loop;
  end if;
  merged_phones := coalesce((select jsonb_agg(value) from jsonb_each(phone_map)), '[]'::jsonb);

  merged_tags := array(
    select distinct unnest(
      coalesce(winner_contact.tags, array[]::bigint[]) ||
      coalesce(loser_contact.tags, array[]::bigint[])
    )
  );

  update contacts set
    avatar = coalesce(winner_contact.avatar, loser_contact.avatar),
    gender = coalesce(winner_contact.gender, loser_contact.gender),
    first_name = coalesce(winner_contact.first_name, loser_contact.first_name),
    last_name = coalesce(winner_contact.last_name, loser_contact.last_name),
    title = coalesce(winner_contact.title, loser_contact.title),
    company_id = coalesce(winner_contact.company_id, loser_contact.company_id),
    email_jsonb = merged_emails,
    phone_jsonb = merged_phones,
    linkedin_url = coalesce(winner_contact.linkedin_url, loser_contact.linkedin_url),
    background = coalesce(winner_contact.background, loser_contact.background),
    has_newsletter = coalesce(winner_contact.has_newsletter, loser_contact.has_newsletter),
    first_seen = least(coalesce(winner_contact.first_seen, loser_contact.first_seen), coalesce(loser_contact.first_seen, winner_contact.first_seen)),
    last_seen = greatest(coalesce(winner_contact.last_seen, loser_contact.last_seen), coalesce(loser_contact.last_seen, winner_contact.last_seen)),
    sales_id = coalesce(winner_contact.sales_id, loser_contact.sales_id),
    tags = merged_tags,
    alias = coalesce(winner_contact.alias, loser_contact.alias),
    person_type = coalesce(winner_contact.person_type, loser_contact.person_type),
    document = coalesce(winner_contact.document, loser_contact.document),
    date_of_birth = coalesce(winner_contact.date_of_birth, loser_contact.date_of_birth),
    xp_code = coalesce(winner_contact.xp_code, loser_contact.xp_code),
    monthly_income = coalesce(winner_contact.monthly_income, loser_contact.monthly_income),
    website = coalesce(winner_contact.website, loser_contact.website),
    segment = coalesce(winner_contact.segment, loser_contact.segment),
    investor_profile = coalesce(winner_contact.investor_profile, loser_contact.investor_profile),
    declared_wealth = coalesce(winner_contact.declared_wealth, loser_contact.declared_wealth),
    xp_account_type = coalesce(winner_contact.xp_account_type, loser_contact.xp_account_type),
    xp_international = coalesce(winner_contact.xp_international, loser_contact.xp_international),
    investment_horizon = coalesce(winner_contact.investment_horizon, loser_contact.investment_horizon),
    financial_goal = coalesce(winner_contact.financial_goal, loser_contact.financial_goal),
    relationship_start_date = coalesce(winner_contact.relationship_start_date, loser_contact.relationship_start_date),
    xp_code_2 = coalesce(winner_contact.xp_code_2, loser_contact.xp_code_2),
    mb_code = coalesce(winner_contact.mb_code, loser_contact.mb_code),
    avenue_code = coalesce(winner_contact.avenue_code, loser_contact.avenue_code),
    origin = coalesce(winner_contact.origin, loser_contact.origin),
    referred_by = coalesce(winner_contact.referred_by, loser_contact.referred_by),
    cross_sell_opportunities = case
        when winner_contact.cross_sell_opportunities is not null and loser_contact.cross_sell_opportunities is not null
        then array(select distinct unnest(winner_contact.cross_sell_opportunities || loser_contact.cross_sell_opportunities))
        else coalesce(winner_contact.cross_sell_opportunities, loser_contact.cross_sell_opportunities)
    end,
    internal_notes = coalesce(winner_contact.internal_notes, loser_contact.internal_notes),
    zip_code = coalesce(winner_contact.zip_code, loser_contact.zip_code),
    address = coalesce(winner_contact.address, loser_contact.address),
    address_number = coalesce(winner_contact.address_number, loser_contact.address_number),
    address_complement = coalesce(winner_contact.address_complement, loser_contact.address_complement),
    neighborhood = coalesce(winner_contact.neighborhood, loser_contact.neighborhood),
    city = coalesce(winner_contact.city, loser_contact.city),
    state = coalesce(winner_contact.state, loser_contact.state),
    country = coalesce(winner_contact.country, loser_contact.country),
    address_notes = coalesce(winner_contact.address_notes, loser_contact.address_notes)
  where id = winner_id;

  delete from contacts where id = loser_id;

  return winner_id;
end;
$$;

-- 6. Drop legacy tables (cascades to triggers, policies, indexes, sequences, grants).
drop table if exists public.contact_notes cascade;
drop table if exists public.deal_notes cascade;

-- 7. Drop the now-orphan helper function for the contact_notes trigger.
drop function if exists public.handle_contact_note_created_or_updated();

-- 8. Recreate activity_log without contact_note / deal_note columns.
create or replace view public.activity_log with (security_invoker = on) as
select
    ('company.' || c.id || '.created') as id,
    'company.created' as type,
    c.created_at as date,
    c.id as company_id,
    c.sales_id,
    to_json(c.*) as company,
    null::json as contact,
    null::json as deal,
    null::json as task
from public.companies c
union all
select
    ('contact.' || co.id || '.created') as id,
    'contact.created' as type,
    co.first_seen as date,
    co.company_id,
    co.sales_id,
    null::json as company,
    to_json(co.*) as contact,
    null::json as deal,
    null::json as task
from public.contacts co
union all
select
    ('deal.' || d.id || '.created') as id,
    'deal.created' as type,
    d.created_at as date,
    d.company_id,
    d.sales_id,
    null::json as company,
    null::json as contact,
    to_json(d.*) as deal,
    null::json as task
from public.deals d
union all
select
    ('task.' || t.id || '.created') as id,
    'task.created' as type,
    t.created_at as date,
    co.company_id,
    t.sales_id,
    null::json as company,
    null::json as contact,
    null::json as deal,
    to_json(t.*) as task
from public.tasks t
    left join public.contacts co on co.id = t.contact_id
union all
select
    ('task.' || t.id || '.done') as id,
    'task.done' as type,
    t.done_date as date,
    co.company_id,
    t.sales_id,
    null::json as company,
    null::json as contact,
    null::json as deal,
    to_json(t.*) as task
from public.tasks t
    left join public.contacts co on co.id = t.contact_id
    where t.done_date is not null;

grant all on table public.activity_log to anon;
grant all on table public.activity_log to authenticated;
grant all on table public.activity_log to service_role;
