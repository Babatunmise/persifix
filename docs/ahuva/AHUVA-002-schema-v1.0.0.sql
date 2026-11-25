-- AHUVA-002 AUTHORITATIVE SCHEMA DEFINITION
-- Version: 1.0.0
-- Status: REVIEW ARTIFACT ONLY — NOT A MIGRATION; DO NOT EXECUTE.
-- Baseline reconciled: docs/ahuva/AHUVA-001-schema-proposal.sql
-- Canonical saved-recipe entity: public.ahuva_saved_recipes
-- Approval sequence: Argus Gate A -> separate Gate B -> disposable validation.
-- No production target, live database, or migration history may be modified by this file.
--
-- Security model:
-- * All user-owned tables have RLS and owner-scoped SELECT policies.
-- * anon receives no privileges.
-- * authenticated receives SELECT only; mutations go through trusted server operations.
-- * service_role is server-only and bypasses RLS; every server operation MUST independently
--   authenticate the caller, bind user_id to the verified auth subject, and enforce consent.
-- * Never expose service_role credentials to a browser or NEXT_PUBLIC variable.
-- * Consent enforcement is server-side; client UI is not an enforcement boundary.
--
-- This definition intentionally contains no seed data, provider credentials, or AI integration.

begin;

create table public.ahuva_schema_versions (
  version text primary key,
  description text not null,
  recorded_at timestamptz not null default now()
);
insert into public.ahuva_schema_versions(version, description)
values ('1.0.0', 'AHUVA-002 authoritative consolidated schema definition');

-- ---------------------------------------------------------------------------
-- Platform-owned food, allergen, nutrition and unit reference catalogue
-- ---------------------------------------------------------------------------

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
create index ahuva_foods_region_name_idx on public.ahuva_foods(region_code, canonical_name);

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
create index ahuva_food_aliases_lookup_idx on public.ahuva_food_aliases(lower(alias), locale, region_code);
create index ahuva_food_aliases_food_idx on public.ahuva_food_aliases(food_id);

create table public.ahuva_allergen_groups (
  code text primary key,
  display_name text not null,
  description text,
  created_at timestamptz not null default now()
);

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
create index ahuva_nutrition_sources_review_idx on public.ahuva_nutrition_sources(review_status);

create table public.ahuva_food_allergen_links (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.ahuva_foods(id) on delete cascade,
  allergen_group_code text not null references public.ahuva_allergen_groups(code),
  source_id uuid not null references public.ahuva_nutrition_sources(id),
  relation_type text not null
    check (relation_type in ('contains','derived_from','may_contain','cross_contact_risk')),
  evidence_status text not null
    check (evidence_status in ('verified','manufacturer_declared','unverified')),
  evidence_note text,
  created_at timestamptz not null default now(),
  unique (food_id, allergen_group_code, source_id, relation_type)
);
create index ahuva_food_allergen_food_idx on public.ahuva_food_allergen_links(food_id, allergen_group_code);
create index ahuva_food_allergen_source_idx on public.ahuva_food_allergen_links(source_id);

create table public.ahuva_nutrients (
  id uuid primary key default gen_random_uuid(),
  nutrient_code text not null unique,
  nutrient_name text not null,
  canonical_unit text not null,
  created_at timestamptz not null default now()
);

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
create index ahuva_food_nutrition_food_idx on public.ahuva_food_nutrition(food_id, nutrient_id);
create index ahuva_food_nutrition_source_idx on public.ahuva_food_nutrition(source_id);

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
create index ahuva_food_portions_food_idx on public.ahuva_food_portions(food_id, source_id);

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

create table public.ahuva_unit_aliases (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null references public.ahuva_unit_definitions(unit_code),
  alias text not null,
  locale text,
  unique (unit_code, alias, locale)
);
create index ahuva_unit_aliases_lookup_idx on public.ahuva_unit_aliases(lower(alias), locale);

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
alter table public.ahuva_food_portions
  add constraint ahuva_food_portions_unit_fk
  foreign key (unit_code) references public.ahuva_unit_definitions(unit_code);

