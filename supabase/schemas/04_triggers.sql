--
-- Triggers
-- This file declares all triggers.
--

-- Auto-populate sales_id from current auth user on insert
create or replace trigger set_company_sales_id_trigger
    before insert on public.companies
    for each row execute function public.set_sales_id_default();

create or replace trigger set_contact_sales_id_trigger
    before insert on public.contacts
    for each row execute function public.set_sales_id_default();

create or replace trigger set_deal_sales_id_trigger
    before insert on public.deals
    for each row execute function public.set_sales_id_default();

create or replace trigger set_task_sales_id_trigger
    before insert on public.tasks
    for each row execute function public.set_sales_id_default();

-- Auto-populate escritorio_id from current auth user on insert
create or replace trigger set_company_escritorio_id_trigger
    before insert on public.companies
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_contact_escritorio_id_trigger
    before insert on public.contacts
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_deal_escritorio_id_trigger
    before insert on public.deals
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_task_escritorio_id_trigger
    before insert on public.tasks
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_tag_escritorio_id_trigger
    before insert on public.tags
    for each row execute function public.set_escritorio_id_default();

create or replace trigger set_pipeline_escritorio_id_trigger
    before insert on public.pipelines
    for each row execute function public.set_escritorio_id_default();

-- Auto-fetch company logo from website favicon on save
create or replace trigger company_saved
    before insert or update on public.companies
    for each row execute function public.handle_company_saved();

-- Auto-fetch contact avatar from email on save
create or replace trigger contact_saved
    before insert or update on public.contacts
    for each row execute function public.handle_contact_saved();

-- Update contact.last_seen when a task is created or marked done
create or replace trigger on_task_created_or_done
    after insert or update of done_date on public.tasks
    for each row execute function public.handle_task_last_seen();

-- Cleanup storage attachments when task attachments change (reuses generic note attachments cleanup)
create or replace trigger on_task_attachments_updated_delete_attachments
    after update on public.tasks
    for each row
    when (old.attachments is distinct from new.attachments)
    execute function public.cleanup_note_attachments();

create or replace trigger on_task_deleted_delete_attachments
    after delete on public.tasks
    for each row execute function public.cleanup_note_attachments();

-- Auth triggers: sync auth.users to public.sales
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace trigger on_auth_user_updated
    after update on auth.users
    for each row execute function public.handle_update_user();
