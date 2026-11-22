begin;

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

  update public.professional_working_hours as existing
  set active = false,
      updated_at = pg_catalog.now()
  where existing.establishment_id = p_establishment_id
    and existing.professional_id = p_professional_id
    and existing.weekday = any (p_weekdays)
    and existing.active
    and not exists (
      select 1
      from pg_catalog.jsonb_to_recordset(p_periods) as period(
        weekday smallint,
        start_time time without time zone,
        end_time time without time zone
      )
      where period.weekday = existing.weekday
        and period.start_time = existing.start_time
        and period.end_time = existing.end_time
    );

  with requested_periods as (
    select
      period.weekday,
      period.start_time,
      period.end_time
    from pg_catalog.jsonb_to_recordset(p_periods) as period(
      weekday smallint,
      start_time time without time zone,
      end_time time without time zone
    )
  ),
  historical_candidates as (
    select
      history.id,
      pg_catalog.row_number() over (
        partition by
          requested.weekday,
          requested.start_time,
          requested.end_time
        order by history.created_at, history.id
      ) as candidate_number
    from requested_periods as requested
    join public.professional_working_hours as history
      on history.establishment_id = p_establishment_id
      and history.professional_id = p_professional_id
      and history.weekday = requested.weekday
      and history.start_time = requested.start_time
      and history.end_time = requested.end_time
      and not history.active
    where not exists (
      select 1
      from public.professional_working_hours as active_match
      where active_match.establishment_id = p_establishment_id
        and active_match.professional_id = p_professional_id
        and active_match.weekday = requested.weekday
        and active_match.start_time = requested.start_time
        and active_match.end_time = requested.end_time
        and active_match.active
    )
  )
  update public.professional_working_hours as history
  set active = true,
      updated_at = pg_catalog.now()
  from historical_candidates as candidate
  where candidate.candidate_number = 1
    and history.id = candidate.id
    and not history.active;

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
  )
  where not exists (
    select 1
    from public.professional_working_hours as active_match
    where active_match.establishment_id = p_establishment_id
      and active_match.professional_id = p_professional_id
      and active_match.weekday = period.weekday
      and active_match.start_time = period.start_time
      and active_match.end_time = period.end_time
      and active_match.active
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