-- ---------------------------------------------------------------------------
-- Consent ledger. Events are append-only; active consent is the latest event
-- for a user/scope. No client-side grant is sufficient for persistent writes.
-- ---------------------------------------------------------------------------

create table public.ahuva_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null
    check (scope in ('personalisation','health_restrictions','religious_restrictions','feedback_learning')),
  action text not null check (action in ('granted','withdrawn')),
  policy_version text not null,
  purpose text not null,
  recorded_at timestamptz not null default now(),
  unique (id, user_id)
);
create index ahuva_consent_events_latest_idx
  on public.ahuva_consent_events(user_id, scope, recorded_at desc, id desc);

-- ---------------------------------------------------------------------------
-- User-owned profile, preference and restriction data
-- ---------------------------------------------------------------------------

create table public.ahuva_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  locale text,
  region_code text,
  measurement_system text not null default 'metric'
    check (measurement_system in ('metric','us_customary','imperial')),
  household_size integer check (household_size between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.ahuva_user_preference_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_type text not null
    check (preference_type in ('cuisine','ingredient_liked','dislike','meal_pattern','convenience','voluntary_preference')),
  food_id uuid references public.ahuva_foods(id),
  display_value text not null,
  source text not null default 'user_declared'
    check (source in ('user_declared','explicit_feedback')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, preference_type, display_value)
);
create index ahuva_preference_items_owner_idx on public.ahuva_user_preference_items(user_id, preference_type);

create table public.ahuva_user_constraints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint_type text not null
    check (constraint_type in ('allergy','intolerance','medical_restriction','religious_restriction')),
  consent_scope text not null
    check (consent_scope in ('health_restrictions','religious_restrictions')),
  food_id uuid references public.ahuva_foods(id),
  allergen_group_code text references public.ahuva_allergen_groups(code),
  ingredient_label text not null,
  user_supplied_note text,
  verification_status text not null default 'user_declared'
    check (verification_status in ('user_declared','unverified','review_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (constraint_type in ('allergy','intolerance','medical_restriction') and consent_scope = 'health_restrictions')
    or (constraint_type = 'religious_restriction' and consent_scope = 'religious_restrictions')
  )
);
create index ahuva_user_constraints_owner_idx on public.ahuva_user_constraints(user_id, constraint_type);

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
create index ahuva_pantry_owner_idx on public.ahuva_pantry_items(user_id, expires_on);

-- ---------------------------------------------------------------------------
-- Cooking sessions and structured children
-- ---------------------------------------------------------------------------

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
  revision bigint not null default 1 check (revision > 0),
  last_mutation_id uuid,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (jsonb_typeof(plan_snapshot) = 'object'),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed'),
  check ((status = 'abandoned' and abandoned_at is not null) or status <> 'abandoned')
);
create index ahuva_sessions_owner_status_idx
  on public.ahuva_cooking_sessions(user_id, status, last_activity_at desc);
create index ahuva_sessions_expiry_idx
  on public.ahuva_cooking_sessions(expires_at) where deleted_at is null;

create table public.ahuva_session_context (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  context_version integer not null default 1 check (context_version > 0),
  context_payload jsonb not null check (jsonb_typeof(context_payload) = 'object'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  check (expires_at > created_at)
);
create index ahuva_session_context_expiry_idx on public.ahuva_session_context(expires_at);
create index ahuva_session_context_owner_idx on public.ahuva_session_context(user_id, session_id);

create table public.ahuva_session_constraints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint_type text not null
    check (constraint_type in ('allergy','intolerance','medical_restriction','religious_restriction','dislike','voluntary_preference')),
  food_id uuid references public.ahuva_foods(id),
  allergen_group_code text references public.ahuva_allergen_groups(code),
  ingredient_label text not null,
  user_supplied_note text,
  declaration_status text not null default 'user_declared'
    check (declaration_status in ('user_declared','clarification_required')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade
);
create index ahuva_session_constraints_session_idx
  on public.ahuva_session_constraints(session_id, constraint_type);

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
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  check (quantity is null or quantity > 0)
);
create index ahuva_session_ingredients_session_idx
  on public.ahuva_session_ingredients(session_id, sort_order);
