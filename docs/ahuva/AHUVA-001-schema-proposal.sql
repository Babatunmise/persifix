-- AHUVA-001 schema proposal only.
-- NOT an executable migration. Requires Argus review and explicit approval.
-- Target: existing Sanctos Supabase project. All user-owned rows are owner-scoped.
-- Apply only after review in a disposable environment, then obtain production approval.

begin;

create table public.ahuva_foods (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  scientific_name text,
  food_group text,
  region_code text,
  preparation_state text,
  created_at timestamptz not null default now(),
  unique (canonical_name, region_code, preparation_state)
);
alter table public.ahuva_foods enable row level security;
create policy "Ahuva food catalog readable by authenticated users"
  on public.ahuva_foods for select to authenticated using (true);
grant select on public.ahuva_foods to authenticated;

create table public.ahuva_food_aliases (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.ahuva_foods(id) on delete cascade,
  alias text not null,
  locale text,
  region_code text,
  language_code text,
  alias_type text not null default 'common'
    check (alias_type in ('common','regional','scientific','transliteration','brand')),
  created_at timestamptz not null default now(),
  unique (food_id, alias, locale, region_code)
);
alter table public.ahuva_food_aliases enable row level security;
create policy "Ahuva food aliases readable by authenticated users"
  on public.ahuva_food_aliases for select to authenticated using (true);
grant select on public.ahuva_food_aliases to authenticated;

create table public.ahuva_allergen_groups (
  code text primary key,
  display_name text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.ahuva_allergen_groups enable row level security;
create policy "Ahuva allergen group definitions readable by authenticated users"
  on public.ahuva_allergen_groups for select to authenticated using (true);
grant select on public.ahuva_allergen_groups to authenticated;

create table public.ahuva_nutrition_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  dataset_name text not null,
  dataset_version text not null,
  jurisdiction text,
  publication_date date,
  retrieved_at timestamptz,
  licence_name text not null,
  licence_url text,
  attribution_text text,
  permitted_storage boolean not null default false,
  permitted_redistribution boolean not null default false,
  review_status text not null default 'pending'
    check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (provider, dataset_name, dataset_version)
);
alter table public.ahuva_nutrition_sources enable row level security;
create policy "Approved Ahuva nutrition source metadata readable"
  on public.ahuva_nutrition_sources for select to authenticated
  using (review_status = 'approved');
grant select on public.ahuva_nutrition_sources to authenticated;

create table public.ahuva_food_allergen_links (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.ahuva_foods(id) on delete cascade,
  allergen_group_code text not null references public.ahuva_allergen_groups(code),
  source_id uuid not null,
  relation_type text not null
    check (relation_type in ('contains','derived_from','may_contain')),
  evidence_status text not null
    check (evidence_status in ('verified','manufacturer_declared','unverified')),
  evidence_note text,
  created_at timestamptz not null default now(),
  foreign key (source_id) references public.ahuva_nutrition_sources(id),
  unique (food_id, allergen_group_code, source_id, relation_type)
);
alter table public.ahuva_food_allergen_links enable row level security;
create policy "Ahuva allergen links readable from approved sources"
  on public.ahuva_food_allergen_links for select to authenticated
  using (exists (
    select 1 from public.ahuva_nutrition_sources s
    where s.id = source_id and s.review_status = 'approved'
  ));
grant select on public.ahuva_food_allergen_links to authenticated;

create table public.ahuva_nutrients (
  id uuid primary key default gen_random_uuid(),
  nutrient_code text not null unique,
  nutrient_name text not null,
  canonical_unit text not null,
  created_at timestamptz not null default now()
);
alter table public.ahuva_nutrients enable row level security;
create policy "Ahuva nutrient definitions readable by authenticated users"
  on public.ahuva_nutrients for select to authenticated using (true);
grant select on public.ahuva_nutrients to authenticated;

