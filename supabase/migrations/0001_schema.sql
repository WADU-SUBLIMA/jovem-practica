-- ============================================================================
-- JOVEM Practica — Esquema base
-- ============================================================================
-- Principios de diseño (heredados del prototipo):
--   * El estudiante NO tiene cuenta: entra libre y anónimo.
--   * Solo se guardan conteos anónimos de impacto, ningún dato personal.
--   * La respuesta correcta NUNCA viaja al cliente antes de finalizar:
--     las preguntas se sirven por una vista sin la respuesta y la
--     calificación ocurre dentro de la base de datos.
--   * El staff (admin / asesor / generador de ítems) sí usa Supabase Auth.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Unidades de la Guía JOVEM
-- ---------------------------------------------------------------------------
create table if not exists public.units (
  id         smallint primary key,
  name       text not null,
  short_name text not null
);

-- ---------------------------------------------------------------------------
-- Perfiles de staff (extiende auth.users). Los estudiantes no aparecen aquí.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  username   text not null unique,
  role       text not null check (role in ('admin','asesor','item_creator')),
  is_active  boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Banco de preguntas
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  legacy_id     text unique,                        -- id del prototipo (q1, q2, ...)
  unit_id       smallint not null references public.units(id),
  type          text not null check (type in ('concepto','caso')),
  scenario      text,                               -- solo para type='caso'
  example       text,                               -- frase de ejemplo entre comillas
  image         text,                               -- clave de ilustración
  stem          text not null,
  options       jsonb not null,                     -- exactamente 3 opciones
  correct_index smallint not null check (correct_index between 0 and 2),
  explanation   text not null,
  archived      boolean not null default false,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint questions_three_options check (jsonb_array_length(options) = 3)
);

create index if not exists questions_unit_idx on public.questions (unit_id) where not archived;

-- ---------------------------------------------------------------------------
-- Configuración de las prácticas (la edita el asesor / admin)
-- ---------------------------------------------------------------------------
create table if not exists public.practice_config (
  id                 boolean primary key default true check (id),  -- fila única
  time_limit_minutes int not null default 80 check (time_limit_minutes > 0),
  question_count     int not null default 30 check (question_count > 0),
  passing_score      int not null default 70 check (passing_score between 0 and 100),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Métricas de impacto: SOLO conteos anónimos, sin datos personales.
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id         bigint generated always as identity primary key,
  event_type text not null check (event_type in ('visit','practice_started')),
  device_key uuid not null,           -- UUID aleatorio del navegador, no identifica personas
  created_at timestamptz not null default now()
);

create index if not exists usage_events_type_date_idx on public.usage_events (event_type, created_at);