create index ahuva_session_ingredients_owner_idx on public.ahuva_session_ingredients(user_id, session_id);

create table public.ahuva_session_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_order integer not null check (step_order >= 0),
  instruction text not null,
  completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  unique (session_id, step_order)
);
create index ahuva_session_steps_owner_idx on public.ahuva_session_steps(user_id, session_id, step_order);

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
  check (remaining_ms is null or remaining_ms between 0 and duration_ms),
  check (
    (status = 'running' and started_at is not null and target_end_at is not null and paused_at is null)
    or (status = 'paused' and paused_at is not null and remaining_ms is not null and target_end_at is null)
    or (status in ('idle','elapsed','cancelled'))
  )
);
create index ahuva_session_timers_reconcile_idx on public.ahuva_session_timers(status, target_end_at);
create index ahuva_session_timers_owner_idx on public.ahuva_session_timers(user_id, session_id);

create table public.ahuva_session_mutations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  base_revision bigint not null check (base_revision > 0),
  result_revision bigint not null check (result_revision > base_revision),
  mutation_type text not null
    check (mutation_type in ('session_patch','ingredient_upsert','ingredient_delete','step_upsert','step_delete','timer_transition','constraint_upsert','constraint_delete','plan_replace','session_complete','session_abandon')),
  accepted_at timestamptz not null default now(),
  result_digest text,
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete cascade,
  unique (user_id, session_id, idempotency_key),
  unique (session_id, result_revision)
);
create index ahuva_session_mutations_owner_idx on public.ahuva_session_mutations(user_id, session_id, accepted_at desc);
alter table public.ahuva_cooking_sessions
  add constraint ahuva_sessions_last_mutation_fk
  foreign key (last_mutation_id) references public.ahuva_session_mutations(id) on delete set null;

create table public.ahuva_session_tombstones (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  final_revision bigint not null check (final_revision > 0),
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (session_id, user_id),
  check (expires_at > deleted_at)
);
create index ahuva_session_tombstones_expiry_idx on public.ahuva_session_tombstones(expires_at);
create index ahuva_session_tombstones_owner_idx on public.ahuva_session_tombstones(user_id, deleted_at desc);

-- ---------------------------------------------------------------------------
-- Completed meal history, saved recipes and feedback are separate lifecycles
-- ---------------------------------------------------------------------------

create table public.ahuva_completed_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_session_id uuid,
  title text not null,
  completed_at timestamptz not null,
  meal_snapshot jsonb not null check (jsonb_typeof(meal_snapshot) = 'object'),
  retained_by_user boolean not null default false,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (source_session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null (source_session_id)
);
create index ahuva_completed_meals_owner_idx on public.ahuva_completed_meals(user_id, completed_at desc);
create index ahuva_completed_meals_expiry_idx on public.ahuva_completed_meals(expires_at) where retained_by_user = false;

create table public.ahuva_saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null
    check (source_type in ('user_recipe','adapted_recipe','completed_session')),
  source_session_id uuid,
  recipe_snapshot jsonb not null check (jsonb_typeof(recipe_snapshot) = 'object'),
  schema_version integer not null default 1 check (schema_version > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null (source_session_id),
  unique (id, user_id)
);
create index ahuva_saved_recipes_owner_idx on public.ahuva_saved_recipes(user_id, updated_at desc);

create table public.ahuva_cooking_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  saved_recipe_id uuid,
  rating smallint check (rating between 1 and 5),
  repeat_intent text check (repeat_intent in ('yes','maybe','no')),
  note text,
  expires_at timestamptz not null default (now() + interval '12 months'),
  created_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null (session_id),
  foreign key (saved_recipe_id, user_id)
    references public.ahuva_saved_recipes(id, user_id) on delete set null (saved_recipe_id),
  check (session_id is not null or saved_recipe_id is not null)
);
create index ahuva_feedback_owner_expiry_idx on public.ahuva_cooking_feedback(user_id, expires_at);