create table public.ahuva_food_nutrition (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.ahuva_foods(id),
  nutrient_id uuid not null references public.ahuva_nutrients(id),
  source_id uuid not null references public.ahuva_nutrition_sources(id),
  value numeric(16,6),
  value_unit text not null,
  basis_quantity numeric(12,4) not null check (basis_quantity > 0),
  basis_unit text not null,
  preparation_state text,
  availability text not null
    check (availability in ('known','unknown','not_reported','not_applicable')),
  method text not null,
  confidence_class text not null
    check (confidence_class in ('high','moderate','limited','unrated')),
  created_at timestamptz not null default now(),
  check ((availability = 'known' and value is not null and value >= 0)
      or (availability <> 'known' and value is null)),
  unique (food_id, nutrient_id, source_id, preparation_state)
);
alter table public.ahuva_food_nutrition enable row level security;
create policy "Ahuva nutrition values readable only from approved sources"
  on public.ahuva_food_nutrition for select to authenticated
  using (exists (
    select 1 from public.ahuva_nutrition_sources s
    where s.id = source_id and s.review_status = 'approved'
  ));
grant select on public.ahuva_food_nutrition to authenticated;

create table public.ahuva_food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.ahuva_foods(id),
  source_id uuid not null references public.ahuva_nutrition_sources(id),
  portion_label text not null,
  quantity numeric(12,4) not null check (quantity > 0),
  unit_code text not null,
  mass_g numeric(14,6),
  method text not null,
  confidence_class text not null
    check (confidence_class in ('high','moderate','limited','unrated')),
  created_at timestamptz not null default now(),
  check (mass_g is null or mass_g > 0)
);
alter table public.ahuva_food_portions enable row level security;
create policy "Ahuva portions readable only from approved sources"
  on public.ahuva_food_portions for select to authenticated
  using (exists (
    select 1 from public.ahuva_nutrition_sources s
    where s.id = source_id and s.review_status = 'approved'
  ));
grant select on public.ahuva_food_portions to authenticated;

create table public.ahuva_unit_definitions (
  unit_code text primary key,
  unit_name text not null,
  dimension text not null
    check (dimension in ('mass','volume','count','length','temperature','time')),
  system text not null
    check (system in ('metric','us_customary','imperial','nonstandard')),
  to_base_factor numeric(20,12),
  base_unit_code text,
  ambiguity_note text,
  created_at timestamptz not null default now(),
  check (to_base_factor is null or to_base_factor > 0)
);
alter table public.ahuva_unit_definitions enable row level security;
create policy "Ahuva unit definitions readable by authenticated users"
  on public.ahuva_unit_definitions for select to authenticated using (true);
grant select on public.ahuva_unit_definitions to authenticated;

create table public.ahuva_unit_aliases (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null references public.ahuva_unit_definitions(unit_code),
  alias text not null,
  locale text,
  unique (unit_code, alias, locale)
);
alter table public.ahuva_unit_aliases enable row level security;
create policy "Ahuva unit aliases readable by authenticated users"
  on public.ahuva_unit_aliases for select to authenticated using (true);
grant select on public.ahuva_unit_aliases to authenticated;

create table public.ahuva_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  from_unit text not null references public.ahuva_unit_definitions(unit_code),
  to_unit text not null references public.ahuva_unit_definitions(unit_code),
  factor numeric(24,14) not null check (factor > 0),
  conversion_basis text not null,
  source_or_standard text not null,
  unique (from_unit, to_unit),
  check (from_unit <> to_unit)
);
alter table public.ahuva_unit_conversions enable row level security;
create policy "Ahuva unit conversions readable by authenticated users"
  on public.ahuva_unit_conversions for select to authenticated using (true);
grant select on public.ahuva_unit_conversions to authenticated;

create table public.ahuva_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  locale text,
  region_code text,
  measurement_system text not null default 'metric'
    check (measurement_system in ('metric','us_customary','imperial')),
  household_size integer check (household_size between 1 and 100),
  preference_memory_consent_at timestamptz,
  preference_memory_consent_version text,
  preference_memory_withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ahuva_user_preferences enable row level security;
create policy "Users read own Ahuva preferences"
  on public.ahuva_user_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users create own Ahuva preferences"
  on public.ahuva_user_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update own Ahuva preferences"
  on public.ahuva_user_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete own Ahuva preferences"
  on public.ahuva_user_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_user_preferences to authenticated;

