-- Active periods must be unique and non-overlapping per professional and weekday.
-- Inactive rows are retained as history and do not prevent new active periods.

begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

do $$
declare
  v_constraint_count integer;
  v_constraint_name text;
begin
  select count(*), min(constraint_info.conname::text)
    into v_constraint_count, v_constraint_name
  from (
    select constraint_row.conname
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid =
      'public.professional_working_hours'::regclass
      and constraint_row.contype = 'u'
      and (
        select pg_catalog.array_agg(attribute_row.attname order by key_column.ordinality)
        from unnest(constraint_row.conkey)
          with ordinality as key_column(attnum, ordinality)
        join pg_catalog.pg_attribute as attribute_row
          on attribute_row.attrelid = constraint_row.conrelid
          and attribute_row.attnum = key_column.attnum
      ) = array[
        'professional_id'::name,
        'weekday'::name,
        'start_time'::name,
        'end_time'::name
      ]
  ) as constraint_info;

  if v_constraint_count <> 1 then
    raise exception
      'Expected one professional_working_hours uniqueness constraint, found %',
      v_constraint_count;
  end if;

  -- The time-without-time-zone date_part overload is immutable.
  execute pg_catalog.format(
    'alter table public.professional_working_hours drop constraint %I',
    v_constraint_name
  );
end;
$$;

do $$
declare
  v_extension_schema name;
begin
  select extension_namespace.nspname
    into v_extension_schema
  from pg_catalog.pg_extension as installed_extension
  join pg_catalog.pg_namespace as extension_namespace
    on extension_namespace.oid = installed_extension.extnamespace
  where installed_extension.extname = 'btree_gist';

  if v_extension_schema is null then
    raise exception 'The btree_gist extension is not installed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_opclass as operator_class
    join pg_catalog.pg_am as access_method
      on access_method.oid = operator_class.opcmethod
    where access_method.amname = 'gist'
      and operator_class.opcnamespace =
        pg_catalog.to_regnamespace(v_extension_schema::text)
      and operator_class.opcname = 'gist_uuid_ops'
  ) or not exists (
    select 1
    from pg_catalog.pg_opclass as operator_class
    join pg_catalog.pg_am as access_method
      on access_method.oid = operator_class.opcmethod
    where access_method.amname = 'gist'
      and operator_class.opcnamespace =
        pg_catalog.to_regnamespace(v_extension_schema::text)
      and operator_class.opcname = 'gist_int2_ops'
  ) then
    raise exception
      'btree_gist must provide gist_uuid_ops and gist_int2_ops in schema %',
      v_extension_schema;
  end if;

  execute pg_catalog.format(
    'alter table public.professional_working_hours
      add constraint professional_working_hours_active_period_excl
      exclude using gist (
        professional_id %I.gist_uuid_ops with operator(pg_catalog.=),
        weekday %I.gist_int2_ops with operator(pg_catalog.=),
        (
          pg_catalog.numrange(
            pg_catalog.date_part(''epoch'', start_time)::numeric,
            pg_catalog.date_part(''epoch'', end_time)::numeric,
            ''[)''
          )
        ) pg_catalog.range_ops with operator(pg_catalog.&&)
      )
      where (active)',
    v_extension_schema,
    v_extension_schema
  );
end;
$$;

do $$
begin
  if pg_catalog.to_regprocedure(
    'public.is_establishment_admin(uuid)'
  ) is null then
    raise exception
      'Required authorization function public.is_establishment_admin(uuid) does not exist';
  end if;
end;
$$;