create table public.ahuva_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deletion_scope text not null
    check (deletion_scope in ('single_preference','single_constraint','single_session','single_completed_meal','single_saved_recipe','single_feedback','all_ahuva_data','account_deletion')),
  target_record_id uuid,
  status text not null default 'requested'
    check (status in ('requested','processing','completed','failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  outcome_code text
);
create index ahuva_deletion_requests_owner_idx on public.ahuva_deletion_requests(user_id, requested_at desc);

-- ---------------------------------------------------------------------------
-- Optional, separate nutrition calculations. Not required for cooking flow.
-- ---------------------------------------------------------------------------

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
  expires_at timestamptz not null default (now() + interval '30 days'),
  calculated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.ahuva_cooking_sessions(id, user_id) on delete set null (session_id),
  unique (id, user_id)
);
create index ahuva_nutrition_calculations_owner_expiry_idx
  on public.ahuva_nutrition_calculations(user_id, expires_at);

create table public.ahuva_nutrition_calculation_items (
  id uuid primary key default gen_random_uuid(),
  calculation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  nutrient_id uuid not null references public.ahuva_nutrients(id),
  value numeric(16,6),
  unit_code text not null,
  availability text not null
    check (availability in ('known','unknown','not_reported','not_applicable')),
  basis_quantity numeric(14,6),
  basis_unit text,
  methodology jsonb not null default '{}'::jsonb,
  source_food_nutrition_id uuid references public.ahuva_food_nutrition(id),
  foreign key (calculation_id, user_id)
    references public.ahuva_nutrition_calculations(id, user_id) on delete cascade,
  check ((availability = 'known' and value is not null and value >= 0)
      or (availability <> 'known' and value is null))
);
create index ahuva_nutrition_items_calculation_idx
  on public.ahuva_nutrition_calculation_items(calculation_id);

-- ---------------------------------------------------------------------------
-- RLS: every Ahuva table in public is protected. Authenticated users can read
-- only their own records. All mutations are routed through trusted server ops.
-- Reference catalogue is globally readable only where approved.
-- ---------------------------------------------------------------------------

alter table public.ahuva_schema_versions enable row level security;
alter table public.ahuva_foods enable row level security;
alter table public.ahuva_food_aliases enable row level security;
alter table public.ahuva_allergen_groups enable row level security;
alter table public.ahuva_nutrition_sources enable row level security;
alter table public.ahuva_food_allergen_links enable row level security;
alter table public.ahuva_nutrients enable row level security;
alter table public.ahuva_food_nutrition enable row level security;
alter table public.ahuva_food_portions enable row level security;
alter table public.ahuva_unit_definitions enable row level security;
alter table public.ahuva_unit_aliases enable row level security;
alter table public.ahuva_unit_conversions enable row level security;
alter table public.ahuva_consent_events enable row level security;
alter table public.ahuva_user_preferences enable row level security;
alter table public.ahuva_user_preference_items enable row level security;
alter table public.ahuva_user_constraints enable row level security;
alter table public.ahuva_pantry_items enable row level security;
alter table public.ahuva_cooking_sessions enable row level security;
alter table public.ahuva_session_context enable row level security;
alter table public.ahuva_session_constraints enable row level security;
alter table public.ahuva_session_ingredients enable row level security;
alter table public.ahuva_session_steps enable row level security;
alter table public.ahuva_session_timers enable row level security;
alter table public.ahuva_session_mutations enable row level security;
alter table public.ahuva_session_tombstones enable row level security;
alter table public.ahuva_completed_meals enable row level security;
alter table public.ahuva_saved_recipes enable row level security;
alter table public.ahuva_cooking_feedback enable row level security;
alter table public.ahuva_deletion_requests enable row level security;
alter table public.ahuva_nutrition_calculations enable row level security;
alter table public.ahuva_nutrition_calculation_items enable row level security;

