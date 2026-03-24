create table if not exists public.ingest_events (
  id bigserial primary key,
  created_at timestamptz default now(),
  device_id text not null,
  actor_user_id uuid,
  clinic_id uuid,
  seq bigint not null,
  hlc text not null,
  entity_type text not null,
  op text not null,
  entity_id text,
  temp_id text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  unique (device_id, seq)
);

create index if not exists ingest_events_clinic_idx on public.ingest_events(clinic_id);
create index if not exists ingest_events_entity_idx on public.ingest_events(entity_type);
create index if not exists ingest_events_idemp_idx on public.ingest_events(idempotency_key);