create table public.ahuva_user_preference_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_type text not null
    check (preference_type in ('cuisine','ingredient_liked','ingredient_avoided','meal_pattern','convenience')),
  food_id uuid references public.ahuva_foods(id),
  display_value text not null,
  source text not null default 'user_declared'
    check (source in ('user_declared','explicit_feedback')),
  created_at timestamptz not null default now(),
  unique (user_id, preference_type, display_value)
);
alter table public.ahuva_user_preference_items enable row level security;
create policy "Users manage own Ahuva preference items"
  on public.ahuva_user_preference_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_user_preference_items to authenticated;

create table public.ahuva_user_constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint_type text not null
    check (constraint_type in ('allergy','intolerance','medical_restriction','religious_restriction','dislike','voluntary_preference')),
  food_id uuid references public.ahuva_foods(id),
  allergen_group_code text references public.ahuva_allergen_groups(code),
  ingredient_label text not null,
  severity text,
  reaction_description text,
  verification_status text not null default 'user_declared'
    check (verification_status in ('user_declared','clinician_verified','unverified')),
  source text not null default 'user_declared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ahuva_user_constraints enable row level security;
create policy "Users manage own Ahuva constraints"
  on public.ahuva_user_constraints for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_user_constraints to authenticated;

create table public.ahuva_pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.ahuva_foods(id),
  display_name text not null,
  quantity numeric(14,6),
  unit_code text references public.ahuva_unit_definitions(unit_code),
  storage_location text,
  expires_on date,
  provenance text not null default 'user_entered'
    check (provenance in ('user_entered','user_confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity is null or quantity > 0)
);
alter table public.ahuva_pantry_items enable row level security;
create policy "Users manage own Ahuva pantry items"
  on public.ahuva_pantry_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_pantry_items to authenticated;

create table public.ahuva_cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'planning'
    check (status in ('planning','preparing','cooking','paused','completed','abandoned')),
  task_intent text not null
    check (task_intent in ('cook','pantry','improve','prepare','user_defined')),
  task_brief text,
  meal_name text,
  servings numeric(8,2) check (servings > 0 and servings <= 1000),
  base_servings numeric(8,2) check (base_servings > 0 and base_servings <= 1000),
  active_screen text not null default 'home'
    check (active_screen in ('home','conversation','plan','pot_math','plate_prep','cook','complete')),
  active_step_order integer check (active_step_order is null or active_step_order >= 0),
  plan_snapshot jsonb not null default '{}'::jsonb,
  plan_schema_version integer not null default 1 check (plan_schema_version > 0),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (jsonb_typeof(plan_snapshot) = 'object')
);
create index ahuva_cooking_sessions_owner_status_idx
  on public.ahuva_cooking_sessions(user_id, status, last_activity_at desc);
alter table public.ahuva_cooking_sessions enable row level security;
create policy "Users manage own Ahuva cooking sessions"
  on public.ahuva_cooking_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_cooking_sessions to authenticated;

create table public.ahuva_session_ingredients (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.ahuva_foods(id),
  display_name text not null,
  quantity numeric(14,6),
  unit_code text references public.ahuva_unit_definitions(unit_code),
  preparation_note text,
  is_prepared boolean not null default false,
  sort_order integer not null default 0,
  provenance text not null default 'user_entered'
    check (provenance in ('user_entered','saved_recipe','user_confirmed')),
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  check (quantity is null or quantity > 0)
);
create index ahuva_session_ingredients_session_idx
  on public.ahuva_session_ingredients(session_id, sort_order);
alter table public.ahuva_session_ingredients enable row level security;
create policy "Users manage own Ahuva session ingredients"
  on public.ahuva_session_ingredients for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_session_ingredients to authenticated;

create table public.ahuva_session_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_order integer not null check (step_order >= 0),
  instruction text not null,
  completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  unique (session_id, step_order)
);
create index ahuva_session_steps_session_idx
  on public.ahuva_session_steps(session_id, step_order);
alter table public.ahuva_session_steps enable row level security;
create policy "Users manage own Ahuva session steps"
  on public.ahuva_session_steps for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_session_steps to authenticated;