create policy ahuva_schema_versions_read on public.ahuva_schema_versions
  for select to authenticated using (true);
create policy ahuva_foods_read on public.ahuva_foods
  for select to authenticated using (true);
create policy ahuva_food_aliases_read on public.ahuva_food_aliases
  for select to authenticated using (true);
create policy ahuva_allergen_groups_read on public.ahuva_allergen_groups
  for select to authenticated using (true);
create policy ahuva_nutrition_sources_approved_read on public.ahuva_nutrition_sources
  for select to authenticated using (review_status = 'approved');
create policy ahuva_food_allergen_approved_read on public.ahuva_food_allergen_links
  for select to authenticated using (exists (
    select 1 from public.ahuva_nutrition_sources s
    where s.id = source_id and s.review_status = 'approved'
  ));
create policy ahuva_nutrients_read on public.ahuva_nutrients
  for select to authenticated using (true);
create policy ahuva_food_nutrition_approved_read on public.ahuva_food_nutrition
  for select to authenticated using (exists (
    select 1 from public.ahuva_nutrition_sources s
    where s.id = source_id and s.review_status = 'approved'
  ));
create policy ahuva_food_portions_approved_read on public.ahuva_food_portions
  for select to authenticated using (exists (
    select 1 from public.ahuva_nutrition_sources s
    where s.id = source_id and s.review_status = 'approved'
  ));
create policy ahuva_unit_definitions_read on public.ahuva_unit_definitions
  for select to authenticated using (true);
create policy ahuva_unit_aliases_read on public.ahuva_unit_aliases
  for select to authenticated using (true);
create policy ahuva_unit_conversions_read on public.ahuva_unit_conversions
  for select to authenticated using (true);

create policy ahuva_consent_events_owner_read on public.ahuva_consent_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_user_preferences_owner_read on public.ahuva_user_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_preference_items_owner_read on public.ahuva_user_preference_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_user_constraints_owner_read on public.ahuva_user_constraints
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_pantry_items_owner_read on public.ahuva_pantry_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_sessions_owner_read on public.ahuva_cooking_sessions
  for select to authenticated using ((select auth.uid()) = user_id and deleted_at is null);
create policy ahuva_session_context_owner_read on public.ahuva_session_context
  for select to authenticated using ((select auth.uid()) = user_id and expires_at > now());
create policy ahuva_session_constraints_owner_read on public.ahuva_session_constraints
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_session_ingredients_owner_read on public.ahuva_session_ingredients
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_session_steps_owner_read on public.ahuva_session_steps
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_session_timers_owner_read on public.ahuva_session_timers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_session_mutations_owner_read on public.ahuva_session_mutations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_session_tombstones_owner_read on public.ahuva_session_tombstones
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_completed_meals_owner_read on public.ahuva_completed_meals
  for select to authenticated using ((select auth.uid()) = user_id and deleted_at is null);
create policy ahuva_saved_recipes_owner_read on public.ahuva_saved_recipes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_feedback_owner_read on public.ahuva_cooking_feedback
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_deletion_requests_owner_read on public.ahuva_deletion_requests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_nutrition_calculations_owner_read on public.ahuva_nutrition_calculations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ahuva_nutrition_items_owner_read on public.ahuva_nutrition_calculation_items
  for select to authenticated using ((select auth.uid()) = user_id);

