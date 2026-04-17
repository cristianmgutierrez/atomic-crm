-- Rename the persisted configuration JSON key from `noteStatuses` to `contactStatuses`.
-- The value was always the contact's status (ativo/inativo/prospect/transferido); the
-- old name reflected the legacy path of mutating it via notes, not its real meaning.
update public.configuration
set config = (config - 'noteStatuses') || jsonb_build_object('contactStatuses', config->'noteStatuses')
where config ? 'noteStatuses';