create table public.ahuva_session_timers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  status text not null default 'idle'
    check (status in ('idle','running','paused','elapsed','cancelled')),
  duration_ms bigint not null check (duration_ms between 1000 and 86400000),
  started_at timestamptz,
  target_end_at timestamptz,
  paused_at timestamptz,
  remaining_ms bigint,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  check (
    (status = 'running' and started_at is not null and target_end_at is not null)
    or (status <> 'running')
  ),
  check (remaining_ms is null or remaining_ms between 0 and duration_ms)
);
create index ahuva_session_timers_session_idx
  on public.ahuva_session_timers(session_id, status);
alter table public.ahuva_session_timers enable row level security;
create policy "Users manage own Ahuva session timers"
  on public.ahuva_session_timers for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_session_timers to authenticated;

create table public.ahuva_saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null
    check (source_type in ('user_recipe','adapted_recipe','completed_session')),
  source_session_id uuid,
  recipe_snapshot jsonb not null check (jsonb_typeof(recipe_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (source_session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null (session_id) (session_id) (source_session_id)
);
alter table public.ahuva_saved_meals enable row level security;
create policy "Users manage own Ahuva saved meals"
  on public.ahuva_saved_meals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_saved_meals to authenticated;

create table public.ahuva_cooking_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  saved_meal_id uuid,
  rating smallint check (rating between 1 and 5),
  repeat_intent text check (repeat_intent in ('yes','maybe','no')),
  note text,
  preference_learning_consent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null,
  foreign key (saved_meal_id, user_id)
    references public.ahuva_saved_meals(id, user_id) on delete set null (saved_meal_id),
  check (session_id is not null or saved_meal_id is not null)
);
alter table public.ahuva_cooking_feedback enable row level security;
create policy "Users manage own Ahuva cooking feedback"
  on public.ahuva_cooking_feedback for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.ahuva_cooking_feedback to authenticated;

-- IMPORTANT: the following schema is still required before clinical nutrition
-- calculations can be implemented. These structures deliberately store
-- missing values as unknown rather than zero. They must be reviewed with the
-- source/licensing evaluation before ingestion or public exposure.
create table public.ahuva_nutrition_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  method_version text not null,
  ingredient_snapshot jsonb not null check (jsonb_typeof(ingredient_snapshot) = 'array'),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'array'),
  completeness text not null
    check (completeness in ('complete','partial','insufficient','unknown')),
  confidence_class text not null
    check (confidence_class in ('high','moderate','limited','unrated')),
  calculated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null
);
alter table public.ahuva_nutrition_calculations enable row level security;
create policy "Users read own Ahuva nutrition calculations"
  on public.ahuva_nutrition_calculations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users create own Ahuva nutrition calculations"
  on public.ahuva_nutrition_calculations for insert to authenticated
  with check ((select auth.uid()) = user_id);
grant select, insert on public.ahuva_nutrition_calculations to authenticated;

create table public.ahuva_nutrition_calculation_items (
  id uuid primary key default gen_random_uuid(),
  calculation_id uuid not null references public.ahuva_nutrition_calculations(id) on delete cascade,
  nutrient_id uuid not null references public.ahuva_nutrients(id),
  value numeric(16,6),
  unit_code text not null,
  availability text not null
    check (availability in ('known','unknown','not_reported','not_applicable')),
  basis_quantity numeric(14,6),
  basis_unit text,
  methodology jsonb not null default '{}'::jsonb,
  source_food_nutrition_id uuid references public.ahuva_food_nutrition(id),
  check ((availability = 'known' and value is not null and value >= 0)
      or (availability <> 'known' and value is null))
);
alter table public.ahuva_nutrition_calculation_items enable row level security;
create policy "Users read own Ahuva nutrition calculation items"
  on public.ahuva_nutrition_calculation_items for select to authenticated
  using (exists (
    select 1 from public.ahuva_nutrition_calculations c
    where c.id = calculation_id and c.user_id = (select auth.uid())
  ));
grant select on public.ahuva_nutrition_calculation_items to authenticated;

commit;