-- No anonymous access. No authenticated client-side DML. Trusted server
-- operations use the server-only service_role after independent auth/owner/
-- consent checks. Reference data is writeable only through controlled ingest.
revoke all on table public.ahuva_schema_versions from anon, authenticated;
revoke all on table public.ahuva_foods from anon, authenticated;
revoke all on table public.ahuva_food_aliases from anon, authenticated;
revoke all on table public.ahuva_allergen_groups from anon, authenticated;
revoke all on table public.ahuva_nutrition_sources from anon, authenticated;
revoke all on table public.ahuva_food_allergen_links from anon, authenticated;
revoke all on table public.ahuva_nutrients from anon, authenticated;
revoke all on table public.ahuva_food_nutrition from anon, authenticated;
revoke all on table public.ahuva_food_portions from anon, authenticated;
revoke all on table public.ahuva_unit_definitions from anon, authenticated;
revoke all on table public.ahuva_unit_aliases from anon, authenticated;
revoke all on table public.ahuva_unit_conversions from anon, authenticated;
revoke all on table public.ahuva_consent_events from anon, authenticated;
revoke all on table public.ahuva_user_preferences from anon, authenticated;
revoke all on table public.ahuva_user_preference_items from anon, authenticated;
revoke all on table public.ahuva_user_constraints from anon, authenticated;
revoke all on table public.ahuva_pantry_items from anon, authenticated;
revoke all on table public.ahuva_cooking_sessions from anon, authenticated;
revoke all on table public.ahuva_session_context from anon, authenticated;
revoke all on table public.ahuva_session_constraints from anon, authenticated;
revoke all on table public.ahuva_session_ingredients from anon, authenticated;
revoke all on table public.ahuva_session_steps from anon, authenticated;
revoke all on table public.ahuva_session_timers from anon, authenticated;
revoke all on table public.ahuva_session_mutations from anon, authenticated;
revoke all on table public.ahuva_session_tombstones from anon, authenticated;
revoke all on table public.ahuva_completed_meals from anon, authenticated;
revoke all on table public.ahuva_saved_recipes from anon, authenticated;
revoke all on table public.ahuva_cooking_feedback from anon, authenticated;
revoke all on table public.ahuva_deletion_requests from anon, authenticated;
revoke all on table public.ahuva_nutrition_calculations from anon, authenticated;
revoke all on table public.ahuva_nutrition_calculation_items from anon, authenticated;

grant select on public.ahuva_schema_versions to authenticated;
grant select on public.ahuva_foods, public.ahuva_food_aliases, public.ahuva_allergen_groups,
  public.ahuva_nutrients, public.ahuva_unit_definitions, public.ahuva_unit_aliases,
  public.ahuva_unit_conversions to authenticated;
grant select on public.ahuva_nutrition_sources, public.ahuva_food_allergen_links,
  public.ahuva_food_nutrition, public.ahuva_food_portions to authenticated;
grant select on public.ahuva_consent_events, public.ahuva_user_preferences,
  public.ahuva_user_preference_items, public.ahuva_user_constraints,
  public.ahuva_pantry_items, public.ahuva_cooking_sessions, public.ahuva_session_context,
  public.ahuva_session_constraints, public.ahuva_session_ingredients, public.ahuva_session_steps,
  public.ahuva_session_timers, public.ahuva_session_mutations, public.ahuva_session_tombstones,
  public.ahuva_completed_meals, public.ahuva_saved_recipes, public.ahuva_cooking_feedback,
  public.ahuva_deletion_requests, public.ahuva_nutrition_calculations,
  public.ahuva_nutrition_calculation_items to authenticated;

grant all on table
  public.ahuva_schema_versions, public.ahuva_foods, public.ahuva_food_aliases,
  public.ahuva_allergen_groups, public.ahuva_nutrition_sources, public.ahuva_food_allergen_links,
  public.ahuva_nutrients, public.ahuva_food_nutrition, public.ahuva_food_portions,
  public.ahuva_unit_definitions, public.ahuva_unit_aliases, public.ahuva_unit_conversions,
  public.ahuva_consent_events, public.ahuva_user_preferences, public.ahuva_user_preference_items,
  public.ahuva_user_constraints, public.ahuva_pantry_items, public.ahuva_cooking_sessions,
  public.ahuva_session_context, public.ahuva_session_constraints, public.ahuva_session_ingredients,
  public.ahuva_session_steps, public.ahuva_session_timers, public.ahuva_session_mutations,
  public.ahuva_session_tombstones, public.ahuva_completed_meals, public.ahuva_saved_recipes,
  public.ahuva_cooking_feedback, public.ahuva_deletion_requests,
  public.ahuva_nutrition_calculations, public.ahuva_nutrition_calculation_items
to service_role;

commit;
