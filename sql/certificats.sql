-- Certificats médicaux d'arrêt de travail.
-- À exécuter une fois (SQL Editor Supabase) — ou `npm run db:push`.

do $$ begin
  create type nature_certificat as enum ('arret', 'prolongation', 'reprise');
exception
  when duplicate_object then null;
end $$;

create table if not exists certificats (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,                 -- CERT-001
  date          date not null,                        -- date de délivrance
  patient_id    uuid not null references patients(id) on delete restrict,
  nature        nature_certificat not null,
  nombre_jours  integer,                              -- arrêt / prolongation
  date_debut    date,
  date_fin      date,
  date_reprise  date,                                 -- reprise uniquement
  medecin_id    uuid references profiles(id),
  created_at    timestamp not null default now()
);

create index if not exists certificats_patient_id_idx on certificats (patient_id);