-- ---------------------------------------------------------------------------
-- Intentos finalizados. Sin nombre ni identificación: solo resultados.
-- ---------------------------------------------------------------------------
create table if not exists public.exam_attempts (
  id              uuid primary key default gen_random_uuid(),
  device_key      uuid,
  student_level   text check (student_level in ('Sétimo','Octavo','Noveno')),
  total_questions int  not null,
  correct_count   int  not null,
  wrong_count     int  not null,
  score           numeric(5,2) not null,
  passed          boolean not null,
  unit_breakdown  jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists exam_attempts_date_idx on public.exam_attempts (created_at);

-- ============================================================================
-- Vista pública de preguntas: SIN respuesta correcta ni explicación.
-- ============================================================================
create or replace view public.questions_public as
  select id, unit_id, type, scenario, example, image, stem, options
  from public.questions
  where not archived;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.units           enable row level security;
alter table public.profiles        enable row level security;
alter table public.questions       enable row level security;
alter table public.practice_config enable row level security;
alter table public.usage_events    enable row level security;
alter table public.exam_attempts   enable row level security;

-- Rol del usuario autenticado (se llama app_role porque current_role es palabra reservada en PostgreSQL)
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.app_role() is not null
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.app_role() = 'admin'
$$;

-- Unidades: lectura pública (las necesita la pantalla de práctica por unidad)
drop policy if exists units_read_all on public.units;
create policy units_read_all on public.units for select using (true);

-- Perfiles: cada quien ve el suyo; el admin ve y administra todos
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Preguntas: la tabla completa (con respuestas) SOLO para staff.
-- El estudiante anónimo nunca lee esta tabla; usa questions_public + RPC.
drop policy if exists questions_staff_read on public.questions;
create policy questions_staff_read on public.questions
  for select using (public.is_staff());

drop policy if exists questions_editors_write on public.questions;
create policy questions_editors_write on public.questions
  for all using (public.app_role() in ('admin','item_creator'))
  with check (public.app_role() in ('admin','item_creator'));

-- Configuración: la lee cualquiera (el estudiante necesita el tiempo límite),
-- la modifica el asesor o el admin.
drop policy if exists config_read_all on public.practice_config;
create policy config_read_all on public.practice_config for select using (true);

drop policy if exists config_staff_write on public.practice_config;
create policy config_staff_write on public.practice_config
  for update using (public.app_role() in ('admin','asesor'))
  with check (public.app_role() in ('admin','asesor'));

-- Métricas: nadie escribe directo (solo por RPC). El staff puede leer agregados.
drop policy if exists usage_staff_read on public.usage_events;
create policy usage_staff_read on public.usage_events
  for select using (public.is_staff());

drop policy if exists attempts_staff_read on public.exam_attempts;
create policy attempts_staff_read on public.exam_attempts
  for select using (public.is_staff());

-- ============================================================================
-- RPCs públicas (SECURITY DEFINER): la única vía de escritura del anónimo
-- ============================================================================

-- Registrar un evento de impacto (visita o práctica iniciada)
create or replace function public.log_event(p_event_type text, p_device_key uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_event_type not in ('visit','practice_started') then
    raise exception 'event_type inválido';
  end if;
  insert into public.usage_events (event_type, device_key)
  values (p_event_type, p_device_key);
end;
$$;

-- Armar una práctica. Devuelve las preguntas SIN la respuesta correcta y con
-- las opciones ya barajadas: cada opción viaja con su índice original ("i"),
-- que es lo que el cliente devuelve al finalizar.
create or replace function public.get_practice(p_mode text default 'full', p_unit_id smallint default null)
returns table (
  id       uuid,
  unit_id  smallint,
  type     text,
  scenario text,
  example  text,
  image    text,
  stem     text,
  options  jsonb
) language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  select pc.question_count into v_count
  from public.practice_config pc
  where pc.id = true;

  return query
  with elegidas as (
    select q.id, q.unit_id, q.type, q.scenario, q.example, q.image, q.stem, q.options
    from public.questions q
    where not q.archived
      and (p_mode <> 'unit' or q.unit_id = p_unit_id)
    order by random()
    limit case when p_mode = 'unit' then 1000 else coalesce(v_count, 30) end
  )
  select e.id, e.unit_id, e.type, e.scenario, e.example, e.image, e.stem,
         (
           select jsonb_agg(jsonb_build_object('i', o.idx - 1, 'text', o.val) order by random())
           from jsonb_array_elements_text(e.options) with ordinality as o(val, idx)
         ) as options
  from elegidas e
  order by random();
end;
$$;

-- Calificar y guardar el intento. Recibe:
--   p_answers: [{"question_id":"uuid","selected":0}]  (selected = índice ORIGINAL, o null)
-- Devuelve el resultado completo, ya con las explicaciones.
create or replace function public.submit_practice(
  p_answers jsonb,
  p_device_key uuid default null,
  p_level text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_correct int; v_wrong int; v_score numeric; v_passing int;
  v_breakdown jsonb; v_detail jsonb; v_attempt uuid;
begin
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 then
    raise exception 'p_answers debe ser un arreglo con al menos una respuesta';
  end if;

  select pc.passing_score into v_passing
  from public.practice_config pc
  where pc.id = true;

  create temp table _res on commit drop as
  select q.id, q.unit_id, q.stem, q.scenario, q.options, q.correct_index, q.explanation,
         (a.value ->> 'selected')::int as selected,
         ((a.value ->> 'selected')::int is not distinct from q.correct_index) as is_correct
  from jsonb_array_elements(p_answers) a
  join public.questions q on q.id = (a.value ->> 'question_id')::uuid;

  select count(*), count(*) filter (where is_correct) into v_total, v_correct from _res;
  v_wrong := v_total - v_correct;
  v_score := round((v_correct::numeric / nullif(v_total,0)) * 100, 2);

  select coalesce(jsonb_object_agg(unit_id::text,
           jsonb_build_object('correct', c, 'total', t)), '{}'::jsonb)
    into v_breakdown
  from (select unit_id, count(*) filter (where is_correct) c, count(*) t
        from _res group by unit_id) s;

  insert into public.exam_attempts
    (device_key, student_level, total_questions, correct_count, wrong_count, score, passed, unit_breakdown)
  values
    (p_device_key, p_level, v_total, v_correct, v_wrong, v_score,
     v_score >= coalesce(v_passing, 70), v_breakdown)
  returning id into v_attempt;

  select jsonb_agg(jsonb_build_object(
           'question_id', id, 'stem', stem, 'scenario', scenario,
           'selected', selected, 'correct_index', correct_index,
           'options', options, 'is_correct', is_correct, 'explanation', explanation))
    into v_detail from _res;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'total', v_total, 'correct', v_correct, 'wrong', v_wrong,
    'score', v_score, 'passed', v_score >= coalesce(v_passing, 70),
    'unit_breakdown', v_breakdown, 'detail', v_detail
  );
end;
$$;

-- Panel de impacto (lo consultan admin y asesor)
create or replace function public.impact_stats(p_since timestamptz default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visits',              (select count(*) from usage_events where event_type='visit'             and (p_since is null or created_at >= p_since)),
    'practice_started',    (select count(*) from usage_events where event_type='practice_started'  and (p_since is null or created_at >= p_since)),
    'practice_completed',  (select count(*) from exam_attempts where (p_since is null or created_at >= p_since)),
    'avg_score',           (select coalesce(round(avg(score))::int,0) from exam_attempts where (p_since is null or created_at >= p_since)),
    'pass_rate',           (select coalesce(round(100.0*count(*) filter (where passed)/nullif(count(*),0))::int,0) from exam_attempts where (p_since is null or created_at >= p_since)),
    'per_unit',            (select coalesce(jsonb_object_agg(u.id::text, jsonb_build_object('correct',
                                     coalesce(sum((a.unit_breakdown -> u.id::text ->> 'correct')::int),0), 'total',
                                     coalesce(sum((a.unit_breakdown -> u.id::text ->> 'total')::int),0))), '{}'::jsonb)
                            from units u left join exam_attempts a
                              on a.unit_breakdown ? u.id::text
                             and (p_since is null or a.created_at >= p_since))
  );
$$;

-- Permisos: el anónimo solo puede usar estas funciones y la vista pública.
grant usage on schema public to anon, authenticated;
grant select on public.units, public.questions_public, public.practice_config to anon, authenticated;
grant execute on function public.log_event(text, uuid)                      to anon, authenticated;
grant execute on function public.get_practice(text, smallint)               to anon, authenticated;
grant execute on function public.submit_practice(jsonb, uuid, text)         to anon, authenticated;
grant execute on function public.impact_stats(timestamptz)                  to authenticated;