create or replace function public.replace_professional_working_hours(
  p_establishment_id uuid,
  p_professional_id uuid,
  p_weekdays smallint[],
  p_periods jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_distinct_weekdays integer;
begin
  if p_establishment_id is null or p_professional_id is null then
    raise exception 'Establishment and professional are required'
      using errcode = '22023';
  end if;

  if auth.uid() is null
    or not public.is_establishment_admin(p_establishment_id)
  then
    raise exception 'Only an active establishment owner or manager may replace working hours'
      using errcode = '42501';
  end if;

  if p_weekdays is null or pg_catalog.cardinality(p_weekdays) = 0 then
    raise exception 'Select at least one weekday'
      using errcode = '22023';
  end if;

  select count(distinct selected_weekday.weekday)
    into v_distinct_weekdays
  from unnest(p_weekdays) as selected_weekday(weekday);

  if v_distinct_weekdays <> pg_catalog.cardinality(p_weekdays)
    or exists (
      select 1
      from unnest(p_weekdays) as selected_weekday(weekday)
      where selected_weekday.weekday is null
        or selected_weekday.weekday not between 0 and 6
    )
  then
    raise exception 'Weekdays must be unique values from 0 through 6'
      using errcode = '22023';
  end if;

  if p_periods is null
    or pg_catalog.jsonb_typeof(p_periods) is distinct from 'array'
  then
    raise exception 'Periods must be a non-empty JSON array'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(p_periods) = 0 then
    raise exception 'At least one period is required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_periods) as item(value)
    where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
      or pg_catalog.jsonb_typeof(item.value -> 'weekday')
        is distinct from 'number'
      or (item.value ->> 'weekday') !~ '^(0|[1-6])$'
      or pg_catalog.jsonb_typeof(item.value -> 'start_time')
        is distinct from 'string'
      or (item.value ->> 'start_time') !~
        '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9]([.][0-9]{1,6})?)?$'
      or pg_catalog.jsonb_typeof(item.value -> 'end_time')
        is distinct from 'string'
      or (item.value ->> 'end_time') !~
        '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9]([.][0-9]{1,6})?)?$'
  ) then
    raise exception 'Each period must contain a weekday and valid start_time/end_time values'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_periods) as period(
      weekday smallint,
      start_time time without time zone,
      end_time time without time zone
    )
    where period.weekday <> all (p_weekdays)
      or period.start_time >= period.end_time
  ) then
    raise exception 'Each period must use a selected weekday and end after it starts'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_weekdays) as selected_weekday(weekday)
    where not exists (
      select 1
      from pg_catalog.jsonb_to_recordset(p_periods) as period(
        weekday smallint,
        start_time time without time zone,
        end_time time without time zone
      )
      where period.weekday = selected_weekday.weekday
    )
  ) then
    raise exception 'At least one period is required for every selected weekday'
      using errcode = '22023';
  end if;

  if exists (
    with periods as (
      select
        pg_catalog.row_number() over (
          order by period.weekday, period.start_time, period.end_time
        ) as period_number,
        period.weekday,
        period.start_time,
        period.end_time
      from pg_catalog.jsonb_to_recordset(p_periods) as period(
        weekday smallint,
        start_time time without time zone,
        end_time time without time zone
      )
    )
    select 1
    from periods as first_period
    join periods as second_period
      on second_period.weekday = first_period.weekday
      and second_period.period_number > first_period.period_number
      and first_period.start_time < second_period.end_time
      and second_period.start_time < first_period.end_time
  ) then
    raise exception 'The submitted periods overlap on the same weekday'
      using errcode = '22023';
  end if;

  perform professional.id
  from public.professionals as professional
  where professional.id = p_professional_id
    and professional.establishment_id = p_establishment_id
  for no key update;

  if not found then
    raise exception 'Professional does not belong to the supplied establishment'
      using errcode = '23503';
  end if;

  update public.professional_working_hours
  set active = false,
      updated_at = pg_catalog.now()
  where establishment_id = p_establishment_id
    and professional_id = p_professional_id
    and weekday = any (p_weekdays)
    and active;

  insert into public.professional_working_hours (
    establishment_id,
    professional_id,
    weekday,
    start_time,
    end_time
  )
  select
    p_establishment_id,
    p_professional_id,
    period.weekday,
    period.start_time,
    period.end_time
  from pg_catalog.jsonb_to_recordset(p_periods) as period(
    weekday smallint,
    start_time time without time zone,
    end_time time without time zone
  );
end;
$$;

revoke all on function public.replace_professional_working_hours(
  uuid,
  uuid,
  smallint[],
  jsonb
) from public, anon;

grant execute on function public.replace_professional_working_hours(
  uuid,
  uuid,
  smallint[],
  jsonb
) to authenticated;

commit;
